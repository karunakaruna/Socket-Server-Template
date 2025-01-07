import asyncio
import websockets
import json
import numpy as np
from quantum_crypto import QuantumState
import http.server
import socketserver
import threading
import os

class HttpServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Store the directory before calling parent's init
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        super().__init__(*args)
        
    def translate_path(self, path):
        """Override to serve files from our directory"""
        # Handle root path
        if path == '/':
            path = '/quantum_vis.html'
            
        # Remove query parameters if any
        path = path.split('?', 1)[0]
        path = path.split('#', 1)[0]
        
        # Convert to system path
        path = os.path.normpath(path.lstrip('/'))
        
        # Join with base directory
        return os.path.join(self.base_dir, path)
        
    def log_message(self, format, *args):
        """Override to use print instead of stderr"""
        print("[HTTP] %s - - [%s] %s" %
            (self.address_string(),
             self.log_date_time_string(),
             format%args))

def start_http_server():
    """Start HTTP server for serving the visualization page"""
    handler = HttpServer
    with socketserver.TCPServer(("", 8770), handler) as httpd:
        print("HTTP server running on http://localhost:8770")
        httpd.serve_forever()

class QuantumVisualizer:
    def __init__(self):
        self.quantum_state = QuantumState()
        self.connected_clients = set()
        
    async def handle_client(self, websocket, path):
        """Handle client connection"""
        try:
            self.connected_clients.add(websocket)
            print(f"Client connected. Total clients: {len(self.connected_clients)}")
            
            # Send initial state
            state = self.quantum_state.get_state()
            foam = self.quantum_state.get_foam()
            await websocket.send(json.dumps({
                'type': 'state_update',
                'state': state.tolist(),
                'foam': foam.tolist()
            }))
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    if data['type'] == 'state_update':
                        self.quantum_state.set_state(data['state'])
                        # Broadcast update to all clients
                        state = self.quantum_state.get_state()
                        foam = self.quantum_state.get_foam()
                        update = json.dumps({
                            'type': 'state_update',
                            'state': state.tolist(),
                            'foam': foam.tolist()
                        })
                        await asyncio.gather(
                            *[client.send(update) for client in self.connected_clients]
                        )
                except json.JSONDecodeError:
                    pass
                    
        except websockets.exceptions.ConnectionClosed:
            print("Client disconnected")
        finally:
            self.connected_clients.remove(websocket)
            print(f"Client removed. Total clients: {len(self.connected_clients)}")
            
def main():
    # Start HTTP server in a separate thread
    http_thread = threading.Thread(target=start_http_server, daemon=True)
    http_thread.start()
    
    visualizer = QuantumVisualizer()
    
    async def start_server():
        server = await websockets.serve(
            visualizer.handle_client,
            'localhost',
            8769
        )
        print("Visualization server running on ws://localhost:8769")
        await server.wait_closed()
        
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(start_server())
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        loop.close()
        
if __name__ == "__main__":
    main()
