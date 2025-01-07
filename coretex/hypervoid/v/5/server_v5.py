import asyncio
import websockets
import json
import threading
import subprocess
import sys
import os
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socket

def is_port_in_use(port):
    """Check if a port is in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return False
        except socket.error:
            return True

class PlotHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.directory = os.path.dirname(os.path.abspath(__file__))
        super().__init__(*args, **kwargs)
        
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.path = '/quantum_plot_new.html'
        return super().do_GET()
        
    def log_message(self, format, *args):
        pass

class HyperVoidServer:
    def __init__(self, port=8767):
        self.port = port
        self.clients = set()
        self.quantum_states = {}
        self.http_server = None
        self.ws_server = None
        self.vis_process = None
        
    async def handle_client(self, websocket, path):
        """Handle a client connection"""
        self.clients.add(websocket)
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    if data['type'] == 'state_update':
                        self.quantum_states[data['username']] = data
                        await self.broadcast_states()
                except Exception as e:
                    print(f"Error handling message: {e}")
        finally:
            self.clients.remove(websocket)
            if websocket in self.quantum_states:
                del self.quantum_states[websocket]
                
    async def broadcast_states(self):
        """Broadcast all states to clients"""
        if self.clients:
            data = {
                'type': 'states',
                'states': list(self.quantum_states.values())
            }
            await asyncio.gather(
                *[client.send(json.dumps(data)) for client in self.clients],
                return_exceptions=True
            )
            
    def start_visualization_server(self):
        """Start visualization server"""
        if is_port_in_use(8769):
            print("Visualization port in use")
            return False
            
        try:
            vis_script = os.path.join(os.path.dirname(__file__), "quantum_vis_server.py")
            
            startupinfo = None
            if hasattr(subprocess, 'STARTUPINFO'):
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = subprocess.SW_HIDE
                
            self.vis_process = subprocess.Popen(
                [sys.executable, vis_script],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                startupinfo=startupinfo
            )
            
            print("Started visualization server")
            return True
            
        except Exception as e:
            print(f"Failed to start visualization server: {e}")
            return False
            
    async def start(self):
        """Start the server"""
        # Start visualization server
        if not self.start_visualization_server():
            print("Failed to start visualization server")
            return
            
        try:
            # Start WebSocket server
            self.ws_server = await websockets.serve(
                self.handle_client,
                'localhost',
                self.port
            )
            print(f"WebSocket server started on ws://localhost:{self.port}")
            
            # Keep server running
            await self.ws_server.wait_closed()
                
        except Exception as e:
            print(f"Server error: {e}")
        finally:
            if self.vis_process:
                self.vis_process.terminate()
            if self.ws_server:
                self.ws_server.close()
                
def main():
    """Main entry point"""
    server = HyperVoidServer()
    
    # Get or create event loop
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    try:
        loop.run_until_complete(server.start())
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        loop.close()
        
if __name__ == "__main__":
    main()
