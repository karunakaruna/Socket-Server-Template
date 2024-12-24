# Socket-Server-Template
A WebSocket Node Server Template for real-time user coordination and communication.

## System Overview
This server manages real-time user connections and coordinates user positions in a shared space. It uses WebSocket for bi-directional communication and maintains user state in memory.

### Key Features
- Real-time user position tracking
- User authentication via secrets
- User presence management
- Connection state monitoring
- User listening relationships

## Core Components

### Server Setup
- Express server for static file serving
- WebSocket server for real-time communication
- Health check endpoint at `/health`

### Data Structures
- `users`: Object storing user metadata
- `clientMap`: Map of WebSocket clients
- `userSecrets`: Map of user authentication secrets
- `uuidBySecret`: Reverse lookup for user secrets
- `secretTimestamps`: Tracks secret usage times

### Key Functions

#### Authentication & Session Management
- `generateUserSecret()`: Generates an 8-character hex secret for user authentication
- `cleanupExpiredSecrets()`: Removes expired user secrets (runs hourly)

#### User Management
- `updateUserData(userId, data)`: Updates user information
- `broadcastUserUpdate()`: Sends updated user list to all clients
- `broadcastCoordinates(senderId, coordinates)`: Broadcasts user position updates

#### Connection Management
- `startHeartbeat()`: Maintains connection health via ping/pong
- WebSocket connection handler: Manages new connections and message routing

#### Message Types Handled
1. `reconnect`: Handles user reconnection with saved secret
2. `register`: Creates new user registration
3. `update`: Updates user position/state
4. `updatelisteningto`: Updates user listening relationships
5. `ping`: Connection health check

### CSV Integration (Currently Inactive)
- `getCsvInfo()`: Gets CSV file information (not currently used)
- `broadcastCsvUpdate()`: Broadcasts CSV updates to clients

## Note
All user data is currently stored in memory and will be reset when the server restarts. There is no persistent storage implementation.
