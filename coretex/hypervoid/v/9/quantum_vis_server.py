import http.server
import socketserver
import json
import numpy as np
import os
import logging
import argparse
from http.server import SimpleHTTPRequestHandler
from quantum_crypto import QuantumState

logging.basicConfig(level=logging.DEBUG)

class QuantumVisHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        """Initialize quantum visualization handler"""
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)
        
    def log_message(self, format, *args):
        """Log with quantum timestamp"""
        logging.info("%s - - [%s] %s" % (
            self.address_string(),
            self.log_date_time_string(),
            format%args))
            
    def end_headers(self):
        """Add quantum security headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('X-Quantum-Security', 'sp³-hybridized')
        super().end_headers()
        
    def do_GET(self):
        """Handle GET with quantum foam visualization"""
        if self.path == '/quantum_foam':
            try:
                # Generate quantum foam visualization
                state = QuantumState()
                foam = state.get_foam()
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                
                response = {
                    'foam': foam.tolist(),
                    'dimensions': foam.shape,
                    'hybridization': 'sp³',
                    'angle': 104.5
                }
                self.wfile.write(json.dumps(response).encode())
                return
                
        return super().do_GET()

def start_server(port: int) -> None:
    """Start quantum visualization server"""
    try:
        with socketserver.TCPServer(("", port), QuantumVisHandler) as httpd:
            logging.info(f"Quantum visualization server running at http://localhost:{port}")
            httpd.serve_forever()
    except Exception as e:
        logging.error(f"Server failed to start: {e}")
        raise

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, required=True)
    args = parser.parse_args()
    
    try:
        start_server(args.port)
    except KeyboardInterrupt:
        logging.info("Server stopped by user")
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        raise

if __name__ == "__main__":
    main()
