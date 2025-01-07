import asyncio
import websockets
import json
import numpy as np
from quantum_crypto import QuantumState
import argparse
import time
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler()]
)

class HyperVoidClient:
    def __init__(self, port, username=None, duration=None):
        self.port = port
        self.username = username or f"Entity_{int(time.time() * 1000) % 10000}"
        self.duration = float(duration) if duration else None
        self.quantum_state = QuantumState()
        self.start_time = None
        self.running = False
        
    async def connect(self):
        try:
            self.websocket = await websockets.connect(
                f'ws://localhost:{self.port}',
                ping_interval=None,
                max_size=2**23
            )
            
            register_message = {
                'type': 'register',
                'username': self.username
            }
            await self.websocket.send(json.dumps(register_message))
            logging.info(f"Connected as {self.username}")
            return True
            
        except Exception as e:
            logging.error(f"Connection error: {e}")
            return False
            
    async def run(self):
        self.running = True
        self.start_time = time.time()
        
        try:
            while self.running:
                if self.duration and (time.time() - self.start_time) >= self.duration:
                    logging.info("Duration reached, shutting down")
                    break
                    
                # Generate quantum state
                state = self.quantum_state.get_state()
                message = {
                    'type': 'quantum_state',
                    'state': state.tolist()
                }
                
                try:
                    await self.websocket.send(json.dumps(message))
                    response = await self.websocket.recv()
                    data = json.loads(response)
                    
                    if data['type'] == 'quantum_state':
                        self.quantum_state.set_state(np.array(data['state']))
                        
                except websockets.exceptions.ConnectionClosed:
                    logging.error("Connection lost")
                    break
                    
                await asyncio.sleep(0.1)
                
        except Exception as e:
            logging.error(f"Runtime error: {e}")
        finally:
            if hasattr(self, 'websocket'):
                await self.websocket.close()
            logging.info("Client shutdown complete")

def main():
    parser = argparse.ArgumentParser(description='HyperVoid Client')
    parser.add_argument('--port', type=int, required=True)
    parser.add_argument('--name', help='Client username')
    parser.add_argument('--duration', help='Run duration in seconds')
    args = parser.parse_args()
    
    client = HyperVoidClient(args.port, args.name, args.duration)
    
    try:
        asyncio.get_event_loop().run_until_complete(client.connect())
        asyncio.get_event_loop().run_until_complete(client.run())
    except KeyboardInterrupt:
        logging.info("Client stopped by user")
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
