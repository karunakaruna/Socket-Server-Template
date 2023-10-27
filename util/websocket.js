const WebSocket = require("ws");
const { v4: uuidv4 } = require('uuid');
const { addDummyProfileRow } = require('./db-actions');

function initializeWebSocket(server) {
    const wss = process.env.NODE_ENV === "production"
        ? new WebSocket.Server({ server })
        : new WebSocket.Server({ port: 5001 });

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
    


};

    let users = {};

    const isJSON = (message) => {
        try {
            const obj = JSON.parse(message);
            return obj && typeof obj === "object";
        } catch (err) {
            return false;
        }
    };

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
        if (!users[userID].position) {
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


module.exports = {initializeWebSocket, broadcast, users, keepServerAlive, onUserConnect, onUserPositionUpdate, onUserDisconnect, sendToUser, isJSON};


    // Export wss and any other functions that routes or other modules might need
