import socket
import threading
import json
import logging
import time
import numpy as np
from typing import Dict, Tuple, Optional
from quantum_crypto_v9 import QuantumState, HyperMessage
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HyperVoidServer:
    """Enhanced HyperVoid server with quantum encryption"""
    def __init__(self, host: str = 'localhost', port: int = 8767):
        self.host = host
        self.port = port
        self.socket: Optional[socket.socket] = None
        self.clients: Dict[Tuple[str, int], Tuple[socket.socket, str, QuantumState]] = {}
        self.running = False
        self.lock = threading.Lock()
        self.quantum_state = QuantumState()  # Server's quantum state
        
    def start(self):
        """Start the quantum-enabled server with error recovery"""
        while True:
            try:
                if self.socket:
                    self.socket.close()
                    
                self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                self.socket.bind((self.host, self.port))
                self.socket.listen(5)
                self.running = True
                
                logger.info(f"Quantum HyperVoid Server started on {self.host}:{self.port}")
                logger.info(f"Server Quantum State: {self.quantum_state.foam.get_foam()}")
                
                # Start quantum state evolution
                self.quantum_thread = threading.Thread(
                    target=self._evolve_quantum_state, 
                    daemon=True
                )
                self.quantum_thread.start()
                
                while self.running:
                    try:
                        client_socket, addr = self.socket.accept()
                        client_thread = threading.Thread(
                            target=self.handle_client,
                            args=(client_socket, addr),
                            daemon=True
                        )
                        client_thread.start()
                    except Exception as e:
                        logger.error(f"Error accepting client: {e}")
                        if not self.running:
                            break
                        continue
                        
            except Exception as e:
                logger.error(f"Server error: {e}")
                if self.running:
                    logger.info("Attempting server restart in 5 seconds...")
                    time.sleep(5)
                    continue
                break
                
        self.stop()
            
    def _evolve_quantum_state(self):
        """Continuously evolve server's quantum state"""
        while self.running:
            self.quantum_state.foam.evolve()
            time.sleep(0.1)  # Evolution rate
            
    def broadcast_quantum_states(self):
        """Broadcast quantum states of all connected clients"""
        quantum_states = {}
        for addr, client_info in self.clients.items():
            if isinstance(client_info, tuple) and len(client_info) > 2:
                _, username, state = client_info
                quantum_states[username] = {
                    'state': state.to_json(),
                    'foam': state.foam.get_foam(state)
                }
                
        broadcast_data = {
            'type': 'quantum_states',
            'states': quantum_states,
            'server_state': {
                'state': self.quantum_state.to_json(),
                'foam': self.quantum_state.foam.get_foam()
            }
        }
        self.broadcast_message(json.dumps(broadcast_data))
        
    def handle_client(self, client_socket: socket.socket, addr: Tuple[str, int]):
        """Handle client connection with quantum encryption"""
        try:
            logger.info(f"New quantum connection from {addr}")
            buffer = ""
            
            while True:
                data = client_socket.recv(4096).decode()
                if not data:
                    break
                    
                buffer += data
                while '\n' in buffer:
                    message, buffer = buffer.split('\n', 1)
                    try:
                        message_data = json.loads(message)
                        command = message_data.get('command', '')
                        
                        if command == 'username':
                            username = message_data.get('username', f'User_{len(self.clients)}')
                            # Create unique quantum state for client
                            client_state = QuantumState()
                            self.clients[addr] = (client_socket, username, client_state)
                            logger.info(f"Client {username} registered with quantum state")
                            # Send quantum handshake
                            self._send_quantum_handshake(client_socket, client_state)
                            self.broadcast_quantum_states()
                            
                        elif command == 'message':
                            if addr in self.clients:
                                _, username, state = self.clients[addr]
                                # Create quantum encrypted message
                                encrypted_msg = HyperMessage(
                                    message_data.get('content', ''),
                                    state
                                )
                                broadcast_data = {
                                    'type': 'quantum_message',
                                    'sender': username,
                                    'encrypted_data': encrypted_msg.to_json(),
                                    'timestamp': time.time()
                                }
                                self.broadcast_message(json.dumps(broadcast_data))
                                
                        elif command == 'quantum_sync':
                            if addr in self.clients:
                                _, username, state = self.clients[addr]
                                # Update client's quantum state
                                new_state = QuantumState.from_json(
                                    message_data.get('state', {})
                                )
                                state.update_entanglement(new_state)
                                self.broadcast_quantum_states()
                                
                    except json.JSONDecodeError as e:
                        logger.error(f"JSON decode error: {e}")
                    except Exception as e:
                        logger.error(f"Message handling error: {e}")
                        
        except Exception as e:
            logger.error(f"Client handler error: {e}")
        finally:
            self._handle_client_disconnect(addr)
            
    def _send_quantum_handshake(self, client_socket: socket.socket, 
                               client_state: QuantumState):
        """Send quantum handshake to new client"""
        try:
            handshake_data = {
                'type': 'quantum_handshake',
                'server_state': self.quantum_state.to_json(),
                'client_state': client_state.to_json()
            }
            client_socket.send((json.dumps(handshake_data) + '\n').encode())
        except Exception as e:
            logger.error(f"Quantum handshake error: {e}")
            
    def _handle_client_disconnect(self, addr: Tuple[str, int]):
        """Handle client disconnection with cleanup"""
        with self.lock:
            if addr in self.clients:
                _, username, _ = self.clients[addr]
                try:
                    client_socket = self.clients[addr][0]
                    client_socket.close()
                except:
                    pass
                logger.info(f"Client {username} disconnected")
                del self.clients[addr]
                self.broadcast_quantum_states()
                
    def broadcast_message(self, message: str):
        """Broadcast message to all connected clients with error handling"""
        with self.lock:
            disconnected = []
            for addr, (client_socket, username, _) in self.clients.items():
                try:
                    client_socket.send((message + '\n').encode())
                except Exception as e:
                    logger.error(f"Failed to send to {username}: {e}")
                    disconnected.append(addr)
                    
            # Clean up disconnected clients
            for addr in disconnected:
                self._handle_client_disconnect(addr)
                
    def stop(self):
        """Stop the quantum server"""
        self.running = False
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
            
if __name__ == '__main__':
    import signal
    
    def signal_handler(sig, frame):
        print("\nShutting down quantum server...")
        if 'server' in locals():
            server.stop()
        sys.exit(0)
        
    signal.signal(signal.SIGINT, signal_handler)
    
    server = HyperVoidServer()
    try:
        server.start()
    except KeyboardInterrupt:
        pass
    finally:
        server.stop()
