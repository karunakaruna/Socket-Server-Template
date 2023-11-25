const express = require('express');
const router = express.Router();
//const {broadcast} = require('../util/websocket');
//const websocket = require('../util/websocket');
const {broadcast} = require('../main.js');

const {wss} = require('../main.js');

//Unity endpoint
router.post('/unity-endpoint', (req, res) => {
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
  router.post('/beacon-endpoint', (req, res) => {
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


  module.exports = router;