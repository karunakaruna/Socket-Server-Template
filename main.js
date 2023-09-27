

const http = require("http");
const express = require("express");
const cors = require('cors');
const app = express();

app.use(express.static(__dirname + "/public"));
// require("dotenv").config();


const port = process.env.PORT || 3000;
const server = http.createServer(app);
const WebSocket = require("ws");
const bodyParser = require('body-parser');
//cors
const corsOptions = {
  origin: 'https://monaverse.com',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 204, // Some legacy browsers (IE11) choke on a 204 response.
};

//GPT code for websockets

//app.use(express.static("public"));


app.use(express.json());  // <-- Add this line to parse incoming JSON
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public", { "extensions": ["html", "css", "js"] }));
//cors
app.use(cors(corsOptions));
app.options('/unity-endpoint', cors(corsOptions));



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

  // Broadcast the new user count
  broadcast(null, JSON.stringify({ type: 'userCount', value: wss.clients.size }), true);

  if (wss.clients.size === 1) {
      console.log("first connection. starting keepalive");
      keepServerAlive();
  }

  ws.on("message", (data) => {
      if (isJSON(data)) {
          const currData = JSON.parse(data);
          
          if(currData.type === 'ping') {
              // Handle the server heartbeat ping
              console.log('Received a server heartbeat ping');
          } else if(currData.type === 'loc') {
              // Log the received location
              console.log('Received a ping location:', currData.position);
          }
          
          // Broadcast the data to other clients
           broadcast(ws, currData, false);
          
      } else if(typeof currData === 'string') {
        if(currData === 'pong') {
          console.log('keepAlive');
          return;
        }
        //broadcast(ws, currData, false);
      } else if (currData.type === 'entrance') {
        console.log(`Received an entrance ping for object: ${currData.objectName}`);
        
        // Broadcast the entrance ping to other clients
        broadcast(ws, currData, false);
    }
     else {
        console.error('malformed message', data);
      }
  });

  ws.on("close", (data) => {
      console.log("closing connection");

      // Broadcast the updated user count
      broadcast(null, JSON.stringify({ type: 'userCount', value: wss.clients.size }), true);

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
        broadcast(null, JSON.stringify({ type: 'ping', value: 'ping' }), true);
      }
    });
  }, 50000);
};


app.get('/', (req, res) => {
    //res.send('Hello World! (c8=');
    res.sendFile(__dirname + '/index.html');
});

app.post('/unity-endpoint', (req, res) => {
  console.log("Raw body:", req.body);
  // CORS headers
  res.header("Access-Control-Allow-Credentials", true);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Accept, X-Access-Token, X-Application-Name, X-Request-Sent-Time');
  
  // Accessing the message sent in the form data
  const receivedMessage = req.body.data;
  if(receivedMessage === 'red') {
    // Broadcast the color change to all connected WebSocket clients
    broadcast(null, JSON.stringify({ type: 'color', value: '#ff0000' }), true);
  }

  // Log the received message
  console.log("Received message:", receivedMessage);

  // Prepare the response
  const responseMessage = {
      message: 'hello'
  };
  // Send the response
  //res.send('oops');
  res.json(responseMessage);
});



app.post('/beacon-endpoint', (req, res) => {
  // CORS headers
  res.header("Access-Control-Allow-Credentials", true);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Accept, X-Access-Token, X-Application-Name, X-Request-Sent-Time');

  const beaconURL = req.body.beacon;
  if (beaconURL) {
    // Broadcast the beacon URL to all connected WebSocket clients
    broadcast(null, JSON.stringify({ type: 'beacon', url: beaconURL }), true);
  }

  // Log the received beacon URL
  console.log("Received beacon URL:", beaconURL);

  // Prepare the response
  const responseMessage = {
      message: 'Beacon URL received!'
  };

  // Send the response
  res.json(responseMessage);
});
