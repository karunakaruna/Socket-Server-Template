import asyncio
import websockets
import json
import logging
import time
from quantum_crypto import QuantumState

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HyperVoidServer:
    def __init__(self, host='localhost', port=8767):
        self.host = host
        self.port = port
        self.clients = {}  # username -> websocket
        self.quantum_states = {}  # username -> QuantumState
        
    async def register(self, websocket, username):
        """Register a new client"""
        if username in self.clients:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Username already taken"
            }))
            return False
            
        self.clients[username] = websocket
        self.quantum_states[username] = QuantumState()
        
        # Notify others
        await self.broadcast({
            "type": "system",
            "message": f"{username} has joined"
        }, exclude=username)
        
        return True
        
    async def unregister(self, username):
        """Unregister a client"""
        if username in self.clients:
            del self.clients[username]
            del self.quantum_states[username]
            
            # Notify others
            await self.broadcast({
                "type": "system",
                "message": f"{username} has left"
            })
            
    async def broadcast(self, message, exclude=None):
        """Broadcast message to all clients except excluded one"""
        disconnected = set()
        
        for username, client in self.clients.items():
            if username != exclude:
                try:
                    await client.send(json.dumps(message))
                except websockets.exceptions.ConnectionClosed:
                    disconnected.add(username)
                    
        # Clean up disconnected clients
        for username in disconnected:
            await self.unregister(username)
            
    async def handle_message(self, websocket, username, message):
        """Handle a message from a client"""
        try:
            data = json.loads(message)
            
            if isinstance(data, dict):
                msg_type = data.get('type', '')
                
                if msg_type == 'message':
                    # Regular chat message
                    await self.broadcast({
                        "type": "message",
                        "username": username,
                        "message": data.get('message', '')
                    })
                    
                elif msg_type == 'whisper':
                    # Private message
                    target = data.get('target')
                    if target in self.clients:
                        await self.clients[target].send(json.dumps({
                            "type": "whisper",
                            "from": username,
                            "message": data.get('message', '')
                        }))
                    else:
                        await websocket.send(json.dumps({
                            "type": "error",
                            "message": f"User {target} not found"
                        }))
                        
                elif msg_type == 'state_update':
                    # Update quantum state
                    if username in self.quantum_states:
                        state_data = data.get('state', {})
                        self.quantum_states[username] = QuantumState.from_json(state_data)
                        
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON from client: {message}")
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Invalid message format"
            }))
            
    async def handle_client(self, websocket, path):
        """Handle a client connection"""
        username = None
        try:
            # Wait for username
            message = await websocket.recv()
            try:
                data = json.loads(message)
                username = data.get('username')
                
                if not username:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "Username required"
                    }))
                    return
                    
                # Register new client
                if not await self.register(websocket, username):
                    return
                    
                # Handle messages
                async for message in websocket:
                    await self.handle_message(websocket, username, message)
                    
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON from client: {message}")
                return
                
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            if username:
                await self.unregister(username)
                
    def start(self):
        """Start the server"""
        server = websockets.serve(
            self.handle_client,
            self.host,
            self.port
        )
        
        logger.info(f"Server started on {self.host}:{self.port}")
        asyncio.get_event_loop().run_until_complete(server)
        asyncio.get_event_loop().run_forever()
        
if __name__ == "__main__":
    server = HyperVoidServer()
    server.start()
