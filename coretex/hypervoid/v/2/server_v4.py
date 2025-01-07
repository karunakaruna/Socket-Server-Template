import socket
import threading
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any
import numpy as np
from quantum_crypto import QuantumState, HyperMessage
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HyperVoidServer:
    def __init__(self, host='localhost', port=8767):
        self.host = host
        self.port = port
        self.clients = {}  # addr -> (socket, username, quantum_state)
        self.running = False
        self.socket = None
        self.thread = None
        self.lock = threading.Lock()
        
    def start(self):
        """Start the server"""
        try:
            # Try to create the socket with SO_REUSEADDR option
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.socket.bind((self.host, self.port))
            self.socket.listen(5)
            self.running = True
            
            logger.info(f"Server started on {self.host}:{self.port}")
            
            while self.running:
                try:
                    client_socket, addr = self.socket.accept()
                    client_id = str(uuid.uuid4())[:8]
                    logger.info(f"New connection from {addr} (ID: {client_id})")
                    
                    # Start a new thread for each client
                    threading.Thread(
                        target=self.handle_client,
                        args=(client_socket, addr),
                        daemon=True
                    ).start()
                except socket.error as e:
                    if not self.running:
                        break
                    logger.error(f"Socket error: {e}")
                    time.sleep(1)  # Prevent tight loop on error
                    
        except Exception as e:
            logger.error(f"Server Error: {e}")
            self.running = False
            if self.socket:
                try:
                    self.socket.close()
                except:
                    pass
                    
    def send_message_to_client(self, addr, message: str):
        """Send a message to a specific client"""
        if addr in self.clients:
            try:
                self.clients[addr][0].sendall((json.dumps(message) + '\n').encode())
                logger.debug(f"Sent to {addr}: {message}")
            except Exception as e:
                logger.error(f"Error sending to {addr}: {e}")
                self.disconnect_client(addr)
                
    def broadcast_to_all(self, message: str, exclude_client: str = None):
        """Broadcast a message to all clients except the excluded one"""
        with self.lock:
            for client_id in list(self.clients.keys()):
                if client_id != exclude_client:
                    self.send_message_to_client(client_id, message)
                    
    def disconnect_client(self, addr: str):
        """Disconnect a client and clean up"""
        with self.lock:
            if addr in self.clients:
                try:
                    self.clients[addr][0].close()
                except:
                    pass
                del self.clients[addr]
                logger.info(f"Client {addr} disconnected")
                
    def handle_client(self, client_socket: socket.socket, addr: str):
        """Handle individual client connection"""
        try:
            # Initialize client's quantum state
            quantum_state = QuantumState()
            self.clients[addr] = (client_socket, None, quantum_state)
            
            # Send initial quantum state
            self.send_message_to_client(addr, {
                'command': 'quantum_state',
                'state': quantum_state.to_json()
            })
            
            while True:
                try:
                    message = client_socket.recv(4096).decode().strip()
                    if not message:
                        break
                        
                    data = json.loads(message)
                    self.handle_command(addr, data)
                    
                except ConnectionError:
                    break
                except json.JSONDecodeError:
                    error = {
                        "type": "error",
                        "message": "Invalid message format"
                    }
                    self.send_message_to_client(addr, error)
                except Exception as e:
                    error = {
                        "type": "error",
                        "message": str(e)
                    }
                    self.send_message_to_client(addr, error)
                    
        except Exception as e:
            logger.error(f"Error handling client {addr}: {e}")
        finally:
            self.disconnect_client(addr)
            
    def handle_command(self, addr: str, data: Dict[str, Any]):
        """Handle client commands"""
        client_socket, username, quantum_state = self.clients[addr]
        command = data.get('command', '')
        
        if command == 'broadcast':
            if not username:
                return self.send_error(addr, "Must set username first")
                
            message = data.get('message', '')
            # Create encrypted broadcast
            hyper_msg = HyperMessage(message, quantum_state)
            
            # Convert to quantum foam representation
            foam = hyper_msg.to_quantum_foam()
            
            # Broadcast encrypted message to all clients
            broadcast_data = {
                'type': 'quantum_message',
                'sender': addr,
                'foam': foam,
                'raw': str(hyper_msg)
            }
            
            logger.info(f"Broadcasting quantum foam: {foam}")
            self.broadcast_to_all(json.dumps(broadcast_data), exclude_client=addr)
            
        elif command == 'update_quantum':
            # Update client's quantum state
            new_state = QuantumState.from_json(data.get('state', '{}'))
            self.clients[addr] = (client_socket, username, new_state)
            
            # Notify other clients about potential new decryption possibilities
            self.broadcast_quantum_update(addr)
            
        elif command == 'username':
            username = data.get('username', '')
            self.clients[addr] = (client_socket, username, quantum_state)
            
    def broadcast_quantum_update(self, updated_addr: str):
        """Notify clients about quantum state changes"""
        _, username, state = self.clients[updated_addr]
        if not username:
            return
            
        for addr, (client_socket, other_username, other_state) in self.clients.items():
            if addr != updated_addr and other_username:
                alignment = abs(np.dot(
                    state.get_rotation_matrix() @ state.position,
                    other_state.get_rotation_matrix() @ other_state.position
                ))
                
                self.send_message_to_client(addr, {
                    'command': 'quantum_alignment',
                    'username': username,
                    'alignment': float(alignment)
                })
                
    def send_error(self, addr: str, message: str):
        error = {
            "type": "error",
            "message": message
        }
        self.send_message_to_client(addr, error)
        
    def stop(self):
        """Stop the server"""
        self.running = False
        try:
            # Create a temporary connection to unblock accept()
            socket.create_connection((self.host, self.port))
        except:
            pass
            
        # Close all client connections
        with self.lock:
            for client_socket, _, _ in self.clients.values():
                try:
                    client_socket.close()
                except:
                    pass
            self.clients.clear()
            
        try:
            self.socket.close()
        except:
            pass

def main():
    server = HyperVoidServer()
    try:
        server.start()
    except KeyboardInterrupt:
        logger.info("Server shutting down...")
    finally:
        server.stop()
        logger.info("Server stopped")

if __name__ == '__main__':
    main()
