import asyncio
import websockets
import json
import numpy as np
from quantum_crypto import QuantumState

class HyperVoidServer:
    def __init__(self):
        self.clients = {}  # username -> websocket
        self.quantum_state = QuantumState()
        
    async def register(self, websocket, username):
        """Register a new client"""
        self.clients[username] = websocket
        print(f"Client {username} connected. Total clients: {len(self.clients)}")
        
        # Send welcome message
        await websocket.send(json.dumps({
            "type": "welcome",
            "username": username
        }))
        
        # Broadcast user list update
        await self.broadcast_users()
        
    async def unregister(self, websocket):
        """Unregister a client"""
        # Find and remove client
        username = None
        for name, ws in list(self.clients.items()):
            if ws == websocket:
                username = name
                del self.clients[name]
                break
                
        if username:
            print(f"Client {username} disconnected. Total clients: {len(self.clients)}")
            await self.broadcast_users()
            
    async def broadcast_users(self):
        """Broadcast user list to all clients"""
        if self.clients:
            message = json.dumps({
                "type": "users",
                "users": list(self.clients.keys())
            })
            await asyncio.gather(
                *[client.send(message) for client in self.clients.values()]
            )
            
    async def broadcast_state(self, state):
        """Broadcast state update to all clients"""
        if self.clients:
            message = json.dumps({
                "type": "state_update",
                "state": state
            })
            await asyncio.gather(
                *[client.send(message) for client in self.clients.values()]
            )
            
    async def handle_client(self, websocket, path):
        """Handle client connection"""
        try:
            # Generate unique username
            username = f"User_{len(self.clients) + 1}"
            await self.register(websocket, username)
            
            try:
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        
                        if data['type'] == 'chat':
                            # Broadcast chat message
                            broadcast_msg = json.dumps({
                                "type": "chat",
                                "sender": username,
                                "message": data['message']
                            })
                            await asyncio.gather(
                                *[client.send(broadcast_msg) 
                                  for client in self.clients.values()]
                            )
                            
                        elif data['type'] == 'whisper':
                            # Send private message
                            target = data['target']
                            if target in self.clients:
                                await self.clients[target].send(json.dumps({
                                    "type": "whisper",
                                    "sender": username,
                                    "message": data['message']
                                }))
                                
                        elif data['type'] == 'state_update':
                            # Update quantum state
                            self.quantum_state.set_state(data['state'])
                            # Broadcast new state
                            await self.broadcast_state(data['state'])
                            
                        elif data['type'] == 'users_request':
                            # Send user list
                            await websocket.send(json.dumps({
                                "type": "users",
                                "users": list(self.clients.keys())
                            }))
                            
                        elif data['type'] == 'state_request':
                            # Send current state
                            await websocket.send(json.dumps({
                                "type": "state_update",
                                "state": self.quantum_state.get_state().tolist()
                            }))
                            
                    except json.JSONDecodeError:
                        pass
                        
            finally:
                await self.unregister(websocket)
                
        except Exception as e:
            print(f"Error handling client: {e}")

def main():
    server = HyperVoidServer()
    
    loop = asyncio.get_event_loop()
    start_server = websockets.serve(
        server.handle_client,
        'localhost',
        8769,
        ping_interval=None,  # Disable ping/pong for better performance
        max_size=2**23,  # Increase max message size
        max_queue=2**10,  # Increase message queue size
    )
    
    print("HyperVoid server running on ws://localhost:8769")
    
    try:
        loop.run_until_complete(start_server)
        loop.run_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        loop.close()
        
if __name__ == "__main__":
    main()
