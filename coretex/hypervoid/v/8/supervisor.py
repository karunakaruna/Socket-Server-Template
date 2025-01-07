import subprocess
import psutil
import time
import os
import sys
import socket
import json
import logging
import signal
import atexit

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('hypervoid.log')
    ]
)

class HyperVoidSupervisor:
    def __init__(self):
        self.processes = {}
        self.ports = {}
        self.running = True
        signal.signal(signal.SIGINT, self.handle_shutdown)
        signal.signal(signal.SIGTERM, self.handle_shutdown)
        atexit.register(self.cleanup)
        
    def handle_shutdown(self, signum, frame):
        logging.info("Shutdown signal received")
        self.cleanup()
        sys.exit(0)
        
    def cleanup(self):
        logging.info("Cleaning up processes...")
        for name, proc in self.processes.items():
            try:
                if proc and proc.poll() is None:
                    proc.terminate()
                    proc.wait(timeout=5)
            except Exception as e:
                logging.error(f"Error terminating {name}: {e}")
                
        # Kill any remaining Python processes
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if 'python' in proc.info['name'].lower():
                    cmdline = proc.info['cmdline']
                    if cmdline and any(x in ' '.join(cmdline) for x in ['server_v8.py', 'quantum_vis_server.py']):
                        proc.terminate()
                        proc.wait(timeout=5)
            except Exception as e:
                logging.error(f"Error in process cleanup: {e}")
                
    def is_port_available(self, port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return True
            except:
                return False
                
    def find_free_port(self, start_port):
        port = start_port
        while not self.is_port_available(port) and port < start_port + 100:
            port += 1
        if port >= start_port + 100:
            raise RuntimeError(f"No free ports found starting from {start_port}")
        return port
        
    def start_server(self):
        try:
            # Find free ports
            ws_port = self.find_free_port(8769)
            http_port = self.find_free_port(8770)
            
            self.ports = {
                'websocket': ws_port,
                'http': http_port
            }
            
            # Save ports to file
            with open('ports.json', 'w') as f:
                json.dump(self.ports, f)
            
            # Start WebSocket server
            logging.info(f"Starting WebSocket server on port {ws_port}")
            ws_server = subprocess.Popen(
                [sys.executable, 'server_v8.py', '--port', str(ws_port)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            self.processes['websocket'] = ws_server
            
            # Start HTTP server
            logging.info(f"Starting HTTP server on port {http_port}")
            http_server = subprocess.Popen(
                [sys.executable, 'quantum_vis_server.py', '--port', str(http_port)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            self.processes['http'] = http_server
            
            # Wait for servers to initialize
            time.sleep(2)
            
            # Check if servers are running
            if ws_server.poll() is not None or http_server.poll() is not None:
                raise RuntimeError("Server failed to start")
                
            # Write ready file
            with open('ready.txt', 'w') as f:
                f.write('ready')
                
            logging.info("All servers started successfully")
            
            # Monitor processes
            while self.running:
                if ws_server.poll() is not None or http_server.poll() is not None:
                    logging.error("A server process has died")
                    self.cleanup()
                    break
                time.sleep(1)
                
        except Exception as e:
            logging.error(f"Error in supervisor: {e}")
            self.cleanup()
            raise

if __name__ == "__main__":
    try:
        supervisor = HyperVoidSupervisor()
        supervisor.start_server()
    except KeyboardInterrupt:
        logging.info("Supervisor stopped by user")
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        sys.exit(1)
