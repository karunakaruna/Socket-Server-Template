import asyncio
import websockets
import json
import socket
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import numpy as np

def is_port_in_use(port):
    """Check if a port is in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return False
        except socket.error:
            return True

def wait_for_port_release(port, timeout=5):
    """Wait for a port to be released"""
    start_time = time.time()
    while is_port_in_use(port):
        if time.time() - start_time > timeout:
            return False
        time.sleep(0.1)
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

def create_quantum_trace(state_data):
    """Create a visualization trace from quantum state data"""
    try:
        state = state_data['state']
        username = state_data['username']
        
        # Create a trace showing quantum state position
        trace = {
            'type': 'scatter3d',
            'x': [state[0]],
            'y': [state[1]],
            'z': [state[2]],
            'mode': 'markers+text',
            'marker': {
                'size': 10,
                'color': '#00ff00',
                'symbol': 'circle'
            },
            'text': [username],
            'textposition': 'top center',
            'name': username
        }
        
        # Add quantum foam visualization
        foam_points = []
        foam_x = []
        foam_y = []
        foam_z = []
        
        # Generate foam points in a sphere around the quantum state
        center = np.array(state[:3])
        radius = 0.5
        n_points = 20
        
        for _ in range(n_points):
            # Generate random point on unit sphere
            point = np.random.randn(3)
            point = point / np.linalg.norm(point)
            
            # Scale by radius and offset by center
            point = center + point * radius * np.random.random()
            
            foam_x.append(point[0])
            foam_y.append(point[1])
            foam_z.append(point[2])
        
        foam_trace = {
            'type': 'scatter3d',
            'x': foam_x,
            'y': foam_y,
            'z': foam_z,
            'mode': 'markers',
            'marker': {
                'size': 3,
                'color': '#00ff00',
                'opacity': 0.3
            },
            'name': f"{username}'s quantum foam"
        }
        
        return [trace, foam_trace]
        
    except Exception as e:
        print(f"Error creating trace: {e}")
        return None

class VisualizationServer:
    def __init__(self, port=8769):
        self.port = port
        self.clients = set()
        self.quantum_states = {}
        self.http_server = None
        self.ws_server = None
        
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
            # Create visualization
            traces = []
            for state_data in self.quantum_states.values():
                state_traces = create_quantum_trace(state_data)
                if state_traces:
                    traces.extend(state_traces)
                    
            # Send to all clients
            data = {
                'type': 'states',
                'traces': traces
            }
            await asyncio.gather(
                *[client.send(json.dumps(data)) for client in self.clients],
                return_exceptions=True
            )
            
    def start_http_server(self):
        """Start HTTP server"""
        if is_port_in_use(self.port):
            print(f"Port {self.port} in use")
            return False
            
        try:
            handler = lambda *args: PlotHandler(*args)
            self.http_server = HTTPServer(('localhost', self.port), handler)
            threading.Thread(target=self.http_server.serve_forever, daemon=True).start()
            print(f"HTTP server started on http://localhost:{self.port}")
            return True
        except Exception as e:
            print(f"Failed to start HTTP server: {e}")
            return False
            
    async def start_ws_server(self):
        """Start WebSocket server"""
        ws_port = self.port - 1
        
        if is_port_in_use(ws_port):
            print(f"Port {ws_port} in use")
            return False
            
        try:
            self.ws_server = await websockets.serve(
                self.handle_client,
                'localhost',
                ws_port
            )
            print(f"WebSocket server started on ws://localhost:{ws_port}")
            return True
        except Exception as e:
            print(f"Failed to start WebSocket server: {e}")
            return False
            
    def stop(self):
        """Stop all servers"""
        if self.http_server:
            self.http_server.shutdown()
        if self.ws_server:
            self.ws_server.close()
            
    async def run(self):
        """Run the visualization server"""
        print("Starting visualization server...")
        
        # Start HTTP server
        if not self.start_http_server():
            print("Failed to start HTTP server")
            return
            
        # Start WebSocket server
        if not await self.start_ws_server():
            print("Failed to start WebSocket server")
            self.stop()
            return
            
        try:
            # Keep running until WebSocket server closes
            await self.ws_server.wait_closed()
        except KeyboardInterrupt:
            print("Shutting down...")
        finally:
            self.stop()
            
def main():
    """Main entry point"""
    server = VisualizationServer()
    
    # Get or create event loop
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    try:
        loop.run_until_complete(server.run())
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        loop.close()
        
if __name__ == "__main__":
    main()
