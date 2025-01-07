import asyncio
import websockets
import json
import numpy as np
import tkinter as tk
from tkinter import ttk
from PIL import Image, ImageTk
import colorsys
from quantum_crypto import QuantumState

class QuantumVisualizer:
    def __init__(self):
        self.setup_window()
        self.quantum_state = QuantumState()  # Use the actual QuantumState class
        self.foam_data = np.zeros((32, 32))
        self.connected_clients = set()
        
    def setup_window(self):
        # Create main window
        self.root = tk.Tk()
        self.root.title("HyperVoid Quantum Visualizer")
        self.root.configure(bg='black')
        self.root.attributes('-topmost', True)  # Keep window on top
        self.root.geometry('650x350')  # Set window size
        
        # Create frames
        self.state_frame = ttk.Frame(self.root)
        self.state_frame.pack(side=tk.LEFT, padx=10, pady=10)
        
        self.foam_frame = ttk.Frame(self.root)
        self.foam_frame.pack(side=tk.RIGHT, padx=10, pady=10)
        
        # Create canvases
        self.state_canvas = tk.Canvas(
            self.state_frame, 
            width=300, height=300,
            bg='black',
            highlightthickness=1,
            highlightbackground='green'
        )
        self.state_canvas.pack()
        
        self.foam_canvas = tk.Canvas(
            self.foam_frame,
            width=300, height=300,
            bg='black',
            highlightthickness=1,
            highlightbackground='green'
        )
        self.foam_canvas.pack()
        
        # Add labels
        tk.Label(
            self.state_frame,
            text="Quantum State Vector",
            fg='green',
            bg='black'
        ).pack()
        
        tk.Label(
            self.foam_frame,
            text="Quantum Foam",
            fg='green',
            bg='black'
        ).pack()
        
        # Draw initial state
        self.draw_state()
        self.draw_foam()
        
        # Schedule updates
        self.root.after(100, self.process_events)
        
    def process_events(self):
        """Process any pending events"""
        self.root.update()
        self.root.after(100, self.process_events)
        
    def draw_state(self):
        """Draw quantum state vector"""
        self.state_canvas.delete("all")
        
        # Draw grid
        for i in range(-3, 4):
            # Vertical lines
            self.state_canvas.create_line(
                150 + i*50, 0,
                150 + i*50, 300,
                fill='#003300'
            )
            # Horizontal lines
            self.state_canvas.create_line(
                0, 150 + i*50,
                300, 150 + i*50,
                fill='#003300'
            )
        
        # Draw axes
        self.state_canvas.create_line(150, 0, 150, 300, fill='green', width=2)
        self.state_canvas.create_line(0, 150, 300, 150, fill='green', width=2)
        
        # Draw state vector
        state = self.quantum_state.get_state()
        x = 150 + state[0] * 100
        y = 150 - state[1] * 100
        self.state_canvas.create_line(150, 150, x, y, fill='lime', width=2, arrow=tk.LAST)
        
    def draw_foam(self):
        """Draw quantum foam visualization"""
        self.foam_canvas.delete("all")
        
        cell_width = 300 // 32
        cell_height = 300 // 32
        
        foam = self.quantum_state.get_foam()
        
        for i in range(32):
            for j in range(32):
                value = foam[i, j]
                # Convert value to color using viridis-like colormap
                hue = 0.6 - (0.6 * value)  # Blue to green to yellow
                color = '#{:02x}{:02x}{:02x}'.format(
                    *[int(x * 255) for x in colorsys.hsv_to_rgb(hue, 1.0, 1.0)]
                )
                self.foam_canvas.create_rectangle(
                    j * cell_width, i * cell_height,
                    (j + 1) * cell_width, (i + 1) * cell_height,
                    fill=color, outline=''
                )
                
    def update_state(self, state):
        """Update quantum state and redraw"""
        self.quantum_state.set_state(state)
        self.foam_data = np.random.rand(32, 32) * abs(state[0] * state[1])
        self.draw_state()
        self.draw_foam()
        
    async def handle_client(self, websocket, path):
        """Handle client connection"""
        try:
            self.connected_clients.add(websocket)
            print(f"Client connected. Total clients: {len(self.connected_clients)}")
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    if data['type'] == 'state_update':
                        self.update_state(data['state'])
                except json.JSONDecodeError:
                    pass
                    
        except websockets.exceptions.ConnectionClosed:
            print("Client disconnected")
        finally:
            self.connected_clients.remove(websocket)
            print(f"Client removed. Total clients: {len(self.connected_clients)}")
            
def main():
    # Get or create event loop
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
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
        loop.run_until_complete(start_server())
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        visualizer.root.quit()
        loop.close()
        
if __name__ == "__main__":
    main()
