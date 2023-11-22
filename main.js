//main.js
const http = require("http");
const express = require("express");
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { addDummyProfileRow, getPostgresVersion, updateOnlineTime, getOnlineTime} = require('./util/db-actions');

//server.js (passport logic)

const session = require('express-session');
const store = new session.MemoryStore();
const flash = require('express-flash');
const passport = require('passport');
const initializePassport = require('./util/passportConfig');
        initializePassport(passport);
const { checkAuthenticated, checkNotAuthenticated } = require('./util/auth');

//ENVIRONMENT VARIABLES
require("dotenv").config();
const sessionsecret = process.env.SECRET;

const cookieParser = require('cookie-parser');
const { parse } = require('cookie');






const WebSocket = require("ws");



const wss = process.env.NODE_ENV === "production"
      ? new WebSocket.Server({ server })
      : new WebSocket.Server({ port: 5001 });


// const homerouter = require('./routes/router');



//CORS
const allowedOrigins = ['https://monaverse.com', 'https://hyperfy.io', 'http://localhost','http://localhost:4000','http://localhost:3000', 'https://metacarta-b8f465580dc6.herokuapp.com'];
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

//app use from passport-sql-login
app.use(bodyParser.json());
app.set('view engine', 'ejs');

// app.use(session({
//     secret: sessionsecret, //ENV FILE
//     resave: false,
//     cookie: {
//         httpOnly: true, // Important: prevents client-side JS from reading the cookie
//         sameSite: 'None', // Important: enable this if your site is served over HTTPS
//         secure: true, // Important: ensures the cookie is sent over HTTPS
//         maxAge: 60000,
//         name: 'connect.sid' // This should match the name used to parse the cookie
//     },
//     saveUninitialized: true,
//     store
// }));

app.use(session({  
    secret: sessionsecret, //ENV FILE
    resave: false,
    saveUninitialized: false
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());





//Routes
const homerouter = require('./routes/router');
const accountRouter = require('./routes/account');
const modalsRouter = require('./routes/modals');


//Use Routes
app.use('/', homerouter);
app.use('/account', accountRouter);
app.use('/modals', modalsRouter);



//Home Index from metacarta
app.get('/', (req, res) => {
    console.log('appget Session ID:', req.sessionID);
    res.sendFile(__dirname + '/public/index2.html');
});


//Homepage
// app.get('/', checkNotAuthenticated, (req, res) => {
//     res.render('index.ejs');
//     }); 

//Redirects
app.get('/users/register'  , checkAuthenticated, (req, res) => {
    res.render('register');
    }
);

app.get('/users/login'  , checkAuthenticated, (req, res) => {
    res.render('login');
    }
);

app.get('/users/dashboard' , checkNotAuthenticated, (req, res) => {
    res.render('dashboard', {user: req.user.name})
    }
    
);



//Spinning sphere home page
app.get('/loading-home', (req, res) => {
    try {
        const data = {
            title: 'Modal Title',
            content: 'Content for the modal'
        };
        res.render('loading.ejs', data);
    } catch (error) {
        console.error("Error rendering EJS:", error);
        res.status(500).send('Server Error');
    }
});

app.get('/map', (req, res) => {
    // console.log('hi');
    console.log('sessionID:');

    console.log(req.sessionID);
    // console.log(store);
    try {
        const data = {
            title: 'Modal Title',
            content: 'Content for the modal'
        };
        res.render('map.ejs', data);
    } catch (error) {
        console.error("Error rendering EJS:", error);
        res.status(500).send('Server Error');
    }
});





//Database

let users = {};
let objects = [];    
  
getPostgresVersion();

//Websockets

wss.on("connection", function (ws, req) {
    // Parse the cookies from the request
    const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};

    // Retrieve the session ID from the parsed cookies
    const rawSessionCookie = cookies['connect.sid'] || '';
    const sessionID = rawSessionCookie ? cookieParser.signedCookie(rawSessionCookie, sessionsecret) : null;

    if (sessionID) {
        // Retrieve the session from the store using the sessionID
        store.get(sessionID, (error, session) => {
            if (error || !session) {
                console.error('Error retrieving session:', error);
                assignUnauthenticatedUserID(ws);
            } else {
                // Use the publicUserID if it exists in the session
                const userID = session.publicUserID || uuidv4();
                initializeUser(userID, ws);
            }
        });
    } else {
        // If there's no sessionID cookie, assign a new UUID
        assignUnauthenticatedUserID(ws);
    }


    function initializeUser(userID, ws) {
        users[userID] = {
            position: { x: 0, y: 0, z: 0 }, // default position
            count: 0,
            level: 1,
        };

        ws.userID = userID;
        // Send the assigned user ID to the connected client
        ws.send(JSON.stringify({ type: 'assignUserID', userID: userID }));
        getOnlineTime('1'); // call the getOnlineTime function
        onUserConnect(userID);
        updateObjects(userID);
        broadcast(null, JSON.stringify({ type: 'userCount', value: wss.clients.size }), true);

        if (wss.clients.size === 1) {
            console.log("first connection. starting keepalive");
            keepServerAlive();
        }
    }

    //New Function to Generate a UUID for an Authenticated User:
    function assignUnauthenticatedUserID(ws) {
        const userID = uuidv4(); // Generate a new UUID for unauthenticated user
        initializeUser(userID, ws);
    }

    function addObject(point, id, text) {
        objects.push({ point, id, text });
        console.log(`Added object with point ${point} and id ${id} with ${text} to objects.`);
        broadcast(null, JSON.stringify({ type: 'objects', value: objects}), true);
    }

    function updateObjects(userID){
        sendToUser(userID, { type: 'objects', value: objects});

    }


function getUserCount(userID, currData) {
    if (users.hasOwnProperty(userID)) {
        const user = users[userID];
        console.log(`User ${userID} count: ${user.count}`);
        
        if (user.count >= 2) {
            user.count -= 2;
            console.log(`Subtracted 10 from User ${userID} count. New count: ${user.count}`);
            sendToUser(userID, { type: "count", value: users[userID].count });
            addObject(currData.point, currData.userID, currData.text);
            sendToUser(userID, { type: "overlay", value: 'Spell Cast :)' });
            return 1;
            
        } else {
            sendToUser(userID, { type: "overlay", value: 'Not enough mana' });
            console.log("Not enough mana");
            return 0;
        }
    } else {
        console.log(`User ${userID} not found.`);
    }
}

ws.on("message", (data) => {
    let userID = ws.userID;
    if (isJSON(data)) {
        const currData = JSON.parse(data);

        //Ping
        if(currData.type === 'ping') {
            console.log('Received a server heartbeat ping');

        //Location update
        } else if(currData.type === 'loc') {
            onUserPositionUpdate(userID, currData.position);
            //grab user's level and combine it with the rest of the currData
            currData.level = users[userID].level;
            broadcast(ws, currData, false);
        } else if (currData.type === 'init') {
            console.log('welcome new user!')
            sendToUser(userID, { type: 'hello' }); // send 'hello' to the user

            

        //Bookmark
        } else if (currData.type === 'bookmark') {
            console.log(`Received a bookmark from user: ${currData.userID} for URL: ${currData.url}`);
            addDummyProfileRow();  // call the bookmark function

        //Entrance
        } else if (currData.type === 'entrance') {
            console.log(`Received an entrance ping for object: ${currData.objectName} at x:${currData.position.x} y:${currData.position.y} z:${currData.position.z}`);
            broadcast(ws, currData, false);
        }  else if (currData.type === 'create') {
            console.log(`Received a create message from user: ${currData.userID} with text: ${currData.text}`);
            console.log("Intersection Point:", currData.point);
            getUserCount(currData.userID, currData);
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

ws.on("close", (data) => {
    // Retrieve userID from the WebSocket object
    let userID = ws.userID;

    console.log("closing connection");
    onUserDisconnect(userID);
    broadcast(null, JSON.stringify({ type: 'userCount', value: wss.clients.size }), true);

    if (wss.clients.size === 0) {
        console.log("last client disconnected, stopping keepAlive interval");
        clearInterval(keepAliveId);
    }
});

});



//Utility Functions
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
            console.log('Sending heartbeat to keep server alive');
            logIntervalIds();
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'ping'}));
                }
            });
        }, 50000);
    };

    function onUserConnect(userID) {
        if (!users[userID].position) {
            users[userID].position = { x: 0, y: 0, z: 0 };
        }
        broadcast(
            null,
            JSON.stringify({
                type: "initUsers",
                userID: userID,
                users: users,
            }),
            false
        );



    }

    function userLevelsUp(userID){
        const level = users[userID].level += 1;
        broadcast(
                    null,
                    JSON.stringify({
                        type: "userUpdate",
                        userID: userID,
                        level: level,
                        // users: users,
                    }),
                    false
        );

                }
    function logIntervalIds() {
        for (const userID in users) {
            console.log(`User ${userID} intervalId: ${users[userID].count}`);
        }
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
        // updateOnlineTime(count, '1'); // call the updateOnlineTime function
        clearInterval(users[userID].intervalID);
        delete users[userID];
        
        broadcast(null, JSON.stringify({
            type: 'userDisconnected',
            userID: userID
        }), true);
        console.log(userID);
    }

    function sendToUser(userID, message) {
        wss.clients.forEach(client => {
            if (client.userID === userID) {
                client.send(JSON.stringify(message));
            }
        });
    }


    function sendToAllUsers(userID, message) {
        wss.clients.forEach(client => {
            if (client.userID === userID) {
                client.send(JSON.stringify(message));
            }
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









// Global game tick function
    const gameTickInterval = 10000; // 10 seconds
    setInterval(() => {
        for (let userID in users) {
            if (users.hasOwnProperty(userID)) {
                users[userID].count += 1;
                // Broadcast the updated count to all users
                console.log(users[userID].count);
                // Send the count to the user
                sendToUser(userID, { type: "count", value: users[userID].count });

                // Check all users counts, for every 10, level up
                // && users[userID].level === 1
                if (users[userID].count >= 3 ) {
                    userLevelsUp(userID);
                }
            }
        }
    }, gameTickInterval);

























    module.exports = { broadcast };


//Start Server    
server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
console.log(`Server started on port ${process.env.PORT} in stage ${process.env.NODE_ENV}`);
