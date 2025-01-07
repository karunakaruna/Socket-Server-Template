import asyncio
import websockets
import json
import tkinter as tk
from tkinter import ttk, scrolledtext
import threading
import random
import numpy as np

class QuantumState:
    """Simplified quantum state for visualization"""
    def __init__(self):
        self.position = np.array([0.0, 0.0, 0.0, 0.0])  # 4D position
        self.hyperradius = 1.0
        
    def tune(self, value):
        """Tune the quantum state"""
        self.position[3] += value
        self.hyperradius = max(0.1, min(2.0, self.hyperradius + value * 0.1))
        self._normalize()
        
    def align(self, value):
        """Align the quantum state"""
        angle = value * np.pi
        c, s = np.cos(angle), np.sin(angle)
        self.position[:2] = [
            c * self.position[0] - s * self.position[1],
            s * self.position[0] + c * self.position[1]
        ]
        self._normalize()
        
    def evolve(self, message):
        """Evolve state based on message"""
        # Hash message to get consistent evolution
        h = sum(ord(c) * i for i, c in enumerate(message))
        angle = (h % 360) * np.pi / 180
        
        # Rotate in 4D
        c, s = np.cos(angle), np.sin(angle)
        self.position = np.array([
            c * self.position[0] - s * self.position[1],
            s * self.position[0] + c * self.position[1],
            c * self.position[2] - s * self.position[3],
            s * self.position[2] + c * self.position[3]
        ])
        self._normalize()
        
    def _normalize(self):
        """Normalize the state"""
        norm = np.linalg.norm(self.position)
        if norm > 0:
            self.position = self.position / norm
            
    def get_state(self):
        """Get current state as list"""
        return self.position.tolist()

class HyperVoidClient:
    def __init__(self):
        # Setup main window
        self.root = tk.Tk()
        self.root.title("HyperVoid Client")
        self.root.geometry("600x400")
        self.root.configure(bg='black')
        
        # Quantum state
        self.quantum_state = QuantumState()
        self.username = None
        self.vis_websocket = None
        
        # Setup UI
        self.setup_gui()
        
        # Start async loop in thread
        self.loop = asyncio.new_event_loop()
        threading.Thread(target=self._run_async_loop, daemon=True).start()
        
    def setup_gui(self):
        # Configure grid
        self.root.grid_columnconfigure(0, weight=1)
        self.root.grid_rowconfigure(1, weight=1)
        
        # Title
        title = tk.Label(
            self.root,
            text="H Y P E R V O I D",
            fg="#00ff00",
            bg="black",
            font=("Courier", 14)
        )
        title.grid(row=0, column=0, sticky="ew", padx=5, pady=5)
        
        # Chat area
        self.chat_text = scrolledtext.ScrolledText(
            self.root,
            wrap=tk.WORD,
            bg='#1a1a1a',
            fg='#00ff00',
            font=('Consolas', 10)
        )
        self.chat_text.grid(row=1, column=0, sticky="nsew", padx=5, pady=5)
        
        # Input frame
        input_frame = ttk.Frame(self.root)
        input_frame.grid(row=2, column=0, sticky="ew", padx=5, pady=5)
        
        # Message entry
        self.msg_entry = ttk.Entry(input_frame)
        self.msg_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Send button
        ttk.Button(
            input_frame,
            text="Send",
            command=self.send_message
        ).pack(side=tk.RIGHT, padx=5)
        
        # Bind enter key
        self.msg_entry.bind('<Return>', lambda e: self.send_message())
        
        # Status bar
        self.status_label = ttk.Label(
            self.root,
            text="Disconnected",
            foreground='red'
        )
        self.status_label.grid(row=3, column=0, sticky="w", padx=5, pady=2)
        
        # Configure tags
        self.chat_text.tag_configure("error", foreground="#ff4444")
        self.chat_text.tag_configure("system", foreground="#44ff44")
        self.chat_text.tag_configure("quantum", foreground="#4444ff")
        
    def log(self, message, tag=None):
        """Add message to chat"""
        self.chat_text.insert(tk.END, f"{message}\n", tag)
        self.chat_text.see(tk.END)
        
    def send_message(self):
        """Send a message"""
        msg = self.msg_entry.get().strip()
        if msg:
            # Clear entry
            self.msg_entry.delete(0, tk.END)
            
            # Handle commands
            if msg.startswith('/'):
                self.handle_command(msg[1:])
            else:
                # Regular message
                self.log(f"{self.username}: {msg}")
                self.quantum_state.evolve(msg)
                self.update_visualization()
                
    def handle_command(self, cmd):
        """Handle chat commands"""
        parts = cmd.split()
        if not parts:
            return
            
        cmd = parts[0].lower()
        args = parts[1:]
        
        if cmd == 'help':
            self.log("Available commands:", "system")
            self.log("/help - Show this help", "system")
            self.log("/state - Show quantum state", "system")
            self.log("/tune <value> - Tune quantum state", "system")
            self.log("/align <value> - Align quantum state", "system")
            self.log("/whisper <user> <message> - Send private message", "system")
            
        elif cmd == 'state':
            state = self.quantum_state.get_state()
            radius = self.quantum_state.hyperradius
            self.log(f"Quantum state:", "quantum")
            self.log(f"Position: {state}", "quantum")
            self.log(f"Radius: {radius:.2f}", "quantum")
            
        elif cmd == 'tune':
            if args:
                try:
                    value = float(args[0])
                    self.quantum_state.tune(value)
                    self.log(f"Tuned quantum state by {value}", "quantum")
                    self.update_visualization()
                except ValueError:
                    self.log("Invalid value for tune command", "error")
            else:
                self.log("Usage: /tune <value>", "error")
                
        elif cmd == 'align':
            if args:
                try:
                    value = float(args[0])
                    self.quantum_state.align(value)
                    self.log(f"Aligned quantum state by {value}", "quantum")
                    self.update_visualization()
                except ValueError:
                    self.log("Invalid value for align command", "error")
            else:
                self.log("Usage: /align <value>", "error")
                
    async def connect_visualization(self):
        """Connect to visualization server"""
        try:
            self.vis_websocket = await websockets.connect('ws://localhost:8768')
            self.log("Connected to visualization server", "system")
            self.status_label.config(text="Connected", foreground="green")
            self.update_visualization()
        except Exception as e:
            self.log(f"Failed to connect to visualization: {e}", "error")
            self.status_label.config(text="Disconnected", foreground="red")
            
    def update_visualization(self):
        """Update visualization with current state"""
        if self.vis_websocket and self.vis_websocket.open:
            # Get current state
            state = self.quantum_state.get_state()
            
            # Create visualization data
            data = {
                'type': 'state_update',
                'username': self.username,
                'state': state,
                'radius': self.quantum_state.hyperradius
            }
            
            # Send update
            asyncio.run_coroutine_threadsafe(
                self.vis_websocket.send(json.dumps(data)),
                self.loop
            )
            
    async def broadcast_message(self, message):
        """Broadcast message to all clients"""
        # In a real implementation, this would send to the server
        self.log(f"Broadcasting: {message}")
        
    def _run_async_loop(self):
        """Run async event loop"""
        asyncio.set_event_loop(self.loop)
        
        # Get username
        self.username = f"User_{random.randint(1000, 9999)}"
        self.log(f"Welcome to HyperVoid, {self.username}!", "system")
        self.log("Type /help for available commands", "system")
        
        # Connect to visualization
        self.loop.run_until_complete(self.connect_visualization())
        
        try:
            self.loop.run_forever()
        except Exception as e:
            self.log(f"Error in async loop: {e}", "error")
            
    def run(self):
        """Run the client"""
        try:
            self.root.mainloop()
        except KeyboardInterrupt:
            pass
        finally:
            self.loop.stop()
            
if __name__ == "__main__":
    client = HyperVoidClient()
    client.run()
