
const http = require("http");
const express = require("express");
const cors = require('cors');
const app = express();
// const { handleConnection } = require('./util/websocketHandlers.js');
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { addDummyProfileRow} = require('./util/db-actions');

//CORS
const allowedOrigins = ['https://monaverse.com', 'https://hyperfy.io', 'http://localhost','http://localhost:4000','http://localhost:3000'];
const corsOptions = {
  origin: function (origin, callback) {
    console.log("Incoming origin:", origin);  // Log the incoming origin

    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 204,
  credentials: true, // This allows cookies and headers to be sent/received
  allowedHeaders: ['Content-Type', 'Authorization'] // Additional headers can be added here
};


//app use
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public", { "extensions": ["html", "css", "js"] }));
app.use(cors(corsOptions));
app.options('/unity-endpoint', cors(corsOptions));

//WebSocket
//let keepAliveId;

const WebSocket = require("ws");

const wss = process.env.NODE_ENV === "production"
    ? new WebSocket.Server({ server })
    : new WebSocket.Server({ port: 5001 });

    // handleConnection(wss);


server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
console.log(`Server started on port ${process.env.PORT} in stage ${process.env.NODE_ENV}`);







//Home Index
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


//Unity endpoint
app.post('/unity-endpoint', (req, res) => {
  console.log("Raw body:", req.body);
  res.header("Access-Control-Allow-Credentials", true);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Accept, X-Access-Token, X-Application-Name, X-Request-Sent-Time');
  
  const receivedMessage = req.body.data;
  if(receivedMessage === 'red') {
    broadcast(null, JSON.stringify({ type: 'color', value: '#ff0000' }), true);
  }

  console.log("Received message:", receivedMessage);
  const responseMessage = {
      message: 'hello'
  };
  res.json(responseMessage);
});


//Beacon endpoint
app.post('/beacon-endpoint', (req, res) => {
  res.header("Access-Control-Allow-Credentials", true);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Accept, X-Access-Token, X-Application-Name, X-Request-Sent-Time');

  const beaconURL = req.body.beacon;
  if (beaconURL) {
    broadcast(null, JSON.stringify({ type: 'beacon', url: beaconURL }), true);
  }

  console.log("Received beacon URL:", beaconURL);
  const responseMessage = {
      message: 'Beacon URL received!'
  };
  res.json(responseMessage);
});


//Database connection

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
  },
});

async function getPostgresVersion() {
  const client = await pool.connect();
  try {
    const response = await client.query('SELECT version()');
    console.log(response.rows[0]);
  } finally {
    client.release();
  }
}

getPostgresVersion();




let users = {};
const isJSON = (message) => {
    try {
      const obj = JSON.parse(message);
      return obj && typeof obj === "object";
    } catch (err) {
      return false;
    }
  };



  // Keep alive interval
  const keepServerAlive = () => {
    keepAliveId = setInterval(() => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send('ping');
        }
      });
    }, 50000);
  };

  
function onUserConnect(userID) {
    // Ensure position data is set for the user
    if(!users[userID].position) {
        users[userID].position = { x: 0, y: 0, z: 0 };
    }
    
    sendToUser(userID, {
        type: 'initUsers',
        userID: userID,
        users: users
    });
  }

  
function onUserPositionUpdate(userID, position) {
    users[userID].position = position;
    broadcast(null, {
        type: 'userPositionUpdate',
        userID: userID,
        position: position
    }, false);
  }
  

  function onUserDisconnect(userID) {
    delete users[userID];
    broadcast(null, JSON.stringify({
        type: 'userDisconnected',
        userID: userID
    }), true);
    console.log(userID);
  }
  


function sendToUser(userID, message) {
    wss.clients.forEach(client => {
        client.send(JSON.stringify(message));
    });
  }


const broadcast = (ws, message, includeSelf) => {
    const stringifiedMessage = typeof message === 'string' ? message : JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && (includeSelf || client !== ws)) {
            client.send(stringifiedMessage);
        }
    });
  };



  
    wss.on("connection", function (ws, req) {
        console.log("Connection Opened");
        console.log("Client size: ", wss.clients.size);
      
        const userID = uuidv4();  // Generate a UUID for each connected user
            users[userID] = {
              position: { x: 0, y: 0, z: 0 } // default position
          };
      
        // Send the assigned user ID to the connected client
        ws.send(JSON.stringify({ type: 'assignUserID', userID: userID }));
      
        onUserConnect(userID);
        broadcast(null, JSON.stringify({ type: 'userCount', value: wss.clients.size }), true);
      
        if (wss.clients.size === 1) {
          console.log("first connection. starting keepalive");
          keepServerAlive();
        }
      
      
      
        ws.on("message", (data) => {
          if (isJSON(data)) {
              const currData = JSON.parse(data);

              //Ping
              if(currData.type === 'ping') {
                  console.log('Received a server heartbeat ping');

              //Location update
              } else if(currData.type === 'loc') {
                  onUserPositionUpdate(userID, currData.position);
                  broadcast(ws, currData, false);

              //Bookmark
              } else if (currData.type === 'bookmark') {
                console.log(`Received a bookmark from user: ${currData.userID} for URL: ${currData.url}`);
                addDummyProfileRow();  // call the bookmark function

              //Entrance
             } else if (currData.type === 'entrance') {
                console.log(`Received an entrance ping for object: ${currData.objectName} at x:${currData.position.x} y:${currData.position.y} z:${currData.position.z}`);
                  broadcast(ws, currData, false);
              }

              //String
          } else if(typeof data === 'string') {
              if(data === 'pong') {
                  console.log('keepAlive');
                  return;
              }
          } else {
              console.error('malformed message', data);
          }
        });
      

        // Close connection
        ws.on("close", (data) => {
            console.log("closing connection");
            onUserDisconnect(userID);
            broadcast(null, JSON.stringify({ type: 'userCount', value: wss.clients.size }), true);
      
            if (wss.clients.size === 0) {
                console.log("last client disconnected, stopping keepAlive interval");
                clearInterval(keepAliveId);
            }
        });
      });
 

      