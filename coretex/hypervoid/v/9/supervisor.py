import asyncio
import websockets
import json
import os
import sys
import logging
import psutil
import socket
import subprocess
import signal
import time
from typing import Dict, Optional, List

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("hypervoid.log"),
        logging.StreamHandler()
    ]
)

class QuantumSupervisor:
    def __init__(self):
        self.processes: Dict[str, subprocess.Popen] = {}
        self.ports: Dict[str, int] = {}
        self.ready = False
        
    def find_free_port(self) -> int:
        """Find free port for quantum tunneling"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('', 0))
            s.listen(1)
            port = s.getsockname()[1]
        return port
        
    def cleanup_processes(self) -> None:
        """Collapse quantum states and cleanup"""
        for name, process in self.processes.items():
            try:
                if process.poll() is None:
                    logging.info(f"Terminating {name}")
                    process.terminate()
                    process.wait(timeout=5)
            except Exception as e:
                logging.error(f"Error terminating {name}: {e}")
                try:
                    process.kill()
                except:
                    pass
                    
    def kill_existing_python(self) -> None:
        """Kill existing quantum processes"""
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.info['name'] == 'python.exe':
                    cmdline = proc.info['cmdline']
                    if cmdline and any(x in ' '.join(cmdline) 
                                     for x in ['server_v9.py', 'quantum_vis_server.py']):
                        logging.info(f"Killing existing process: {proc.info['pid']}")
                        proc.kill()
            except Exception as e:
                logging.error(f"Error killing process: {e}")
                
    async def check_port(self, port: int, retries: int = 30) -> bool:
        """Check quantum port availability"""
        for i in range(retries):
            try:
                reader, writer = await asyncio.open_connection('localhost', port)
                writer.close()
                await writer.wait_closed()
                return True
            except:
                if i < retries - 1:
                    await asyncio.sleep(1)
        return False
        
    def start_server(self, port: int) -> Optional[subprocess.Popen]:
        """Start quantum server"""
        try:
            process = subprocess.Popen(
                [sys.executable, 'server_v9.py', '--port', str(port)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            self.processes['server'] = process
            return process
        except Exception as e:
            logging.error(f"Failed to start server: {e}")
            return None
            
    def start_visualizer(self, port: int) -> Optional[subprocess.Popen]:
        """Start quantum visualizer"""
        try:
            process = subprocess.Popen(
                [sys.executable, 'quantum_vis_server.py', '--port', str(port)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            self.processes['visualizer'] = process
            return process
        except Exception as e:
            logging.error(f"Failed to start visualizer: {e}")
            return None
            
    async def monitor_process(self, name: str, process: subprocess.Popen) -> None:
        """Monitor quantum process stability"""
        while True:
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            if line:
                logging.info(f"{name}: {line.strip()}")
                
    def save_ports(self) -> None:
        """Save quantum tunneling ports"""
        with open('ports.json', 'w') as f:
            json.dump(self.ports, f)
            
    def signal_ready(self) -> None:
        """Signal quantum initialization complete"""
        with open('ready.txt', 'w') as f:
            f.write('ready')
        self.ready = True
        
    async def run(self) -> None:
        """Run quantum supervisor"""
        try:
            # Cleanup existing quantum states
            self.kill_existing_python()
            
            # Find free ports for quantum tunneling
            self.ports['websocket'] = self.find_free_port()
            self.ports['http'] = self.find_free_port()
            
            # Start quantum processes
            server_process = self.start_server(self.ports['websocket'])
            vis_process = self.start_visualizer(self.ports['http'])
            
            if not server_process or not vis_process:
                raise Exception("Failed to start quantum processes")
                
            # Monitor quantum stability
            monitor_tasks = [
                asyncio.create_task(self.monitor_process('server', server_process)),
                asyncio.create_task(self.monitor_process('visualizer', vis_process))
            ]
            
            # Wait for quantum initialization
            if await self.check_port(self.ports['websocket']):
                self.save_ports()
                self.signal_ready()
                logging.info("Quantum initialization complete")
                
                # Monitor quantum state
                while True:
                    if any(p.poll() is not None for p in self.processes.values()):
                        raise Exception("Quantum process terminated unexpectedly")
                    await asyncio.sleep(1)
                    
        except Exception as e:
            logging.error(f"Supervisor error: {e}")
        finally:
            self.cleanup_processes()

def main():
    supervisor = QuantumSupervisor()
    try:
        asyncio.run(supervisor.run())
    except KeyboardInterrupt:
        logging.info("Supervisor stopped by user")
    except Exception as e:
        logging.error(f"Fatal error: {e}")
    finally:
        supervisor.cleanup_processes()

if __name__ == "__main__":
    main()
