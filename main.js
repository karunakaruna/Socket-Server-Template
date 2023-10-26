
const http = require("http");
const express = require("express");
const cors = require('cors');
const app = express();
const { handleConnection } = require('./util/websocketHandlers.js');
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const bodyParser = require('body-parser');


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

    handleConnection(wss);


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

module.exports = { wss };

