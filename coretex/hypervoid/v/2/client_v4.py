import socket
import threading
import json
import logging
from datetime import datetime
from queue import Queue
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
    def __init__(self, host='localhost', port=8767):
        self.host = host
        self.port = port
        self.socket = None
        self.running = False
        self.message_queue = Queue()
        self.quantum_state = QuantumState()
        self.encrypted_messages = {}  # Store encrypted messages for later decryption
        self.alignments = {}  # Track quantum alignments with other users
        self.reconnect_delay = 1
        self.max_reconnect_delay = 30
        
    def __del__(self):
        self.stop()
        
    def connect(self):
        """Connect to the server"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.host, self.port))
            logger.info(f"Connected to {self.host}:{self.port}")
            
            # Send initial username
            self.socket.sendall(json.dumps({
                'command': 'username',
                'username': f'User_{uuid.uuid4().hex[:4]}'
            }).encode() + b'\n')
            
            self.reconnect_delay = 1  # Reset delay on successful connection
            return True
        except Exception as e:
            logger.error(f"Connection error: {e}")
            return False
            
    def reconnect(self):
        """Attempt to reconnect to the server"""
        logger.info("Attempting to reconnect...")
        while self.running:
            if self.connect():
                print("\nReconnected successfully!")
                return True
            print(f"\nReconnection failed, waiting {self.reconnect_delay} seconds...")
            threading.Event().wait(self.reconnect_delay)
            self.reconnect_delay = min(self.reconnect_delay * 2, self.max_reconnect_delay)
        return False
        
    def start(self):
        """Start the client"""
        if not self.connect():
            return False
            
        self.running = True
        
        # Send help command on startup
        self.send_message("/help")
        
        # Start receive thread
        threading.Thread(target=self.receive_messages, daemon=True).start()
        
        # Start input thread
        threading.Thread(target=self.handle_input, daemon=True).start()
        
        return True
        
    def handle_input(self):
        """Handle user input"""
        while self.running:
            try:
                message = input()
                if message.lower() == '/quit':
                    self.running = False
                    break
                elif message.lower() == '/reconnect':
                    if self.reconnect():
                        logger.info("Reconnected successfully")
                    else:
                        logger.error("Failed to reconnect")
                else:
                    self.send_message(message)
            except Exception as e:
                logger.error(f"Error handling input: {e}")
                if not self.reconnect():
                    break
                    
    def receive_messages(self):
        """Handle server messages"""
        while self.running:
            try:
                data = b''
                while self.running:
                    chunk = self.socket.recv(4096)
                    if not chunk:
                        break
                    data += chunk
                    if b'\n' in chunk:
                        break
                        
                if not data:
                    logger.info("Server closed connection")
                    if not self.reconnect():
                        break
                    continue
                    
                messages = data.decode().strip().split('\n')
                for message in messages:
                    try:
                        # Try to parse as JSON
                        data = json.loads(message)
                        self.handle_message(data)
                    except json.JSONDecodeError:
                        print(f"\nServer: {message}")
                        
            except Exception as e:
                logger.error(f"Error handling output: {e}")
                if not self.reconnect():
                    break
                    
    def handle_message(self, data):
        """Handle incoming messages"""
        command = data.get('command', '')
        
        if command == 'quantum_state':
            # Initialize our quantum state
            self.quantum_state = QuantumState.from_json(data['state'])
            print("\n🔮 Quantum state initialized!")
            
        elif command == 'message':
            username = data.get('username', '')
            message = data.get('message', '')
            encrypted = data.get('encrypted', False)
            
            if encrypted:
                # Store encrypted message
                try:
                    hyper_msg = HyperMessage.from_json(message)
                    self.encrypted_messages[username] = hyper_msg
                    print(f"\n🔒 Encrypted message from {username} (align quantum states to decrypt)")
                except:
                    print(f"\n❌ Error: Could not parse encrypted message from {username}")
            else:
                # Display decrypted message
                print(f"\n💬 {username}: {message}")
                
        elif command == 'quantum_alignment':
            username = data.get('username', '')
            alignment = data.get('alignment', 0.0)
            old_alignment = self.alignments.get(username, 0.0)
            self.alignments[username] = alignment
            
            # Try to decrypt any stored messages if alignment improved
            if alignment > old_alignment and username in self.encrypted_messages:
                hyper_msg = self.encrypted_messages[username]
                decrypted = hyper_msg.decrypt(self.quantum_state)
                if decrypted:
                    print(f"\n🔓 Decrypted message from {username}: {decrypted}")
                    del self.encrypted_messages[username]
            
            # Show alignment status
            status = "✨" if alignment > 0.95 else "⚡" if alignment > 0.7 else "💫"
            print(f"\n{status} Quantum alignment with {username}: {alignment:.2%}")
            
        elif command == 'system':
            print(f"\nSystem: {data['message']}")
            
        elif command == 'broadcast':
            print(f"\n{data['client_id']}: {data['message']}")
            
        elif command == 'whisper':
            print(f"\n[Whisper from {data['from']}]: {data['message']}")
            
        elif command == 'error':
            print(f"\nError: {data['message']}")
            
        elif command == 'help':
            print("\nAvailable commands:")
            for cmd, desc in data['commands'].items():
                print(f"/{cmd}: {desc}")
                
        elif command == 'echo':
            print(f"\nYou: {data['message']}")
            
        elif command == 'client_list':
            print("\nConnected clients:")
            for client in data['clients']:
                print(f"- {client}")
                
    def update_quantum_state(self, rotations):
        """Update quantum state with new rotations"""
        if self.quantum_state:
            self.quantum_state.rotate(np.array(rotations))
            self.socket.sendall(json.dumps({
                'command': 'update_quantum',
                'state': self.quantum_state.to_json()
            }).encode() + b'\n')
            
    def send_message(self, message: str):
        """Send a message"""
        try:
            if message.startswith('/'):
                # Handle commands
                cmd_parts = message[1:].split()
                command = cmd_parts[0]
                
                if command == 'help':
                    self.message_queue.put("""
Available commands:
/help - Show this help
/state - Show your quantum state
/align <user> - Try to align with another user
/whisper <user> <message> - Send private message
""")
                elif command == 'state':
                    self.message_queue.put(f"Your quantum state:\n{json.dumps(self.quantum_state.to_json(), indent=2)}")
                    
            else:
                # Regular message - encrypt with quantum state
                data = {
                    'command': 'message',
                    'content': message
                }
                self.socket.sendall(json.dumps(data).encode() + b'\n')
                
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            
    def handle_server_message(self, data):
        """Handle incoming server message"""
        try:
            if isinstance(data, dict):
                msg_type = data.get('type', '')
                
                if msg_type == 'quantum_message':
                    sender = data.get('sender', 'Unknown')
                    foam = data.get('foam', '')
                    
                    # Try to decrypt if we have alignment
                    try:
                        msg = HyperMessage.from_json(data.get('encrypted', {}))
                        decrypted = msg.decrypt(self.quantum_state) if msg else None
                        
                        # Format message with quantum foam
                        foam_line = "▂" * 40  # Separator line
                        timestamp = time.strftime("%H:%M:%S", time.localtime(msg.timestamp))
                        
                        if decrypted:
                            self.message_queue.put(f"\n{foam_line}")
                            self.message_queue.put(f"[{timestamp}] {sender} (ALIGNED)")
                            self.message_queue.put(f"{decrypted}")
                            self.message_queue.put(f"{foam_line}\n")
                        else:
                            # Show quantum foam with phase difference
                            alignment = self.quantum_state.alignment_with(msg.quantum_state)
                            phase_bar = "▁▂▃▄▅▆▇█"[int(alignment * 8)]  # Phase indicator
                            foam_vis = msg.to_quantum_foam()  # Get fresh foam for this view
                            
                            self.message_queue.put(f"\n{foam_line}")
                            self.message_queue.put(f"[{timestamp}] {sender} (PHASE: {phase_bar})")
                            self.message_queue.put(f"{foam_vis}")
                            self.message_queue.put(f"{foam_line}\n")
                            
                    except Exception as e:
                        # Show raw quantum noise for completely unaligned messages
                        noise = "".join(random.choice("▀▄█▌▐░▒▓■□") for _ in range(40))
                        self.message_queue.put(f"\n{foam_line}")
                        self.message_queue.put(f"[QUANTUM NOISE] {noise}")
                        self.message_queue.put(f"{foam_line}\n")
                        
                elif msg_type == 'client_list':
                    clients = data.get('clients', {})
                    if clients:
                        self.message_queue.put("\n=== Quantum Network Status ===")
                        for username, info in clients.items():
                            if info['state']:
                                their_state = QuantumState.from_json(info['state'])
                                alignment = self.quantum_state.alignment_with(their_state)
                                phase = "▁▂▃▄▅▆▇█"[int(alignment * 8)]
                                foam = their_state.to_quantum_foam()
                                self.message_queue.put(f"{phase} {username}: {foam}")
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
            try:
                self.socket.close()
            except:
                pass

def main():
    client = HyperVoidClient()
    try:
        client.start()
    except KeyboardInterrupt:
        logger.info("Client shutting down...")
    finally:
        client.stop()
        logger.info("Client stopped")

if __name__ == '__main__':
    main()
