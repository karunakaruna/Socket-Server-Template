# WorldTree Visualizer

A real-time 3D visualization of connected users in a shared space, built with Three.js and WebSocket.

## Features

- Real-time user visualization with orbital paths
- Interactive 3D scene with orbit controls
- Draggable UI windows for user list, controls, and logs
- WebSocket-based real-time communication
- Particle effects and starfield background
- Persistent window layouts and user sessions

## Project Structure

```
worldtree/
├── public/
│   ├── components/
│   │   └── core/
│   │       ├── ThreeScene.js      # Three.js scene management
│   │       ├── WebSocketClient.js # WebSocket communication
│   │       └── WindowManager.js   # UI window management
│   ├── utils/
│   │   └── EventBus.js           # Event system
│   ├── styles/
│   │   └── main.css              # Application styles
│   ├── index.html                # Main HTML file
│   └── worldtree.js             # Application entry point
└── server/
    ├── main.js                   # WebSocket server
    └── package.json              # Server dependencies
```

## Setup

1. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open `http://localhost:3001` in your browser

## Dependencies

### Server
- Express
- ws (WebSocket)
- uuid

### Frontend
- Three.js
- No additional dependencies (uses ES modules)

## Development

Start the server in development mode with auto-reload:
```bash
cd server
npm run dev
```

## Architecture

### Frontend
- **ThreeScene**: Manages the 3D visualization using Three.js
- **WebSocketClient**: Handles real-time communication with the server
- **WindowManager**: Manages draggable UI windows
- **EventBus**: Facilitates component communication

### Backend
- **Express Server**: Serves static files and handles HTTP requests
- **WebSocket Server**: Manages real-time connections and user state
- **User Management**: Tracks connected users and their metadata

## License

MIT
