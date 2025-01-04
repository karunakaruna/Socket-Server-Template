const http = require("http");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const WebSocket = require("ws");
const fs = require("fs");
const crypto = require('crypto');

const app = express();
app.use(express.static("public"));

// Get port from environment variable
const serverPort = process.env.PORT || 3001;

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Root route - serve ordinal.html
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

// Create HTTP server
const server = http.createServer(app);

// Rest of your server code...
