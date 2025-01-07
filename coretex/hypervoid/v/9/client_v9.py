import socket
import threading
import json
import time
import logging
import numpy as np
from typing import Dict, Optional, List
from quantum_crypto_v9 import QuantumState, HyperMessage

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HyperVoidClient:
    """Enhanced HyperVoid client with quantum encryption"""
    def __init__(self, host: str = 'localhost', port: int = 8767):
        self.host = host
        self.port = port
        self.socket: Optional[socket.socket] = None
        self.running = False
        self.quantum_state = QuantumState()  # Client's quantum state
        self.server_state: Optional[QuantumState] = None
        self.peers: Dict[str, QuantumState] = {}  # username -> quantum state
        self.message_handlers: List[callable] = []
        self.username = ""
        
    def connect(self, username: str):
        """Connect to server with quantum handshake and auto-reconnect"""
        self.username = username
        while True:
            try:
                if self.socket:
                    self.socket.close()
                    
                self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.socket.connect((self.host, self.port))
                self.running = True
                
                # Start receiver thread
                self.receiver_thread = threading.Thread(
                    target=self._receive_messages, 
                    daemon=True
                )
                self.receiver_thread.start()
                
                # Start quantum evolution thread
                self.quantum_thread = threading.Thread(
                    target=self._evolve_quantum_state, 
                    daemon=True
                )
                self.quantum_thread.start()
                
                # Send username and initiate quantum handshake
                self.send_message({
                    'command': 'username',
                    'username': username
                })
                
                logger.info(f"Connected to quantum server as {username}")
                logger.info(f"Client Quantum State: {self.quantum_state.foam.get_foam()}")
                break
                
            except Exception as e:
                logger.error(f"Connection error: {e}")
                time.sleep(5)  # Wait before retrying
                continue
                
    def _evolve_quantum_state(self):
        """Continuously evolve client's quantum state"""
        while self.running:
            self.quantum_state.foam.evolve()
            # Sync quantum state with server periodically
            if self.server_state:
                self.quantum_state.update_entanglement(self.server_state)
                self.send_message({
                    'command': 'quantum_sync',
                    'state': self.quantum_state.to_json()
                })
            time.sleep(0.1)  # Evolution rate
            
    def send_message(self, message_data: Dict):
        """Send quantum encrypted message"""
        try:
            if self.socket and self.running:
                self.socket.send((json.dumps(message_data) + '\n').encode())
        except Exception as e:
            logger.error(f"Send error: {e}")
            self.disconnect()
            
    def send_chat_message(self, content: str):
        """Send encrypted chat message"""
        try:
            # Create quantum encrypted message
            message = {
                'command': 'message',
                'content': content,
                'timestamp': time.time()
            }
            self.send_message(message)
        except Exception as e:
            logger.error(f"Chat message error: {e}")
            
    def _receive_messages(self):
        """Receive and process quantum encrypted messages with error recovery"""
        buffer = ""
        while self.running:
            try:
                data = self.socket.recv(4096).decode()
                if not data:
                    raise ConnectionError("Server disconnected")
                    
                buffer += data
                while '\n' in buffer:
                    message, buffer = buffer.split('\n', 1)
                    try:
                        message_data = json.loads(message)
                        self._handle_message(message_data)
                    except json.JSONDecodeError as e:
                        logger.error(f"JSON decode error: {e}")
                        continue
                    except Exception as e:
                        logger.error(f"Message handling error: {e}")
                        continue
                        
            except Exception as e:
                logger.error(f"Receive error: {e}")
                if self.running:
                    self.reconnect()
                break
                
    def reconnect(self):
        """Attempt to reconnect to the server"""
        logger.info("Attempting to reconnect...")
        self.running = False
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
        self.socket = None
        self.server_state = None
        self.peers.clear()
        time.sleep(5)  # Wait before reconnecting
        self.connect(self.username)
        
    def _handle_message(self, message_data: Dict):
        """Handle different types of quantum messages"""
        try:
            message_type = message_data.get('type', '')
            
            if message_type == 'quantum_handshake':
                # Process quantum handshake
                self.server_state = QuantumState.from_json(
                    message_data['server_state']
                )
                client_state = QuantumState.from_json(
                    message_data['client_state']
                )
                self.quantum_state.update_entanglement(client_state)
                logger.info("Quantum handshake completed")
                
            elif message_type == 'quantum_states':
                # Update peer quantum states
                states = message_data.get('states', {})
                self.peers.clear()
                for username, state_data in states.items():
                    if username != self.username:
                        self.peers[username] = QuantumState.from_json(
                            state_data['state']
                        )
                # Update server state
                server_data = message_data.get('server_state', {})
                if server_data:
                    self.server_state = QuantumState.from_json(server_data['state'])
                    
            elif message_type == 'quantum_message':
                # Process encrypted message
                sender = message_data.get('sender', '')
                if sender != self.username:
                    encrypted_data = message_data.get('encrypted_data', {})
                    if encrypted_data:
                        # Decrypt message using quantum state
                        message = HyperMessage.from_json(
                            encrypted_data,
                            self.quantum_state
                        )
                        decrypted = message.decrypt(self.quantum_state)
                        if decrypted:
                            # Notify message handlers
                            for handler in self.message_handlers:
                                handler(sender, decrypted)
                        else:
                            logger.warning(
                                f"Could not decrypt message from {sender} - "
                                "insufficient quantum alignment"
                            )
                            
        except Exception as e:
            logger.error(f"Message handling error: {e}")
            
    def add_message_handler(self, handler: callable):
        """Add message handler callback"""
        self.message_handlers.append(handler)
        
    def disconnect(self):
        """Disconnect from quantum server"""
        self.running = False
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
        self.socket = None
        self.server_state = None
        self.peers.clear()
        
def print_message(sender: str, content: str):
    """Simple message handler that prints to console"""
    print(f"{sender}: {content}")
    
if __name__ == '__main__':
    import sys
    import signal
    
    def signal_handler(sig, frame):
        print("\nDisconnecting from quantum network...")
        if 'client' in locals():
            client.disconnect()
        sys.exit(0)
        
    signal.signal(signal.SIGINT, signal_handler)
    
    if len(sys.argv) != 2:
        print("Usage: python client_v9.py <username>")
        sys.exit(1)
        
    username = sys.argv[1]
    client = HyperVoidClient()
    client.add_message_handler(print_message)
    
    try:
        client.connect(username)
        while True:
            try:
                message = input()
                if message.lower() == 'quit':
                    break
                client.send_chat_message(message)
            except EOFError:
                continue  # Handle EOF gracefully
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f"Input error: {e}")
                continue
    except KeyboardInterrupt:
        pass
    finally:
        client.disconnect()
