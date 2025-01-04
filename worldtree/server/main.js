const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// In-memory user state
const users = new Map();
const userSecrets = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
    const userId = `User_${uuidv4().substring(0, 5)}`;
    const userSecret = uuidv4();
    
    // Initialize user state
    const userState = {
        id: userId,
        name: userId,
        type: 'USER',
        status: 'Online',
        position: { x: 0, y: 0, z: 0 },
        lastSeen: Date.now(),
        isHost: users.size === 0 // First user is host
    };
    
    users.set(userId, userState);
    userSecrets.set(userId, userSecret);
    
    // Send initial state to new user
    ws.send(JSON.stringify({
        type: 'welcome',
        user: userState,
        secret: userSecret
    }));
    
    // Broadcast user list to all clients
    broadcastUserList();

    // Message handler
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'ping':
                    ws.send(JSON.stringify({ type: 'ping' }));
                    updateUserLastSeen(userId);
                    break;
                    
                case 'reconnect':
                    handleReconnect(ws, data);
                    break;
                    
                case 'updatePosition':
                    handlePositionUpdate(userId, data.position);
                    break;
                    
                case 'updateMetadata':
                    handleMetadataUpdate(userId, data.metadata);
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        handleUserDisconnect(userId);
    });
});

// Helper functions
function broadcastUserList() {
    const userList = Array.from(users.values());
    const message = JSON.stringify({
        type: 'userList',
        users: userList
    });
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function handleReconnect(ws, data) {
    const { userId, secret } = data;
    if (userSecrets.get(userId) === secret) {
        const userState = users.get(userId);
        if (userState) {
            userState.status = 'Online';
            userState.lastSeen = Date.now();
            ws.send(JSON.stringify({
                type: 'welcome',
                user: userState,
                secret: secret
            }));
            broadcastUserList();
        }
    }
}

function handlePositionUpdate(userId, position) {
    const user = users.get(userId);
    if (user) {
        user.position = position;
        broadcastUserList();
    }
}

function handleMetadataUpdate(userId, metadata) {
    const user = users.get(userId);
    if (user) {
        Object.assign(user, metadata);
        broadcastUserList();
    }
}

function handleUserDisconnect(userId) {
    const user = users.get(userId);
    if (user) {
        user.status = 'Offline';
        user.lastSeen = Date.now();
        broadcastUserList();
        
        // Clean up user data after a delay
        setTimeout(() => {
            if (users.get(userId)?.status === 'Offline') {
                users.delete(userId);
                userSecrets.delete(userId);
                broadcastUserList();
            }
        }, 300000); // 5 minutes
    }
}

function updateUserLastSeen(userId) {
    const user = users.get(userId);
    if (user) {
        user.lastSeen = Date.now();
    }
}

// Start cleanup interval
setInterval(() => {
    const now = Date.now();
    users.forEach((user, userId) => {
        if (user.status === 'Online' && now - user.lastSeen > 30000) {
            handleUserDisconnect(userId);
        }
    });
}, 10000);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
