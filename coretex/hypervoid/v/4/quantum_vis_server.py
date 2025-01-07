import asyncio
import websockets
import json
import plotly.graph_objects as go
import numpy as np
import threading
import webbrowser
import http.server
import socketserver
import os
import time
from quantum_crypto import QuantumState

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.directory = kwargs.pop('directory', os.path.dirname(os.path.abspath(__file__)))
        super().__init__(*args, **kwargs)
        
    def translate_path(self, path):
        """Translate URL paths into filesystem paths"""
        path = super().translate_path(path)
        # Replace the current directory with our specified directory
        rel_path = os.path.relpath(path, os.getcwd())
        return os.path.join(self.directory, rel_path)
        
    def log_message(self, format, *args):
        # Suppress logging for cleaner output
        pass

class VisualizationServer:
    def __init__(self, websocket_port=8768, http_port=8769):
        self.websocket_port = websocket_port
        self.http_port = http_port
        self.clients = set()
        self.states = {}
        self.foam_states = {}
        self.last_plot = None
        self.httpd = None
        self.server_dir = os.path.dirname(os.path.abspath(__file__))
        self.create_initial_plot()
        
    def create_initial_plot(self):
        """Create initial empty plot"""
        fig = go.Figure()
        
        # Add empty scatter3d trace
        fig.add_trace(go.Scatter3d(
            x=[0], y=[0], z=[0],
            mode='markers',
            marker=dict(
                size=10,
                color='#00ff00',
                opacity=0.8
            ),
            name='Quantum States'
        ))
        
        # Update layout
        fig.update_layout(
            title=dict(
                text='HyperVoid Quantum Visualization',
                font=dict(color='#00ff00')
            ),
            paper_bgcolor='#1a1a1a',
            plot_bgcolor='#1a1a1a',
            scene=dict(
                xaxis=dict(title='X', gridcolor='#333', showbackground=False),
                yaxis=dict(title='Y', gridcolor='#333', showbackground=False),
                zaxis=dict(title='Z', gridcolor='#333', showbackground=False),
                camera=dict(
                    eye=dict(x=1.5, y=1.5, z=1.5)
                ),
                bgcolor='#1a1a1a'
            ),
            margin=dict(l=0, r=0, b=0, t=30),
            showlegend=True,
            legend=dict(font=dict(color='#00ff00'))
        )
        
        # Save initial plot
        plot_file = os.path.join(self.server_dir, 'quantum_plot.html')
        try:
            fig.write_html(plot_file, auto_open=False, include_plotlyjs='cdn')
            self.last_plot = fig
            print(f"Created initial plot at {plot_file}")
        except Exception as e:
            print(f"Error saving initial plot: {e}")
        
    def create_visualization(self):
        """Create visualization using plotly"""
        try:
            if not self.states:
                return self.last_plot
                
            # Create figure
            fig = go.Figure()
            
            # Add quantum states as 3D scatter
            positions = np.array([state.position for state in self.states.values()])
            usernames = list(self.states.keys())
            
            # Add scatter plot for quantum states
            fig.add_trace(go.Scatter3d(
                x=positions[:, 0],
                y=positions[:, 1],
                z=positions[:, 2],
                mode='markers+text',
                text=usernames,
                textposition='top center',
                marker=dict(
                    size=10,
                    color=positions[:, 3],  # Use 4th dimension for color
                    colorscale='Viridis',
                    opacity=0.8,
                    showscale=True,
                    colorbar=dict(
                        title='4D Position',
                        titleside='right',
                        titlefont=dict(color='#00ff00'),
                        tickfont=dict(color='#00ff00')
                    )
                ),
                name='Quantum States'
            ))
            
            # Add quantum foam visualization
            try:
                # Get foam states and create a simplified visualization
                foam_positions = []
                foam_values = []
                
                for state in self.states.values():
                    foam_state = state.foam.get_state()
                    base_pos = state.position[:3]  # Use first 3 dimensions
                    
                    # Create foam points around the quantum state
                    for i in range(10):
                        angle = (i / 10) * 2 * np.pi
                        radius = 0.2 * state.hyperradius
                        foam_pos = base_pos + radius * np.array([
                            np.cos(angle),
                            np.sin(angle),
                            np.sin(angle + foam_state[3])  # Use 4th foam dimension for z-offset
                        ])
                        foam_positions.append(foam_pos)
                        foam_values.append(foam_state[0])  # Use first foam dimension for color
                
                if foam_positions:
                    foam_positions = np.array(foam_positions)
                    fig.add_trace(go.Scatter3d(
                        x=foam_positions[:, 0],
                        y=foam_positions[:, 1],
                        z=foam_positions[:, 2],
                        mode='markers',
                        marker=dict(
                            size=5,
                            color=foam_values,
                            colorscale='Viridis',
                            opacity=0.3
                        ),
                        name='Quantum Foam'
                    ))
            except Exception as e:
                print(f"Error creating foam visualization: {e}")
            
            # Update layout
            fig.update_layout(
                title=dict(
                    text='HyperVoid Quantum Visualization',
                    font=dict(color='#00ff00')
                ),
                paper_bgcolor='#1a1a1a',
                plot_bgcolor='#1a1a1a',
                scene=dict(
                    xaxis=dict(title='X', gridcolor='#333', showbackground=False),
                    yaxis=dict(title='Y', gridcolor='#333', showbackground=False),
                    zaxis=dict(title='Z', gridcolor='#333', showbackground=False),
                    camera=dict(
                        eye=dict(x=1.5, y=1.5, z=1.5)
                    ),
                    bgcolor='#1a1a1a'
                ),
                margin=dict(l=0, r=0, b=0, t=30),
                showlegend=True,
                legend=dict(font=dict(color='#00ff00'))
            )
            
            self.last_plot = fig
            return fig
        except Exception as e:
            print(f"Error creating visualization: {e}")
            return self.last_plot
            
    async def register(self, websocket):
        """Register a new client"""
        self.clients.add(websocket)
        print(f"Client connected. Total clients: {len(self.clients)}")
        
    async def unregister(self, websocket):
        """Unregister a client"""
        self.clients.remove(websocket)
        print(f"Client disconnected. Total clients: {len(self.clients)}")
        
    async def handle_message(self, websocket, message):
        """Handle incoming messages"""
        try:
            data = json.loads(message)
            msg_type = data.get('type')
            
            if msg_type == 'state_update':
                username = data['username']
                state = QuantumState.from_json(data['state'])
                self.states[username] = state
                
                # Update visualization
                fig = self.create_visualization()
                if fig:
                    # Save plot to HTML
                    plot_file = os.path.join(self.server_dir, 'quantum_plot.html')
                    try:
                        fig.write_html(plot_file, auto_open=False, include_plotlyjs='cdn')
                        print(f"Updated plot at {plot_file}")
                    except Exception as e:
                        print(f"Error saving plot: {e}")
                
        except Exception as e:
            print(f"Error handling message: {e}")
            
    async def ws_handler(self, websocket, path):
        """Handle websocket connections"""
        await self.register(websocket)
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        finally:
            await self.unregister(websocket)
            
    def start_http_server(self):
        """Start HTTP server for plots"""
        try:
            # Create handler class with fixed directory
            handler = lambda *args: CustomHandler(*args, directory=self.server_dir)
            
            # Change to server directory
            os.chdir(self.server_dir)
            
            # Try to create server
            for _ in range(3):  # Retry a few times
                try:
                    self.httpd = socketserver.TCPServer(("", self.http_port), handler)
                    break
                except OSError:
                    print(f"Port {self.http_port} in use, waiting to retry...")
                    time.sleep(1)
            
            if self.httpd:
                print(f"Serving plots at http://localhost:{self.http_port}")
                print(f"Server directory: {self.server_dir}")
                self.httpd.serve_forever()
            else:
                print("Failed to start HTTP server after retries")
                
        except Exception as e:
            print(f"Error starting HTTP server: {e}")
            import traceback
            traceback.print_exc()
        
    def cleanup(self):
        """Cleanup resources"""
        if self.httpd:
            try:
                self.httpd.server_close()
            except:
                pass
        
    def start(self):
        """Start the visualization server"""
        try:
            # Start HTTP server in a thread
            http_thread = threading.Thread(target=self.start_http_server, daemon=True)
            http_thread.start()
            
            # Wait a bit for HTTP server to start
            time.sleep(1)
            
            # Start websocket server
            start_server = websockets.serve(
                self.ws_handler, 
                "localhost", 
                self.websocket_port
            )
            
            # Open visualization in browser
            webbrowser.open(f"http://localhost:{self.http_port}/quantum_plot.html")
            
            # Start event loop
            loop = asyncio.get_event_loop()
            loop.run_until_complete(start_server)
            try:
                loop.run_forever()
            except KeyboardInterrupt:
                self.cleanup()
                
        except Exception as e:
            print(f"Error starting server: {e}")
            self.cleanup()
        
def main():
    """Start the visualization server"""
    server = VisualizationServer()
    # Start HTTP server
    http_server = http.server.HTTPServer(('localhost', 8769), CustomHandler)
    threading.Thread(target=http_server.serve_forever, daemon=True).start()
    print("Serving plots at http://localhost:8769")
    
    # Start WebSocket server
    start_server = websockets.serve(
        server.ws_handler, 
        "localhost", 
        8768
    )
    asyncio.get_event_loop().run_until_complete(start_server)
    print("Server directory:", os.path.dirname(__file__))
    print("Client connected. Total clients:", len(server.clients))
    asyncio.get_event_loop().run_forever()

if __name__ == "__main__":
    main()
