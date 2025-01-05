const http = require("http");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const WebSocket = require("ws");
const fs = require("fs");
const crypto = require('crypto');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Proxy /api requests to Python server
app.use('/api', createProxyMiddleware({ 
    target: 'http://localhost:5000',
    changeOrigin: true
}));

// Serve static files from public directory
app.use(express.static("public"));

// Serve coretex static files with proper MIME types
app.use('/coretex', (req, res, next) => {
    const filePath = path.join(__dirname, 'coretex/static', req.path);
    const ext = path.extname(filePath);
    
    // Set proper MIME types
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif'
    };
    
    if (mimeTypes[ext]) {
        res.type(mimeTypes[ext]);
    }
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        next();
    }
});

// Add route for keyforge
app.get('/keyforge', (req, res) => {
    res.sendFile(path.join(__dirname, 'coretex/static/keyforge.html'), {
        headers: {
            'Content-Type': 'text/html'
        }
    });
});

// Get port from environment variable
const serverPort = process.env.PORT || 3001;

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Add route for merged interface
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/ordinal.html');
});

// Add route for dashboard
app.get('/dashboard.html', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

// Add route for dashmerge
app.get('/dashmerge.html', (req, res) => {
  res.sendFile(__dirname + '/public/dashmerge.html');
});

// Add routes for encryption experiments
app.get('/experiments', (req, res) => {
    res.sendFile(path.join(__dirname, 'coretex/static/experiments/index.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Configure WebSocket server
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false, // Disable per-message deflate to reduce latency
  maxPayload: 65536 // Limit payload size to 64KB
});

// Track connection attempts and errors
wss.on('error', (error) => {
  console.error('WebSocket Server Error:', error);
});

// Log all WebSocket events for debugging
wss.on('listening', () => {
  console.log('WebSocket server is listening');
});

wss.on('headers', (headers, request) => {
  console.log('WebSocket headers:', headers);
});

// In-memory storage for user metadata and WebSocket clients
const users = {};
let numUsers = 0;

// Efficient client lookup using a Map
const clientMap = new Map();
const userSecrets = new Map(); // Store user secrets and their associated UUIDs
const uuidBySecret = new Map(); // Reverse lookup: secret -> UUID
const secretTimestamps = new Map(); // Track when secrets were last used
const userLastActivity = new Map(); // Track last activity time for each user

// Secret expiration time (24 hours in milliseconds)
const SECRET_EXPIRATION_TIME = 24 * 60 * 60 * 1000;
// User data expiration (7 days in milliseconds)
const USER_DATA_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000;

// File path for persistent storage
const USER_DATA_FILE = 'user_data.json';

// Load persisted user data on startup
try {
    if (fs.existsSync(USER_DATA_FILE)) {
        const savedData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf8'));
        // Only load non-expired users
        const now = Date.now();
        Object.entries(savedData.users).forEach(([uuid, userData]) => {
            if (userData.lastActivity && (now - userData.lastActivity) < USER_DATA_EXPIRATION_TIME) {
                users[uuid] = userData;
                userLastActivity.set(uuid, userData.lastActivity);
            }
        });
        // Only load non-expired secrets
        savedData.secrets.forEach(([secret, uuid]) => {
            const timestamp = savedData.timestamps?.[secret] || now;
            if ((now - timestamp) < SECRET_EXPIRATION_TIME) {
                uuidBySecret.set(secret, uuid);
                userSecrets.set(uuid, secret);
                secretTimestamps.set(secret, timestamp);
            }
        });
        console.log('Loaded persisted user data');
    }
} catch (err) {
    console.error('Error loading persisted data:', err);
}

// Function to save user data
function persistUserData() {
    try {
        const dataToSave = {
            users: users,
            secrets: Array.from(uuidBySecret.entries()),
            timestamps: Object.fromEntries(secretTimestamps)
        };
        // Add lastActivity to each user before saving
        Object.keys(dataToSave.users).forEach(uuid => {
            dataToSave.users[uuid].lastActivity = userLastActivity.get(uuid) || Date.now();
        });
        fs.writeFileSync(USER_DATA_FILE, JSON.stringify(dataToSave, null, 2));
        console.log('User data persisted successfully');
    } catch (err) {
        console.error('Error persisting user data:', err);
    }
}

// Function to clean up expired users and secrets
function cleanupExpiredData() {
    const now = Date.now();
    
    // Clean up expired secrets
    for (const [secret, timestamp] of secretTimestamps.entries()) {
        if ((now - timestamp) >= SECRET_EXPIRATION_TIME) {
            const uuid = uuidBySecret.get(secret);
            uuidBySecret.delete(secret);
            userSecrets.delete(uuid);
            secretTimestamps.delete(secret);
            console.log(`Cleaned up expired secret for user ${uuid}`);
        }
    }
    
    // Clean up expired users
    for (const [uuid, lastActivity] of userLastActivity.entries()) {
        if ((now - lastActivity) >= USER_DATA_EXPIRATION_TIME) {
            delete users[uuid];
            userLastActivity.delete(uuid);
            // Also clean up any associated secret
            const secret = userSecrets.get(uuid);
            if (secret) {
                uuidBySecret.delete(secret);
                userSecrets.delete(uuid);
                secretTimestamps.delete(secret);
            }
            console.log(`Cleaned up expired user ${uuid}`);
        }
    }
    
    // Persist changes after cleanup
    persistUserData();
}

// Save data periodically (every 5 minutes)
setInterval(persistUserData, 5 * 60 * 1000);

// Run cleanup every hour
setInterval(cleanupExpiredData, 60 * 60 * 1000);

// Function to generate a shorter, readable secret
function generateUserSecret() {
  // Generate an 8-character secret using only alphanumeric characters
  return crypto.randomBytes(4).toString('hex');
}

// Function to broadcast user updates to all connected clients
function broadcastUserUpdate() {
  const userList = Object.values(users)
    .filter(user => clientMap.has(user.id)) // Only include users with active connections
    .map((user) => ({
      id: user.id,
      username: user.username || "Unnamed",
      description: user.description || "",
      tx: user.tx || 0,
      ty: user.ty || 0,
      tz: user.tz || 0,
      afk: user.afk || false,
      textstream: user.textstream || "",
    }));

  const message = JSON.stringify({
    type: "userupdate",
    numUsers,
    users: userList,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Efficiently update user data
const updateUserData = (userId, data) => {
  if (!users[userId]) return;

  Object.keys(data).forEach((key) => {
    if (key in users[userId] && users[userId][key] !== data[key]) {
      users[userId][key] = data[key];
    }
  });
};

// Broadcast coordinate updates
const broadcastCoordinates = (senderId, coordinates) => {
  const message = JSON.stringify({
    type: "usercoordinateupdate",
    from: senderId,
    coordinates,
  });

  wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      users[client.userId] &&
      client.userId !== senderId
    ) {
      client.send(message);
    }
  });
};

// Ping heartbeat function
const startHeartbeat = () => {
  setInterval(() => {
    const currentTime = new Date().toISOString();
    console.log(`[PING HEARTBEAT] Time: ${currentTime}, Connected Users: ${numUsers}`);
    
    // Object.entries(users).forEach(([userId, user]) => {
    //   console.log(`User ${user.username} (${userId}) is listening to:`, user.listeningTo);
    // });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "ping", 
            time: currentTime,
            numUsers,
          })
        );
      }
    });
  }, 5000);
};

// Function to broadcast server info periodically
function broadcastServerInfo() {
    setInterval(() => {
        const serverInfo = {
            type: 'serverinfo',
            numUsers,
            load: process.cpuUsage(), // Example: CPU usage
            memoryUsage: process.memoryUsage(), // Example: Memory usage
        };
        
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(serverInfo));
            }
        });
    }, 10000); // Broadcast every 10 seconds
}

// Start broadcasting server info
broadcastServerInfo();

// Audio streaming setup
const CHUNK_SIZE = 128 * 1024; // 128KB chunks for smoother streaming
let audioStream = null;
let isStreaming = false;

function startAudioStream() {
    if (isStreaming) return;
    isStreaming = true;
    
    const audioPath = path.join(__dirname, 'public/sound/stream.mp3');
    audioStream = fs.createReadStream(audioPath, { highWaterMark: CHUNK_SIZE });
    
    audioStream.on('data', (chunk) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'audio_chunk',
                    data: chunk.toString('base64')
                }));
            }
        });
    });
    
    audioStream.on('end', () => {
        isStreaming = false;
        startAudioStream(); // Loop the audio
    });
    
    audioStream.on('error', (error) => {
        console.error('Audio stream error:', error);
        isStreaming = false;
    });
}

// Track active locks
const activeLocks = new Map();

// Track experiment states
const experimentStates = new Map();

// WebSocket message handler for experiments
function handleExperimentMessage(ws, message) {
    switch (message.type) {
        case 'quantum_state':
            // Handle quantum state updates
            const quantumState = {
                id: message.id,
                state: message.state,
                entanglement: Math.random(),  // Simulated entanglement value
                timestamp: Date.now()
            };
            experimentStates.set(message.id, quantumState);
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'quantum_update',
                        data: quantumState
                    }));
                }
            });
            break;

        case 'crystal_resonance':
            // Handle crystal resonance updates
            const resonanceState = {
                id: message.id,
                frequency: message.frequency,
                amplitude: message.amplitude,
                timestamp: Date.now()
            };
            experimentStates.set(message.id, resonanceState);
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'crystal_update',
                        data: resonanceState
                    }));
                }
            });
            break;

        case 'nebula_shift':
            // Handle nebula pattern shifts
            const nebulaState = {
                id: message.id,
                pattern: message.pattern,
                intensity: message.intensity,
                timestamp: Date.now()
            };
            experimentStates.set(message.id, nebulaState);
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'nebula_update',
                        data: nebulaState
                    }));
                }
            });
            break;

        case 'bio_mutation':
            // Handle bio-pattern mutations
            const bioState = {
                id: message.id,
                sequence: message.sequence,
                mutationRate: message.mutationRate,
                timestamp: Date.now()
            };
            experimentStates.set(message.id, bioState);
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'bio_update',
                        data: bioState
                    }));
                }
            });
            break;

        case 'dream_sync':
            // Handle dream synchronization
            const dreamState = {
                id: message.id,
                pattern: message.pattern,
                lucidity: message.lucidity,
                timestamp: Date.now()
            };
            experimentStates.set(message.id, dreamState);
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'dream_update',
                        data: dreamState
                    }));
                }
            });
            break;
    }
}

// WebSocket connection handler
wss.on("connection", (ws) => {
  console.log("New WebSocket connection established");
  numUsers++;
  
  // We don't initialize the user immediately anymore
  // Instead, we wait for either:
  // 1. A reconnect message with a valid secret (restores existing user)
  // 2. A reconnect message with invalid/no secret (creates new user)
  
  // Start streaming if this is the first client
  if (!isStreaming) {
    startAudioStream();
  }
  
  // Handle messages
  ws.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (err) {
      console.error("Error parsing message:", err);
      return;
    }

    // console.log("Received message type:", message.type);

    switch (message.type) {
      case "reconnect":
        console.log("=== Reconnection Attempt ===");
        
        const secret = message.secret;
        const username = message.username;
        
        if (secret && uuidBySecret.has(secret)) {
          const existingUserId = uuidBySecret.get(secret);
          
          // Validate secret matches stored secret for this user
          if (userSecrets.get(existingUserId) !== secret) {
            console.log(`Security warning: Secret mismatch for user ${existingUserId}`);
            ws.close();
            return;
          }
          
          console.log(`Valid reconnection: Secret ${secret} matches user ${existingUserId}`);
          
          // Update activity timestamp
          userLastActivity.set(existingUserId, Date.now());
          secretTimestamps.set(secret, Date.now());
          
          // Update the WebSocket connection
          ws.userId = existingUserId;
          clientMap.set(existingUserId, ws);
          
          // Send welcome message
          ws.send(JSON.stringify({
            type: "welcome",
            id: existingUserId,
            secret: secret
          }));
          
          // Restore user data
          if (users[existingUserId]) {
            if (username) {
              users[existingUserId].username = username;
            }
          } else {
            users[existingUserId] = {
              id: existingUserId,
              username: username || `User_${existingUserId.slice(0, 5)}`,
              listeningTo: [],
              description: "",
              tx: 0,
              ty: 0,
              tz: 0,
              afk: false,
              textstream: "",
              lastActivity: Date.now()
            };
          }
          
          broadcastUserUpdate();
        } else {
          // If no secret or invalid, create new user
          const newUserId = uuidv4();
          const newSecret = generateUserSecret();
          console.log(`Invalid reconnection attempt, creating new user: ${newUserId}`);
          console.log(`Generated new secret for ${newUserId}: ${newSecret}`);
          
          ws.userId = newUserId;
          users[newUserId] = {
            id: newUserId,
            username: username || `User_${newUserId.slice(0, 5)}`,
            listeningTo: [],
            description: "",
            tx: 0,
            ty: 0,
            tz: 0,
            afk: false,
            textstream: "",
            lastActivity: Date.now()
          };

          // Store the WebSocket connection and secret info
          clientMap.set(newUserId, ws);
          userSecrets.set(newUserId, newSecret);
          uuidBySecret.set(newSecret, newUserId);
          secretTimestamps.set(newSecret, Date.now());
          userLastActivity.set(newUserId, Date.now());
          
          ws.send(JSON.stringify({
            type: "welcome",
            id: newUserId,
            secret: newSecret
          }));
        }

        // Send initial CSV info in both cases
        const initialCsvInfo = getCsvInfo();
        if (initialCsvInfo) {
          ws.send(JSON.stringify({
            type: 'csvinfo',
            info: initialCsvInfo
          }));
        }

        // Broadcast user update in both cases
        broadcastUserUpdate();
        break;

      case "requestCsvInfo":
        // Silently handle CSV info requests
        const csvInfo = getCsvInfo();
        if (csvInfo) {
          ws.send(JSON.stringify({
            type: 'csvinfo',
            info: csvInfo
          }));
        }
        break;

      case "metadata":
      case "status":
      case "rename":
      case "connect":
      case "disconnect":
        // Only broadcast these types of messages
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'serverlog',
              message: message.message,
              logType: message.type
            }));
          }
        });
        break;

      case "pong":
        console.log(`Pong received from user: ${ws.userId}`);
        break;

      case "updatemetadata":
        if (message.data) {
          updateUserData(ws.userId, message.data);
          broadcastUserUpdate();
        } else {
          console.error(`Invalid metadata update from user ${ws.userId}:`, message.data);
        }
        break;

      case "updatelisteningto":
        console.log(`User ${ws.userId} updating listening list to:`, message.newListeningTo);

        if (Array.isArray(message.newListeningTo)) {
          if (users[ws.userId]) {
            const filteredListeningTo = message.newListeningTo.filter(
              (listeningId) => listeningId !== ws.userId
            );

            if (
              JSON.stringify(users[ws.userId].listeningTo) ===
              JSON.stringify(filteredListeningTo)
            ) {
              console.log(`No change in listeningTo for user ${ws.userId}.`);
              return;
            }

            users[ws.userId].listeningTo = filteredListeningTo;

            console.log(
              `Updated listeningTo for user ${ws.userId} (filtered):`,
              users[ws.userId].listeningTo
            );

            broadcastUserUpdate();
          } else {
            console.error(`User ${ws.userId} not found for listeningTo update.`);
          }
        } else {
          console.error(
            `Invalid listeningTo data from user ${ws.userId}:`,
            message.newListeningTo
          );
        }
        break;

      case "usercoordinate":
        // Only process coordinates if we have a valid userId and user data
        if (!ws.userId) {
          console.log("Received coordinates before user initialization - waiting for reconnect");
          return;
        }
        const { coordinates } = message;
        if (coordinates && users[ws.userId]) {
          updateUserData(ws.userId, coordinates);
          broadcastCoordinates(ws.userId, coordinates);
        } else {
          console.error(
            `Invalid coordinates or user not found for user ${ws.userId}:`,
            coordinates
          );
        }
        break;

      case "clearlist":
        console.log(`Clearing listening list for user: ${ws.userId}`);
        if (users[ws.userId]) {
          users[ws.userId].listeningTo = [];
          broadcastUserUpdate();
        } else {
          console.error(`User ${ws.userId} not found for clearlist.`);
        }
        break;

        case "data":
          const { data: payload } = message;
        
          if (payload) {
            // Iterate through all users to find who is listening to the sender (ws.userId)
            Object.entries(users).forEach(([recipientId, recipientData]) => {
              if (
                Array.isArray(recipientData.listeningTo) &&
                recipientData.listeningTo.includes(ws.userId)
              ) {
                const recipientClient = clientMap.get(recipientId);
        
                if (recipientClient && recipientClient.readyState === WebSocket.OPEN) {
                  recipientClient.send(
                    JSON.stringify({
                      type: "data",
                      from: ws.userId,
                      data: payload,
                    })
                  );
                  // console.log(`Data sent from user ${ws.userId} to ${recipientId}:`, payload);
                } else {
                  console.warn(
                    `Recipient ${recipientId} not found or not connected for data message from user ${ws.userId}.`
                  );
                }
              }
            });
          } else {
            console.error(
              `Invalid data payload for user ${ws.userId}:`,
              payload
            );
          }
          break;

      case "connect":
        if (message.service === "coretex") {
          console.log("Coretex service connected");
          ws.isCoretex = true;
        }
        break;

      case "lock_update":
        console.log("Lock update received:", message.lock_id);
        // Store lock state
        activeLocks.set(message.lock_id, {
          encrypted: message.encrypted,
          timestamp: Date.now()
        });
        // Broadcast to all clients except Coretex
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN && !client.isCoretex) {
            client.send(JSON.stringify({
              type: 'lock_state',
              lock_id: message.lock_id,
              encrypted: message.encrypted
            }));
          }
        });
        break;

      case "lock_state":
        // Forward lock state to all clients
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN && !client.isCoretex) {
            client.send(JSON.stringify(message));
          }
        });
        break;

      case "quantum_state":
      case "crystal_resonance":
      case "nebula_shift":
      case "bio_mutation":
      case "dream_sync":
        handleExperimentMessage(ws, message);
        break;

      default:
        console.error(`Unhandled message type "${message.type}" from user ${ws.userId}:`, message);
    }
  });

  // Handle disconnection
  ws.on("close", () => {
    console.log(`User disconnected: ${ws.userId}`);
    
    // Remove from client map but keep user data
    if (ws.userId) {
      clientMap.delete(ws.userId);
      
      // Update last activity time
      userLastActivity.set(ws.userId, Date.now());
      
      // Only update the broadcast if we had a valid user
      broadcastUserUpdate();
      
      // Persist data on disconnect
      persistUserData();
    }
    
    numUsers--;
    console.log(`Active connections: ${numUsers}`);
  });
});

// Start the ping heartbeat
startHeartbeat();

// Express route for debugging
app.get("/debug", (req, res) => {
  res.send(`
    <html>
      <head><title>Server Status</title></head>
      <body>
        <h1>Server Status</h1>
        <p>Number of connected users: ${numUsers}</p>
        <pre>${JSON.stringify(users, null, 2)}</pre>
      </body>
    </html>
  `);
});

// Start the server
server.listen(serverPort, '0.0.0.0', () => {
  console.log(`Server started on port ${serverPort}`);
  console.log(`WebSocket server is running at ws://0.0.0.0:${serverPort}`);
});

// Function to get CSV file info // Not used currently
function getCsvInfo() {
    // Default CSV paths to check
    const csvPaths = ['data.csv', 'output.csv', 'coordinates.csv'].filter(path => {
        try {
            return fs.existsSync(path);
        } catch (error) {
            return false;
        }
    });

    if (csvPaths.length === 0) {
        return {
            modifiedTime: null,
            size: 0,
            rows: 0,
            exists: false
        };
    }

    // Get the most recently modified CSV
    const mostRecentCsv = csvPaths.reduce((latest, current) => {
        const currentStats = fs.statSync(current);
        if (!latest || currentStats.mtime > fs.statSync(latest).mtime) {
            return current;
        }
        return latest;
    }, null);

    try {
        const stats = fs.statSync(mostRecentCsv);
        
        // Only read file content if it's not too large (e.g., < 10MB)
        let rowCount = 0;
        if (stats.size < 10 * 1024 * 1024) {
            const fileContent = fs.readFileSync(mostRecentCsv, 'utf8');
            rowCount = fileContent.split('\n').length - 1; // -1 for header
        }
        
        return {
            modifiedTime: stats.mtime,
            size: stats.size,
            rows: rowCount,
            exists: true,
            path: mostRecentCsv
        };
    } catch (error) {
        console.error('Error reading CSV file:', error);
        return {
            modifiedTime: null,
            size: 0,
            rows: 0,
            exists: false
        };
    }
}

// Track CSV state
let lastCsvState = getCsvInfo();

// Check for CSV updates periodically
setInterval(() => {
    const currentState = getCsvInfo();
    if (currentState.exists && 
        (!lastCsvState.exists || 
         currentState.modifiedTime?.getTime() !== lastCsvState.modifiedTime?.getTime() ||
         currentState.size !== lastCsvState.size)) {
        
        lastCsvState = currentState;
        broadcastCsvUpdate();
    }
}, 5000); // Check every 5 seconds

// Broadcast CSV update to all clients
function broadcastCsvUpdate() {
    const csvInfo = getCsvInfo();
    const message = JSON.stringify({
        type: 'csvinfo',
        info: csvInfo
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}
