const http = require("http");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const WebSocket = require("ws");
const fs = require("fs");

const app = express();
app.use(express.static("public"));

// Get port from environment variable
const serverPort = process.env.PORT || 3000;

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
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

// Function to get CSV file info
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

// Start the server
server.listen(serverPort, '0.0.0.0', () => {
  console.log(`Server started on port ${serverPort}`);
  console.log(`WebSocket server is running at ws://0.0.0.0:${serverPort}`);
});

// Function to broadcast user updates
const broadcastUserUpdate = () => {
  const userList = Object.values(users).map((user) => ({
    id: user.id,
    username: user.username || "",
    description: user.description || "",
    tx: user.tx || 0,
    ty: user.ty || 0,
    tz: user.tz || 0,
    afk: user.afk || false,
    textstream: user.textstream || "",
    listeningTo: user.listeningTo ? [...user.listeningTo] : [], // Shallow copy for safety
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
    
    Object.entries(users).forEach(([userId, user]) => {
      console.log(`User ${user.username} (${userId}) is listening to:`, user.listeningTo);
    });

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

// WebSocket connection handler
wss.on("connection", (ws) => {
  const userId = uuidv4();
  console.log(`User connected: ${userId}`);
  numUsers++;

  users[userId] = {
    id: userId,
    username: `User_${userId.slice(0, 5)}`,
    listeningTo: [],
    description: "",
    tx: 0,
    ty: 0,
    tz: 0,
    afk: false,
    textstream: "",
  };

  ws.userId = userId;
  clientMap.set(userId, ws);

  ws.send(
    JSON.stringify({
      type: "welcome",
      id: userId,
    })
  );

  // Send initial CSV info
  const csvInfo = getCsvInfo();
  if (csvInfo) {
    ws.send(JSON.stringify({
      type: 'csvinfo',
      info: csvInfo
    }));
  }

  broadcastUserUpdate();

  ws.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (err) {
      console.error("Invalid JSON received:", data);
      return;
    }

    const { type } = message;

    // Filter out coordinate-related, position, ping, and pong messages from logging and broadcasting
    if (!type.toLowerCase().includes('coordinate') && 
        !type.toLowerCase().includes('position') && 
        type !== 'ping' && 
        type !== 'pong') {
      console.log(`Received ${type} message from ${ws.userId || 'unknown user'}`);
      // Only broadcast non-coordinate/position messages to server log
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "serverlog",
            message: `Received ${type} message from ${ws.userId || 'unknown user'}`
          }));
        }
      });
    }

    switch (type) {
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

      case "requestCsvInfo":
        const csvInfo = getCsvInfo();
        if (csvInfo) {
          ws.send(JSON.stringify({
            type: 'csvinfo',
            info: csvInfo
          }));
        }
        break;

      default:
        console.error(`Unhandled message type "${type}" from user ${ws.userId}:`, message);
    }
  });

  ws.on("close", () => {
    console.log(`User disconnected: ${ws.userId}`);
    if (users[ws.userId]) {
      delete users[ws.userId];
    }
    clientMap.delete(ws.userId);
    numUsers = Math.max(0, numUsers - 1);
    broadcastUserUpdate();
  });
});

// Start the ping heartbeat
startHeartbeat();

// Express route for debugging
app.get("/", (req, res) => {
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
