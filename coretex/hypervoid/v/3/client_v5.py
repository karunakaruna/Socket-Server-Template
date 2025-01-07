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
                    clients = data.get('clients', {})
                    if clients:
                        self.message_queue.put("\n=== Quantum Network Status ===")
                        for username, info in clients.items():
                            if info['state']:
                                their_state = QuantumState.from_json(info['state'])
                                alignment = self.quantum_state.alignment_with(their_state)
                                phase = "▁▂▃▄▅▆▇█"[int(alignment * 8)]
                                foam = their_state.foam.get_foam(their_state)
                                radius_info = f"[r={their_state.hyperradius:.1f}]"
                                self.message_queue.put(f"{phase} {username} {radius_info}: {foam}")
                        self.message_queue.put("============================\n")
                        
                elif msg_type == 'system':
                    self.message_queue.put(f"[SYSTEM] {data.get('message', '')}")
                    
        except Exception as e:
            logger.error(f"Error handling server message: {e}")
            self.message_queue.put(f"[ERROR] Failed to process quantum message: {e}")
            
    def stop(self):
        """Stop the client"""
        self.running = False
        if self.socket:
            self.socket.close()
