const http = require("http");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const serverPort = process.env.PORT || 3000;
const server = http.createServer(app);

let keepAliveId;

// In-memory object to track connected clients
const connectedClients = {};

const wss =
  process.env.NODE_ENV === "production"
    ? new WebSocket.Server({ server })
    : new WebSocket.Server({ port: 5001 });

server.listen(serverPort);
console.log(`Server started on port ${serverPort} in stage ${process.env.NODE_ENV}`);

// Function to send a user update to all clients
const sendUserUpdate = () => {
  const users = Object.values(connectedClients).map(({ id, listeningTo }) => ({
    id,
    listeningTo,
  }));

  const updateMessage = JSON.stringify({
    type: "userupdate",
    users,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(updateMessage);
    }
  });
};

// Broadcast relevant data to clients subscribed to the sender
const broadcastToSubscribers = (senderId, message) => {
  Object.values(connectedClients).forEach((client) => {
    if (client.listeningTo.includes(senderId)) {
      client.socket.send(message);
    }
  });
};

// Broadcast user coordinate updates to all clients except the sender
const broadcastCoordinatesToOthers = (senderId, message) => {
  Object.values(connectedClients).forEach((client) => {
    if (client.id !== senderId) {
      client.socket.send(message);
    }
  });
};

// Keep server alive with pings
const keepServerAlive = () => {
  keepAliveId = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send("ping");
      }
    });
  }, 50000);
};

// Handle new connections
wss.on("connection", (ws) => {
  const userId = uuidv4(); // Generate unique ID
  console.log(`Connection Opened for user: ${userId}`);

  // Add new client to connectedClients
  connectedClients[userId] = {
    id: userId,
    listeningTo: [], // Initialize with an empty subscription list
    socket: ws,
  };

  // Send the user their ID
  ws.send(
    JSON.stringify({
      type: "welcome",
      id: userId,
    })
  );

  // Print the number of connected users and user list
  const connectedUserCount = Object.keys(connectedClients).length;
  const userList = Object.keys(connectedClients).map((id) => id.slice(-8)); // Show last 8 characters of UUID
  console.log(`Number of connected users: ${connectedUserCount}`);
  console.log(`Connected user list (last 8 characters of UUID): [${userList.join(", ")}]`);

  if (connectedUserCount === 1) {
    console.log("First connection. Starting keepAlive");
    keepServerAlive();
  }

  sendUserUpdate(); // Notify all clients about the updated user list

  // Handle new messages from clients
  ws.on("message", (data) => {
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (err) {
      console.error("Invalid JSON received:", data);
      return;
    }

    const senderId = Object.keys(connectedClients).find(
      (id) => connectedClients[id].socket === ws
    );

    if (parsedData.type === "pong") {
      return;
    }

    if (parsedData.type === "updatelisteningto") {
      const { newListeningTo } = parsedData;
      if (Array.isArray(newListeningTo)) {
        connectedClients[senderId].listeningTo = newListeningTo;
        sendUserUpdate();
      }
    } else if (parsedData.type === "data") {
      const dataPayload = parsedData.data;
      broadcastToSubscribers(
        senderId,
        JSON.stringify({
          type: "data",
          from: senderId,
          data: dataPayload,
        })
      );
    } else if (parsedData.type === "usercoordinate") {
      const { coordinates } = parsedData;
      if (coordinates) {
        broadcastCoordinatesToOthers(
          senderId,
          JSON.stringify({
            type: "usercoordinateupdate",
            from: senderId,
            coordinates,
          })
        );
      }
    }
  });

  ws.on("close", () => {
    console.log(`Connection Closed for user: ${userId}`);
    delete connectedClients[userId];

    const connectedUserCount = Object.keys(connectedClients).length;
    const userList = Object.keys(connectedClients).map((id) => id.slice(-8));
    console.log(`Number of connected users: ${connectedUserCount}`);
    console.log(`Connected user list (last 8 characters of UUID): [${userList.join(", ")}]`);

    if (connectedUserCount === 0) {
      clearInterval(keepAliveId);
    }

    sendUserUpdate();
  });
});

// Express route for connected users
app.get("/", (req, res) => {
  const userList = Object.values(connectedClients).map(({ id }) => id);
  res.send(`
    <html>
      <head>
        <title>Connected Users</title>
      </head>
      <body>
        <h1>Connected Users</h1>
        <pre>${userList.join("\n")}</pre>
      </body>
    </html>
  `);
});
