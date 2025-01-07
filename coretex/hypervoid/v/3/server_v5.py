import socket
import threading
import json
import logging
import time
from quantum_crypto import QuantumState

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HyperVoidServer:
    def __init__(self, host='localhost', port=8767):
        self.host = host
        self.port = port
        self.socket = None
        self.clients = {}  # addr -> (socket, username, quantum_state)
        self.running = False
        self.lock = threading.Lock()
        
    def start(self):
        """Start the server"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.socket.bind((self.host, self.port))
            self.socket.listen(5)
            self.running = True
            
            logger.info(f"Server started on {self.host}:{self.port}")
            
            while self.running:
                try:
                    client_socket, addr = self.socket.accept()
                    threading.Thread(
                        target=self.handle_client,
                        args=(client_socket, addr),
                        daemon=True
                    ).start()
                except Exception as e:
                    logger.error(f"Error accepting client: {e}")
                    
        except Exception as e:
            logger.error(f"Server error: {e}")
        finally:
            self.stop()
            
    def broadcast_client_list(self):
        """Broadcast list of connected clients and their quantum states"""
        client_states = {}
        for addr, client_info in self.clients.items():
            if isinstance(client_info, tuple) and len(client_info) > 2:
                _, username, state = client_info
                client_states[username] = {
                    'state': state.to_json(),
                    'foam': state.foam.get_foam(state)
                }
                
        broadcast_data = {
            'type': 'client_list',
            'clients': client_states
        }
        self.broadcast_message(json.dumps(broadcast_data))
        
    def handle_client(self, client_socket, addr):
        """Handle client connection"""
        try:
            logger.info(f"New connection from {addr}")
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
                            self.clients[addr] = (client_socket, username, QuantumState())
                            logger.info(f"Client {username} registered")
                            self.broadcast_client_list()
                            
                        elif command == 'message':
                            if addr in self.clients:
                                _, username, state = self.clients[addr]
                                broadcast_data = {
                                    'type': 'quantum_message',
                                    'sender': username,
                                    'encrypted': message_data.get('encrypted'),
                                    'timestamp': time.time()
                                }
                                self.broadcast_message(json.dumps(broadcast_data))
                                
                        elif command == 'tune':
                            if addr in self.clients and len(message_data.get('args', [])) > 0:
                                try:
                                    socket, username, state = self.clients[addr]
                                    new_radius = float(message_data['args'][0])
                                    state.tune(new_radius)
                                    self.broadcast_client_list()
                                except:
                                    pass
                                    
                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON from {addr}: {message}")
                        
        except Exception as e:
            logger.error(f"Error handling client {addr}: {e}")
        finally:
            self.disconnect_client(addr)
            
    def broadcast_message(self, message: str):
        """Broadcast message to all clients"""
        with self.lock:
            for addr, (client_socket, _, _) in list(self.clients.items()):
                try:
                    client_socket.send(message.encode() + b'\n')
                except:
                    self.disconnect_client(addr)
                    
    def disconnect_client(self, addr):
        """Disconnect a client"""
        with self.lock:
            if addr in self.clients:
                client_socket, username, _ = self.clients[addr]
                try:
                    client_socket.close()
                except:
                    pass
                del self.clients[addr]
                logger.info(f"Client {username} disconnected")
                self.broadcast_client_list()
                
    def stop(self):
        """Stop the server"""
        self.running = False
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
            
if __name__ == '__main__':
    server = HyperVoidServer()
    server.start()
