import asyncio
import websockets
import json
import numpy as np
from quantum_crypto import QuantumState
import webbrowser
import os
import sys

class HyperVoidServer:
    def __init__(self):
        self.clients = {}  # username -> websocket
        self.states = {}   # username -> quantum state
        self.next_id = 1
        
    async def register(self, websocket):
        """Register a new client"""
        username = f"User_{self.next_id}"
        self.next_id += 1
        self.clients[username] = websocket
        self.states[username] = QuantumState()
        return username
        
    async def unregister(self, username):
        """Unregister a client"""
        if username in self.clients:
            del self.clients[username]
            del self.states[username]
            
    async def broadcast_users(self):
        """Send user list to all clients"""
        if not self.clients:
            return
            
        message = json.dumps({
            "type": "users",
            "users": list(self.clients.keys())
        })
        await asyncio.gather(
            *[ws.send(message) for ws in self.clients.values()]
        )
        
    async def handle_client(self, websocket, path):
        """Handle a client connection"""
        username = await self.register(websocket)
        print(f"{username} connected")
        
        try:
            await websocket.send(json.dumps({
                "type": "welcome",
                "username": username
            }))
            
            await self.broadcast_users()
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    
                    if data["type"] == "chat":
                        # Broadcast chat message
                        response = json.dumps({
                            "type": "chat",
                            "sender": username,
                            "message": data["message"]
                        })
                        await asyncio.gather(
                            *[ws.send(response) for ws in self.clients.values()]
                        )
                        
                    elif data["type"] == "whisper":
                        # Send private message
                        target = data["target"]
                        if target in self.clients:
                            response = json.dumps({
                                "type": "whisper",
                                "sender": username,
                                "message": data["message"]
                            })
                            await self.clients[target].send(response)
                            
                    elif data["type"] == "state_update":
                        # Update quantum state
                        self.states[username].set_state(data["state"])
                        response = json.dumps({
                            "type": "state_update",
                            "username": username,
                            "state": self.states[username].get_state().tolist()
                        })
                        await asyncio.gather(
                            *[ws.send(response) for ws in self.clients.values()]
                        )
                        
                except json.JSONDecodeError:
                    pass
                    
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister(username)
            await self.broadcast_users()
            print(f"{username} disconnected")
            
async def start_server():
    server = HyperVoidServer()
    async with websockets.serve(server.handle_client, "localhost", 8767):
        print("HyperVoid server running on ws://localhost:8767")
        await asyncio.Future()  # run forever
        
def main():
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(start_server())
    except KeyboardInterrupt:
        print("Server shutting down...")
        
if __name__ == "__main__":
    main()
