import socket
import json
import threading
import queue
import logging
import tkinter as tk
from tkinter import ttk
from tkinter.scrolledtext import ScrolledText
import numpy as np
from quantum_crypto import QuantumState, HyperMessage
import uuid
import time
import random

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HyperVoidClient:
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.socket = None
        self.running = False
        self.message_queue = queue.Queue()
        self.quantum_state = QuantumState()
        self.username = f"User_{uuid.uuid4().hex[:8]}"
        self.other_users = {}
        
    def start(self):
        """Start the client"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.host, self.port))
            self.running = True
            
            # Start receiver thread
            threading.Thread(target=self._receive_messages, daemon=True).start()
            
            # Register username
            self.send_message("/username " + self.username)
            
            return True
        except Exception as e:
            logger.error(f"Failed to start client: {e}")
            return False
            
    def _receive_messages(self):
        """Receive messages from server"""
        try:
            buffer = ""
            while self.running:
                data = self.socket.recv(4096).decode()
                if not data:
                    break
                    
                buffer += data
                while '\n' in buffer:
                    message, buffer = buffer.split('\n', 1)
                    try:
                        msg_data = json.loads(message)
                        self.handle_server_message(msg_data)
                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON: {message}")
                        
        except Exception as e:
            logger.error(f"Error receiving messages: {e}")
        finally:
            self.running = False
            
    def send_message(self, message):
        """Send message to server"""
        try:
            if message.startswith('/'):
                # Handle commands
                cmd_parts = message[1:].split()
                command = cmd_parts[0]
                
                if command == 'help':
                    help_text = """
Available commands:
/help - Show this help
/state - Show your quantum state
/tune <value> - Tune your hyperradius (0.1-2.0)
/align <user> - Try to align with another user
/whisper <user> <message> - Send private message
"""
                    self.message_queue.put(help_text)
                    
                elif command == 'state':
                    state_info = f"""
Your Quantum State:
Position: {self.quantum_state.position}
Hyperradius: {self.quantum_state.hyperradius:.2f}
Phase: {self.quantum_state.phase:.2f}
"""
                    self.message_queue.put(state_info)
                    
                elif command == 'tune' and len(cmd_parts) > 1:
                    try:
                        new_radius = float(cmd_parts[1])
                        self.quantum_state.tune(new_radius)
                        self.message_queue.put(f"Tuned hyperradius to {self.quantum_state.hyperradius:.2f}")
                    except:
                        self.message_queue.put("Invalid hyperradius value (use 0.1-2.0)")
                        
                else:
                    # Send command to server
                    data = {
                        'command': command,
                        'args': cmd_parts[1:],
                        'state': self.quantum_state.to_json()
                    }
                    self.socket.send(json.dumps(data).encode() + b'\n')
                    
            else:
                # Regular message
                msg = HyperMessage(message, self.quantum_state)
                data = {
                    'command': 'message',
                    'content': message,
                    'encrypted': msg.to_json()
                }
                self.socket.send(json.dumps(data).encode() + b'\n')
                
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            self.message_queue.put(f"Failed to send message: {e}")
            
    def handle_server_message(self, data):
        """Handle incoming server message"""
        try:
            if isinstance(data, dict):
                msg_type = data.get('type', '')
                
                if msg_type == 'quantum_message':
                    sender = data.get('sender', 'Unknown')
                    
                    try:
                        msg = HyperMessage.from_json(data.get('encrypted', {}))
                        decrypted = msg.decrypt(self.quantum_state) if msg else None
                        
                        # Format message with evolving quantum foam
                        foam_line = self.quantum_state.foam.get_foam()  # Get fresh foam for border
                        timestamp = time.strftime("%H:%M:%S", time.localtime(msg.timestamp))
                        
                        if decrypted:
                            self.message_queue.put(f"\n{foam_line}")
                            self.message_queue.put(f"[{timestamp}] {sender} (ALIGNED)")
                            self.message_queue.put(f"{decrypted}")
                            self.message_queue.put(f"{foam_line}\n")
                        else:
                            # Show quantum foam with phase difference
                            alignment = self.quantum_state.alignment_with(msg.quantum_state)
                            phase_bar = "▁▂▃▄▅▆▇█"[int(alignment * 8)]
                            
                            # Generate unique foam for this view
                            view_foam = self.quantum_state.foam.get_foam(
                                msg.quantum_state,
                                int(time.time() * 100)  # Changes every 10ms
                            )
                            
                            self.message_queue.put(f"\n{foam_line}")
                            self.message_queue.put(
                                f"[{timestamp}] {sender} "
                                f"(PHASE: {phase_bar} | RADIUS: {msg.quantum_state.hyperradius:.1f})"
                            )
                            self.message_queue.put(f"{view_foam}")
                            self.message_queue.put(f"{foam_line}\n")
                            
                    except Exception as e:
                        # Show deep quantum noise for corrupted messages
                        noise = self.quantum_state.foam.get_foam(
                            message_hash=random.randint(0, 1000000)
                        )
                        self.message_queue.put(f"\n{'▂' * 40}")
                        self.message_queue.put(f"[QUANTUM NOISE] {noise}")
                        self.message_queue.put(f"{'▂' * 40}\n")
                        
                elif msg_type == 'client_list':
                    # Update quantum HUD when client list changes
                    self.update_client_states(data.get('clients', {}))
                    self.update_quantum_hud()
                    
                elif msg_type == 'system':
                    self.message_queue.put(f"[SYSTEM] {data.get('message', '')}")
                    
        except Exception as e:
            logger.error(f"Error handling server message: {e}")
            self.message_queue.put(f"[ERROR] Failed to process quantum message: {e}")
            
    def project_4d_to_3d(self, pos_4d):
        """Project 4D point to 3D space using w as intensity"""
        x, y, z, w = pos_4d
        # Scale to fit ASCII grid
        scale = 10
        x = int((x + 2) * scale / 4)  # Map [-2,2] to [0,10]
        y = int((y + 2) * scale / 4)
        z = int((z + 2) * scale / 4)
        # Normalize w to [0,1] for intensity
        w = (w + 2) / 4
        return x, y, z, w

    def render_3d_grid(self):
        """Render 3D grid with all users"""
        grid_size = 11  # 0-10 for each axis
        # Characters for different intensities (w dimension)
        chars = " .:-=+*#@"  
        
        # Create empty 3D grid
        grid = [[[' ' for _ in range(grid_size)] 
                for _ in range(grid_size)] 
                for _ in range(grid_size)]
        
        # Plot all users
        all_users = {'YOU': self.quantum_state}
        all_users.update(self.other_users)
        
        for name, state in all_users.items():
            x, y, z, w = self.project_4d_to_3d(state.position)
            if 0 <= x < grid_size and 0 <= y < grid_size and 0 <= z < grid_size:
                # Use w to determine intensity
                char_idx = min(int(w * len(chars)), len(chars) - 1)
                grid[z][y][x] = chars[char_idx]
                
        # Render the grid with perspective
        hud = "\n=== Quantum Space Map ===\n"
        
        # Top-down view (X-Y plane)
        hud += "Top View (X-Y):\n"
        hud += "   " + "".join(f"{i:2}" for i in range(grid_size)) + "\n"
        for y in range(grid_size):
            hud += f"{y:2} "
            for x in range(grid_size):
                # Combine all Z layers with perspective
                chars_in_column = [grid[z][y][x] for z in range(grid_size)]
                visible_char = next((c for c in reversed(chars_in_column) if c != ' '), '·')
                hud += f"{visible_char} "
            hud += "\n"
            
        # Front view (X-Z plane)
        hud += "\nFront View (X-Z):\n"
        hud += "   " + "".join(f"{i:2}" for i in range(grid_size)) + "\n"
        for z in range(grid_size):
            hud += f"{z:2} "
            for x in range(grid_size):
                # Combine all Y layers with perspective
                chars_in_column = [grid[z][y][x] for y in range(grid_size)]
                visible_char = next((c for c in reversed(chars_in_column) if c != ' '), '·')
                hud += f"{visible_char} "
            hud += "\n"
            
        return hud
        
    def update_client_states(self, clients):
        """Update client states"""
        self.other_users = {}
        for username, info in clients.items():
            if info['state']:
                self.other_users[username] = QuantumState.from_json(info['state'])
                
    def update_quantum_hud(self):
        """Update quantum HUD with user positions and alignment"""
        # Previous coordinate display
        hud = "\n=== Quantum Network Status ===\n"
        x,y,z,w = self.quantum_state.position
        hud += f"YOU  [{x:.1f}, {y:.1f}, {z:.1f}, {w:.1f}] | RADIUS: {self.quantum_state.hyperradius:.1f}\n"
        
        for username, state in self.other_users.items():
            dist = np.linalg.norm(self.quantum_state.position - state.position)
            alignment = self.quantum_state.alignment_with(state)
            align_bar = "▁▂▃▄▅▆▇█"[int(alignment * 8)]
            
            x,y,z,w = state.position
            hud += f"{username} [{x:.1f}, {y:.1f}, {z:.1f}, {w:.1f}] "
            hud += f"| DIST: {dist:.1f} | ALIGN: {align_bar}\n"
            
        # Add 3D visualization
        hud += "\n" + self.render_3d_grid()
        
        # Add quantum foam border
        foam = self.quantum_state.foam.get_foam()
        hud += "\n" + foam + "\n"
        
        self.message_queue.put(hud)
        
    def stop(self):
        """Stop the client"""
        self.running = False
        if self.socket:
            self.socket.close()
