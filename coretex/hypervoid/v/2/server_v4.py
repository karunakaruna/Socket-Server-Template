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
            while True:
                data = client_socket.recv(4096).decode().strip()
                if not data:
                    break
                    
                messages = [msg for msg in data.split('\n') if msg]
                for message in messages:
                    try:
                        message_data = json.loads(message)
                        
                        if message_data.get('command') == 'username':
                            username = message_data.get('username', f'User_{len(self.clients)}')
                            self.clients[addr] = (client_socket, username, QuantumState())
                            logger.info(f"Client {username} registered")
                            # Broadcast updated client list
                            self.broadcast_client_list()
                            
                        elif message_data.get('command') == 'message':
                            client_id = self.get_client_id(client_socket)
                            if client_id:
                                _, username, state = self.clients[addr]
                                # Create quantum encrypted message
                                hyper_msg = HyperMessage(message_data['content'], state)
                                # Broadcast with quantum foam
                                broadcast_data = {
                                    'type': 'quantum_message',
                                    'sender': username,
                                    'foam': hyper_msg.to_quantum_foam(),
                                    'encrypted': hyper_msg.to_json(),
                                    'timestamp': time.time()
                                }
                                self.broadcast_message(json.dumps(broadcast_data))
                                
                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON: {message}")
                        
        except Exception as e:
            logger.error(f"Error handling client: {e}")
        finally:
            # Remove client and broadcast updated list
            if addr in self.clients:
                client_socket, username, _ = self.clients[addr]
                del self.clients[addr]
                logger.info(f"Client {username} disconnected")
                self.broadcast_client_list()
                
    def broadcast_client_list(self):
        """Broadcast list of connected clients and their quantum states"""
        client_states = {}
        for client_id, client_info in self.clients.items():
            if isinstance(client_info, tuple) and len(client_info) > 2:
                _, username, state = client_info
                client_states[username] = {
                    'state': state.to_json() if state else None,
                    'foam': state.to_quantum_foam() if state else None
                }
        
        broadcast_data = {
            'type': 'client_list',
            'clients': client_states
        }
        self.broadcast_message(json.dumps(broadcast_data))
        
    def broadcast_message(self, message: str):
        """Broadcast a message to all clients"""
        with self.lock:
            for client_id in list(self.clients.keys()):
                self.send_message_to_client(client_id, message)
                
    def get_client_id(self, client_socket):
        """Get client ID from socket"""
        for addr, client_info in self.clients.items():
            if client_info[0] == client_socket:
                return addr
        return None
        
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
