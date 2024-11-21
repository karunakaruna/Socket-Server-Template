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
      console.log("Received data:", parsedData);
    } catch (err) {
      console.error("Invalid JSON received:", data);
      return;
    }

    // Find the sender's UUID using the WebSocket object
    const senderId = Object.keys(connectedClients).find(
      (id) => connectedClients[id].socket === ws
    );

    console.log(`Message received from user: ${senderId}`);

    if (parsedData.type === "pong") {
      console.log("keepAlive");
      return;
    }

    if (parsedData.type === "updatelisteningto") {
      // Update the user's listeningTo list
      const { newListeningTo } = parsedData;
      if (Array.isArray(newListeningTo)) {
        connectedClients[senderId].listeningTo = newListeningTo;
        console.log(`Updated listeningTo for user ${senderId}:`, newListeningTo);
        sendUserUpdate(); // Notify all clients about the updated user list
      }
    } else if (parsedData.type === "data") {
      // Relay data only to subscribers
      const dataPayload = parsedData.data;
      console.log(`Data received from ${senderId}:`, dataPayload);

      // Broadcast to subscribers
      broadcastToSubscribers(
        senderId,
        JSON.stringify({
          type: "data",
          from: senderId,
          data: dataPayload,
        })
      );
    } else if (parsedData.type === "usercoordinate") {
      // Extract coordinates
      const { coordinates } = parsedData;
      if (coordinates) {
        console.log(`Received coordinates from ${senderId}:`, coordinates);

        // Send coordinates to all clients except the sender
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
    delete connectedClients[userId]; // Remove the user from connectedClients

    const connectedUserCount = Object.keys(connectedClients).length;
    const userList = Object.keys(connectedClients).map((id) => id.slice(-8)); // Show last 8 characters of UUID
    console.log(`Number of connected users: ${connectedUserCount}`);
    console.log(`Connected user list (last 8 characters of UUID): [${userList.join(", ")}]`);

    if (connectedUserCount === 0) {
      console.log("Last client disconnected, stopping keepAlive interval");
      clearInterval(keepAliveId);
    }

    sendUserUpdate(); // Notify all clients about the updated user list
  });
});

// Express route
app.get("/", (req, res) => {
  res.send("Hello World!");
});
