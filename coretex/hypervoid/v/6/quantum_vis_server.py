import asyncio
import websockets
import json
import numpy as np
from quantum_crypto import QuantumState
import http.server
import socketserver
import threading
import os
import socket
import sys

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', port))
            return False
        except socket.error:
            return True

class HttpHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        directory = os.path.dirname(os.path.abspath(__file__))
        super().__init__(*args, directory=directory)

    def log_message(self, format, *args):
        print("[HTTP] %s - - [%s] %s" %
            (self.address_string(),
             self.log_date_time_string(),
             format%args))

class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True

def start_http_server():
    try:
        server = ThreadedHTTPServer(('', 8770), HttpHandler)
        print("HTTP server running on http://localhost:8770")
        server.serve_forever()
    except Exception as e:
        print(f"HTTP server error: {e}")
        sys.exit(1)

class QuantumVisualizer:
    def __init__(self):
        self.quantum_state = QuantumState()
        self.connected_clients = set()

    async def handle_client(self, websocket, path):
        try:
            self.connected_clients.add(websocket)
            print(f"Client connected. Total clients: {len(self.connected_clients)}")
            
            state = self.quantum_state.get_state()
            foam = self.quantum_state.get_foam()
            await websocket.send(json.dumps({
                'type': 'state_update',
                'state': state.tolist(),
                'foam': foam.tolist()
            }))
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    if data['type'] == 'state_update':
                        self.quantum_state.set_state(data['state'])
                        state = self.quantum_state.get_state()
                        foam = self.quantum_state.get_foam()
                        update = json.dumps({
                            'type': 'state_update',
                            'state': state.tolist(),
                            'foam': foam.tolist()
                        })
                        await asyncio.gather(
                            *[client.send(update) for client in self.connected_clients]
                        )
                except json.JSONDecodeError:
                    pass
                    
        except websockets.exceptions.ConnectionClosed:
            print("Client disconnected")
        finally:
            if websocket in self.connected_clients:
                self.connected_clients.remove(websocket)
                print(f"Client removed. Total clients: {len(self.connected_clients)}")

def main():
    # Check ports
    if is_port_in_use(8770):
        print("Error: Port 8770 is already in use")
        return
    if is_port_in_use(8769):
        print("Error: Port 8769 is already in use")
        return

    # Start HTTP server
    http_thread = threading.Thread(target=start_http_server)
    http_thread.daemon = True
    http_thread.start()

    # Setup WebSocket server
    visualizer = QuantumVisualizer()
    
    loop = asyncio.get_event_loop()
    server = loop.run_until_complete(
        websockets.serve(visualizer.handle_client, 'localhost', 8769)
    )
    
    print("Visualization server running on ws://localhost:8769")
    
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        server.close()
        loop.run_until_complete(server.wait_closed())
        loop.close()

if __name__ == "__main__":
    main()
