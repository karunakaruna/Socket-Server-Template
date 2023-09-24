const https = require("https");
const express = require("express");
const app = express();

app.use(express.static("public"));
// require("dotenv").config();

const port = process.env.PORT || 3000;
const server = https.createServer(app);
const WebSocket = require("ws");


//GPT code for websockets

app.use(express.static("public"));
app.use(express.json());  // <-- Add this line to parse incoming JSON


//GPT code for websockets

let keepAliveId;

const wss =
  process.env.NODE_ENV === "production"
    ? new WebSocket.Server({ server })
    : new WebSocket.Server({ port: 5001 });

server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
console.log(`Server started on port ${process.env.PORT} in stage ${process.env.NODE_ENV}`);

wss.on("connection", function (ws, req) {
  console.log("Connection Opened");
  console.log("Client size: ", wss.clients.size);

  if (wss.clients.size === 1) {
    console.log("first connection. starting keepalive");
    keepServerAlive();
  }

  ws.on("message", (data) => {
    if (isJSON(data)) {
      const currData = JSON.parse(data);
      broadcast(ws, currData, false);
    } else if(typeof currData === 'string') {
      if(currData === 'pong') {
        console.log('keepAlive');
        return;
      }
      broadcast(ws, currData, false);
    } else {
      console.error('malformed message', data);
    }
  });

  ws.on("close", (data) => {
    console.log("closing connection");

    if (wss.clients.size === 0) {
      console.log("last client disconnected, stopping keepAlive interval");
      clearInterval(keepAliveId);
    }
  });
});

// Implement broadcast function because of ws doesn't have it
const broadcast = (ws, message, includeSelf) => {
  if (includeSelf) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } else {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
};

const isJSON = (message) => {
  try {
    const obj = JSON.parse(message);
    return obj && typeof obj === "object";
  } catch (err) {
    return false;
  }
};

/**
 * Sends a ping message to all connected clients every 50 seconds
 */
 const keepServerAlive = () => {
  keepAliveId = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send('ping');
      }
    });
  }, 50000);
};


app.get('/', (req, res) => {
    res.send('Hello World!');
});

// app.post('/unity-endpoint', (req, res) => {
//     res.header("Access-Control-Allow-Credentials", true);
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Accept, X-Access-Token, X-Application-Name, X-Request-Sent-Time');
//     const receivedData = req.body;
//     const responseMessage = {
//         message: receivedData.message ? receivedData.message.split('').reverse().join('') : 'No message received.'
//     };
//     res.json(responseMessage);
// });

app.post('/unity-endpoint', (req, res) => {
  res.header("Access-Control-Allow-Credentials", true);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Accept, X-Access-Token, X-Application-Name, X-Request-Sent-Time');
  
  const receivedData = req.body;

  // Log the received message
  console.log("Received message:", receivedData.message);

  // Prepare the response
  const responseMessage = {
      message: 'hello'
  };

  // Send the response
  res.json(responseMessage);
});
