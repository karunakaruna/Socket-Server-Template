import argparse
import json
import time
import logging
from client_v9 import HyperVoidClient
from quantum_crypto_v9 import QuantumState
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QuantumDebugger:
    def __init__(self):
        self.client = HyperVoidClient()
        self.client.add_message_handler(self.debug_message_handler)
        
    def debug_message_handler(self, sender: str, content: str):
        logger.info(f"[DEBUG] {sender}: {content}")
        
    def connect(self, username: str = "QuantumDebugger"):
        self.client.connect(username)
        
    def analyze_quantum_state(self, state: QuantumState):
        """Analyze quantum state properties"""
        analysis = {
            'position_norm': np.linalg.norm(state.position),
            'hyperradius': state.hyperradius,
            'phase': state.phase,
            'entanglement_count': len(state.entanglement_history),
            'foam_pattern': state.foam.get_foam(),
            'foam_history_size': len(state.foam.foam_history)
        }
        return analysis
        
    def send_debug_command(self, command: str, **kwargs):
        """Send debug command to server"""
        debug_msg = {
            'command': 'debug',
            'debug_command': command,
            'params': kwargs,
            'timestamp': time.time()
        }
        self.client.send_chat_message(json.dumps(debug_msg))
        
    def dump_quantum_state(self, filepath: str = "quantum_state_dump.json"):
        """Dump current quantum state to file"""
        state_dump = {
            'client_state': self.client.quantum_state.to_json(),
            'server_state': self.client.server_state.to_json() if self.client.server_state else None,
            'peers': {
                username: state.to_json() 
                for username, state in self.client.peers.items()
            },
            'timestamp': time.time()
        }
        with open(filepath, 'w') as f:
            json.dump(state_dump, f, indent=2)
            
    def inject_quantum_noise(self, amplitude: float = 0.1):
        """Inject quantum noise for testing"""
        self.client.quantum_state.position += np.random.normal(0, amplitude, 4)
        self.send_debug_command('noise_injection', amplitude=amplitude)
        
    def force_decoherence(self):
        """Force quantum state decoherence"""
        self.client.quantum_state.foam.decoherence_factor *= 2
        self.send_debug_command('force_decoherence')
        
    def spawn_quantum_users(self, count: int, base_name: str = "TestUser"):
        """Spawn multiple quantum users"""
        clients = []
        for i in range(count):
            client = HyperVoidClient()
            try:
                client.connect(f"{base_name}_{i}")
                clients.append(client)
                logger.info(f"Spawned {client.username}")
            except Exception as e:
                logger.error(f"Failed to spawn user {i}: {e}")
        return clients
        
def main():
    parser = argparse.ArgumentParser(description='Quantum Network Debugger')
    parser.add_argument('command', choices=[
        'analyze', 'dump', 'noise', 'decohere', 'spawn'
    ], help='Debug command to execute')
    parser.add_argument('-n', '--num-users', type=int, default=1,
                      help='Number of users to spawn')
    parser.add_argument('-a', '--amplitude', type=float, default=0.1,
                      help='Noise amplitude')
    parser.add_argument('-o', '--output', default='quantum_state_dump.json',
                      help='Output file for state dump')
    args = parser.parse_args()
    
    debugger = QuantumDebugger()
    debugger.connect()
    
    if args.command == 'analyze':
        analysis = debugger.analyze_quantum_state(debugger.client.quantum_state)
        print(json.dumps(analysis, indent=2))
        
    elif args.command == 'dump':
        debugger.dump_quantum_state(args.output)
        print(f"Quantum state dumped to {args.output}")
        
    elif args.command == 'noise':
        debugger.inject_quantum_noise(args.amplitude)
        print(f"Injected quantum noise with amplitude {args.amplitude}")
        
    elif args.command == 'decohere':
        debugger.force_decoherence()
        print("Forced quantum decoherence")
        
    elif args.command == 'spawn':
        clients = debugger.spawn_quantum_users(args.num_users)
        print(f"Spawned {len(clients)} quantum users")
        
if __name__ == '__main__':
    main()
