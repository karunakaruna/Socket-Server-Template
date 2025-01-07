import asyncio
import websockets
import json
import numpy as np
import os
import sys
import logging
import argparse
from quantum_crypto import QuantumState

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler()]
)

class HyperVoidServer:
    def __init__(self, port):
        self.port = port
        self.clients = {}
        self.quantum_state = QuantumState()
        self.server = None
        self.running = False
        
    async def register_client(self, websocket, username):
        self.clients[username] = websocket
        logging.info(f"Client registered: {username}")
        await self.broadcast_user_list()
        
    async def unregister_client(self, username):
        if username in self.clients:
            del self.clients[username]
            logging.info(f"Client unregistered: {username}")
            await self.broadcast_user_list()
            
    async def broadcast_user_list(self):
        if not self.clients:
            return
            
        message = {
            'type': 'user_list',
            'users': list(self.clients.keys())
        }
        await self.broadcast(json.dumps(message))
        
    async def broadcast(self, message):
        if not self.clients:
            return
            
        await asyncio.gather(
            *[client.send(message) for client in self.clients.values()],
            return_exceptions=True
        )
        
    async def handle_client(self, websocket, path):
        username = None
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    
                    if data['type'] == 'register':
                        username = data['username']
                        await self.register_client(websocket, username)
                        
                    elif data['type'] == 'quantum_state':
                        if username:
                            self.quantum_state.set_state(np.array(data['state']))
                            state = self.quantum_state.get_state()
                            foam = self.quantum_state.get_foam()
                            
                            update = {
                                'type': 'quantum_state',
                                'username': username,
                                'state': state.tolist(),
                                'foam': foam.tolist()
                            }
                            await self.broadcast(json.dumps(update))
                            
                except json.JSONDecodeError:
                    logging.error("Invalid JSON received")
                    
        except websockets.exceptions.ConnectionClosed:
            logging.info(f"Client disconnected: {username}")
        finally:
            if username:
                await self.unregister_client(username)
                
    async def start(self):
        self.running = True
        try:
            self.server = await websockets.serve(
                self.handle_client,
                'localhost',
                self.port,
                ping_interval=None,
                max_size=2**23,
                max_queue=2**10
            )
            
            logging.info(f"WebSocket server running on ws://localhost:{self.port}")
            
            while self.running:
                await asyncio.sleep(1)
                
        except Exception as e:
            logging.error(f"Server error: {e}")
            self.running = False
            raise

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, required=True)
    args = parser.parse_args()
    
    server = HyperVoidServer(args.port)
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        logging.info("Server stopped by user")
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
