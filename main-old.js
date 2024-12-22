// Saving a backup of the current main.js file before making changes.

const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const uuidv4 = require('uuid').v4;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const connectedClients = {};

// Function to broadcast messages to all clients
const broadcastToSubscribers = (senderId, message) => {
  Object.values(connectedClients).forEach((client) => {
    if (client.id !== senderId) {
      client.socket.send(message);
    }
  });
};

// Keep server alive with pings
const keepServerAlive = () => {
  keepAliveId = setInterval(() => {
    console.log('Ping');
  }, 50000);
};

// Handle new connections
wss.on('connection', (ws) => {
  const userId = uuidv4(); // Generate unique ID
  connectedClients[userId] = { socket: ws, id: userId };

  console.log(`User connected: ${userId}`);

  ws.on('message', (data) => {
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (error) {
      console.error('Invalid JSON received:', data);
      return;
    }

    // Find the sender's UUID using the WebSocket object
    const senderId = Object.keys(connectedClients).find(
      (id) => connectedClients[id].socket === ws
    );

    console.log(`Message received from user: ${senderId}`);

    if (parsedData.type === 'pong') {
      console.log('keepAlive');
      return;
    }

    if (parsedData.type === 'updatelisteningto') {
      const { newListeningTo } = parsedData;
      console.log(`Updated listeningTo for user ${senderId}:`, newListeningTo);
    }
  });
});

// Express route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
