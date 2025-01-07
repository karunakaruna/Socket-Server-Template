import http.server
import socketserver
import os
import logging
import threading
from http.server import SimpleHTTPRequestHandler
import socket

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler()]
)

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', port))
            return False
        except socket.error:
            return True

class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)
        
    def log_message(self, format, *args):
        logging.info("%s - - [%s] %s" % (
            self.address_string(),
            self.log_date_time_string(),
            format%args))
            
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def find_free_port(start_port=8770, max_attempts=10):
    for port in range(start_port, start_port + max_attempts):
        if not is_port_in_use(port):
            return port
    raise RuntimeError(f"No free ports found between {start_port} and {start_port + max_attempts}")

def start_server():
    try:
        port = find_free_port()
        
        # Create server with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                with socketserver.TCPServer(("", port), CustomHandler) as httpd:
                    logging.info(f"Serving at http://localhost:{port}")
                    
                    # Write port to file for launcher to read
                    with open("server_port.txt", "w") as f:
                        f.write(str(port))
                    
                    httpd.serve_forever()
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                logging.warning(f"Attempt {attempt + 1} failed: {e}")
                port = find_free_port(port + 1)
                
    except Exception as e:
        logging.error(f"Server failed to start: {e}")
        raise

if __name__ == "__main__":
    try:
        start_server()
    except KeyboardInterrupt:
        logging.info("Server stopped by user")
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        raise
