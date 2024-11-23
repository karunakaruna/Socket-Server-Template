const http = require("http");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const serverPort = process.env.PORT || 3000;
const server = http.createServer(app);

// In-memory storage for user metadata
const users = {};
let numUsers = 0;

// Attach WebSocket server
const wss = new WebSocket.Server({ server });

server.listen(serverPort, () => {
  console.log(`Server started on port ${serverPort}`);
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
    listeningTo: user.listeningTo || [],
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
    if (users[userId][key] !== data[key]) {
      users[userId][key] = data[key]; // Update only if value changes
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

// WebSocket connection handler
wss.on("connection", (ws) => {
  const userId = uuidv4();
  console.log(`User connected: ${userId}`);
  numUsers++;

  // Initialize user metadata
  users[userId] = {
    id: userId,
    username: `User_${userId.slice(0, 5)}`, // Default username
    listeningTo: [],
    description: "",
    tx: 0,
    ty: 0,
    tz: 0,
    afk: false,
    textstream: "",
  };

  // Attach userId to WebSocket
  ws.userId = userId;

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "welcome",
      id: userId,
    })
  );

  // Broadcast updated user list
  broadcastUserUpdate();

  // Handle incoming messages
  ws.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (err) {
      console.error("Invalid JSON:", data);
      return;
    }

    const { type } = message;

    if (type === "pong") {
      return; // Keep-alive response
    }

    if (type === "updatemetadata") {
      // Update user metadata
      updateUserData(ws.userId, message.data);
      broadcastUserUpdate();
    } else if (type === "updatelisteningto") {
      // Update user's listeningTo links
      if (Array.isArray(message.data)) {
        users[ws.userId].listeningTo = message.data;
        broadcastUserUpdate();
      }
    } else if (type === "usercoordinate") {
      // Update user coordinates and broadcast
      const { coordinates } = message;
      if (coordinates) {
        updateUserData(ws.userId, coordinates);
        broadcastCoordinates(ws.userId, coordinates);
      }
    } else if (type === "data") {
      // Broadcast custom data to listeners
      const { data: payload } = message;
      const recipients = users[ws.userId].listeningTo;
      recipients.forEach((recipientId) => {
        const recipient = Object.values(wss.clients).find(
          (client) => client.userId === recipientId
        );
        if (recipient && recipient.readyState === WebSocket.OPEN) {
          recipient.send(
            JSON.stringify({
              type: "data",
              from: ws.userId,
              data: payload,
            })
          );
        }
      });
    }
  });

  // Handle disconnections
  ws.on("close", () => {
    console.log(`User disconnected: ${ws.userId}`);
    delete users[ws.userId];
    numUsers--;
    broadcastUserUpdate();
  });
});

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
