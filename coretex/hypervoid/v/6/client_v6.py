import asyncio
import websockets
import json
import numpy as np
import random
import sys
import time
import argparse

class HyperVoidClient:
    def __init__(self, name=None, duration=None):
        self.name = name or f"User_{random.randint(1000, 9999)}"
        self.duration = float(duration) if duration else None
        self.start_time = None
        
    async def connect(self):
        self.start_time = time.time()
        uri = "ws://localhost:8769"
        async with websockets.connect(uri) as websocket:
            print(f"[{self.name}] Connected to HyperVoid server")
            
            try:
                while True:
                    # Generate random quantum state changes
                    state = [
                        random.uniform(-1, 1),
                        random.uniform(-1, 1)
                    ]
                    
                    # Send state update
                    await websocket.send(json.dumps({
                        'type': 'state_update',
                        'state': state
                    }))
                    
                    # Check if duration exceeded
                    if self.duration and (time.time() - self.start_time) > self.duration:
                        print(f"[{self.name}] Duration {self.duration}s reached, disconnecting...")
                        break
                        
                    # Random delay between updates
                    await asyncio.sleep(random.uniform(0.1, 0.5))
                    
            except websockets.exceptions.ConnectionClosed:
                print(f"[{self.name}] Disconnected from server")
                
def main():
    parser = argparse.ArgumentParser(description='HyperVoid Client')
    parser.add_argument('--name', type=str, help='Client name')
    parser.add_argument('--duration', type=float, help='Session duration in seconds')
    args = parser.parse_args()
    
    client = HyperVoidClient(name=args.name, duration=args.duration)
    
    try:
        asyncio.get_event_loop().run_until_complete(client.connect())
    except KeyboardInterrupt:
        print(f"\n[{client.name}] Shutting down...")
    
if __name__ == "__main__":
    main()
