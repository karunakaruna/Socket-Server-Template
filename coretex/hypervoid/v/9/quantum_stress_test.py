import asyncio
import time
import random
import logging
import argparse
import psutil
import json
from client_v9 import HyperVoidClient
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict
import signal
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('quantum_stress.log')
    ]
)
logger = logging.getLogger(__name__)

class QuantumStressTest:
    def __init__(self, num_users: int = 100, host: str = 'localhost', port: int = 8767):
        self.num_users = num_users
        self.host = host
        self.port = port
        self.clients: List[HyperVoidClient] = []
        self.stats: Dict = {
            'start_time': time.time(),
            'messages_sent': 0,
            'messages_received': 0,
            'quantum_errors': 0,
            'reconnections': 0
        }
        self.running = False
        self.executor = ThreadPoolExecutor(max_workers=num_users + 5)
        
    def message_handler(self, sender: str, content: str):
        """Handle received messages and collect stats"""
        self.stats['messages_received'] += 1
        
    def spawn_client(self, user_id: int) -> HyperVoidClient:
        """Spawn a single quantum user"""
        client = HyperVoidClient(self.host, self.port)
        client.add_message_handler(self.message_handler)
        username = f"QuantumUser_{user_id}"
        
        try:
            client.connect(username)
            self.clients.append(client)
            logger.info(f"Spawned {username}")
            return client
        except Exception as e:
            logger.error(f"Failed to spawn {username}: {e}")
            return None
            
    async def quantum_chat_simulation(self, client: HyperVoidClient):
        """Simulate quantum chat messages"""
        while self.running:
            try:
                message = f"Quantum message from {client.username} at {time.time()}"
                client.send_chat_message(message)
                self.stats['messages_sent'] += 1
                await asyncio.sleep(random.uniform(1.0, 5.0))
            except Exception as e:
                logger.error(f"Chat simulation error for {client.username}: {e}")
                self.stats['quantum_errors'] += 1
                await asyncio.sleep(1.0)
                
    def monitor_system_resources(self):
        """Monitor system resources during test"""
        while self.running:
            try:
                process = psutil.Process()
                cpu_percent = process.cpu_percent()
                memory_info = process.memory_info()
                
                logger.info(f"""
System Stats:
- CPU Usage: {cpu_percent}%
- Memory Usage: {memory_info.rss / 1024 / 1024:.2f} MB
- Active Clients: {len(self.clients)}
- Messages Sent: {self.stats['messages_sent']}
- Messages Received: {self.stats['messages_received']}
- Quantum Errors: {self.stats['quantum_errors']}
- Reconnections: {self.stats['reconnections']}
""")
                time.sleep(5)
            except Exception as e:
                logger.error(f"Resource monitoring error: {e}")
                time.sleep(1)
                
    def save_stats(self):
        """Save test statistics to file"""
        stats = {
            **self.stats,
            'duration': time.time() - self.stats['start_time'],
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        with open('quantum_stress_stats.json', 'w') as f:
            json.dump(stats, f, indent=2)
            
    async def run_test(self):
        """Run the quantum stress test"""
        self.running = True
        logger.info(f"Starting quantum stress test with {self.num_users} users")
        
        # Start resource monitoring
        self.executor.submit(self.monitor_system_resources)
        
        # Spawn quantum users
        spawn_tasks = []
        for i in range(self.num_users):
            spawn_tasks.append(self.executor.submit(self.spawn_client, i))
            await asyncio.sleep(0.1)  # Gradual client spawn
            
        # Wait for all clients to spawn
        clients = [task.result() for task in spawn_tasks if task.result()]
        logger.info(f"Successfully spawned {len(clients)} quantum users")
        
        # Start chat simulation for each client
        chat_tasks = []
        for client in clients:
            chat_tasks.append(asyncio.create_task(self.quantum_chat_simulation(client)))
            
        try:
            # Run until interrupted
            await asyncio.gather(*chat_tasks)
        except asyncio.CancelledError:
            pass
        finally:
            self.cleanup()
            
    def cleanup(self):
        """Clean up resources"""
        self.running = False
        logger.info("Cleaning up quantum stress test...")
        
        for client in self.clients:
            try:
                client.disconnect()
            except:
                pass
                
        self.executor.shutdown(wait=False)
        self.save_stats()
        logger.info("Quantum stress test completed")
        
def main():
    parser = argparse.ArgumentParser(description='Quantum Network Stress Test')
    parser.add_argument('-n', '--num-users', type=int, default=100,
                      help='Number of quantum users to spawn')
    parser.add_argument('--host', default='localhost',
                      help='Server host')
    parser.add_argument('-p', '--port', type=int, default=8767,
                      help='Server port')
    args = parser.parse_args()
    
    stress_test = QuantumStressTest(args.num_users, args.host, args.port)
    
    def signal_handler(sig, frame):
        logger.info("\nStopping quantum stress test...")
        if stress_test.running:
            stress_test.cleanup()
        sys.exit(0)
        
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        asyncio.run(stress_test.run_test())
    except KeyboardInterrupt:
        pass
    finally:
        if stress_test.running:
            stress_test.cleanup()
            
if __name__ == '__main__':
    main()
