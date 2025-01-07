import numpy as np
import time
import json
import random
from collections import deque

class QuantumFoam:
    """Represents the evolving quantum foam of spacetime"""
    def __init__(self, size=100):
        self.size = size
        self.foam_history = deque(maxlen=size)
        self.foam_history.append(np.random.rand(4))  # Initialize with first state
        self.foam_chars = "░▒▓█▀▄▌▐■□▢▣▤▥▦▧▨▩⌠⌡∫≈≠±²³"
        self.last_evolution = time.time()
        self.evolution_rate = 0.1  # Foam evolves every 0.1 seconds
        
    def evolve(self):
        """Evolve the quantum foam based on time and previous states"""
        now = time.time()
        if now - self.last_evolution > self.evolution_rate:
            # Generate new foam state based on time and previous states
            new_state = np.random.rand(4)  # 4D quantum state
            if len(self.foam_history) > 0:
                # Influence from previous state
                prev_state = self.foam_history[-1]
                new_state = 0.8 * new_state + 0.2 * prev_state
            self.foam_history.append(new_state)
            self.last_evolution = now
            
    def get_foam(self, quantum_state=None, message_hash=0):
        """Generate quantum foam visualization"""
        self.evolve()
        
        if len(self.foam_history) == 0:
            self.foam_history.append(np.random.rand(4))
            
        # Base foam from current quantum state
        base_pattern = []
        current_foam = self.foam_history[-1]
        
        for i in range(40):
            idx = int(abs(
                np.sin(
                    time.time() * 0.1 + 
                    current_foam[i % 4] + 
                    message_hash * 0.05
                ) * len(self.foam_chars)
            ))
            base_pattern.append(self.foam_chars[idx % len(self.foam_chars)])
            
        # Add influence from quantum state if provided
        if quantum_state is not None:
            for i in range(len(base_pattern)):
                if random.random() < 0.3:  # 30% chance to modify based on state
                    state_idx = int(abs(
                        np.dot(quantum_state.position, current_foam)
                        * len(self.foam_chars)
                    ))
                    base_pattern[i] = self.foam_chars[state_idx % len(self.foam_chars)]
                    
        # Add glitch effects based on foam history
        glitch_chars = "⌠⌡∫≈≠±²³"
        for i in range(len(base_pattern)):
            if random.random() < 0.15:  # 15% chance of glitch
                history_influence = sum(state[i % 4] for state in self.foam_history)
                glitch_idx = int(abs(history_influence * len(glitch_chars)))
                base_pattern.insert(i, glitch_chars[glitch_idx % len(glitch_chars)])
                
        return "".join(base_pattern[:50])  # Limit length to 50 chars

class QuantumState:
    """Represents a quantum state with hyperradius tuning"""
    def __init__(self):
        self.position = np.random.rand(4) * 2 - 1  # 4D position
        self.hyperradius = 1.0  # Tuning radius in hyperspace
        self.phase = np.random.rand() * 2 * np.pi  # Quantum phase
        self.foam = QuantumFoam()  # Personal quantum foam
        
    def tune(self, hyperradius):
        """Tune quantum state's hyperradius"""
        self.hyperradius = max(0.1, min(2.0, hyperradius))
        
    def alignment_with(self, other):
        """Calculate quantum alignment with another state"""
        # Distance in 4D hyperspace
        distance = np.linalg.norm(self.position - other.position)
        # Phase alignment
        phase_diff = abs(np.cos(self.phase - other.phase))
        # Hyperradius compatibility
        radius_match = 1 - abs(self.hyperradius - other.hyperradius) / 2
        
        # Combined alignment score
        return max(0, min(1, 
            (1 - distance/4) * phase_diff * radius_match
        ))
        
    def to_json(self):
        return {
            'position': self.position.tolist(),
            'hyperradius': self.hyperradius,
            'phase': float(self.phase)
        }
        
    @classmethod
    def from_json(cls, data):
        state = cls()
        state.position = np.array(data['position'])
        state.hyperradius = float(data['hyperradius'])
        state.phase = float(data['phase'])
        return state

class HyperMessage:
    """Quantum encrypted message with evolving encryption"""
    def __init__(self, content, quantum_state):
        self.content = content
        self.quantum_state = quantum_state
        self.timestamp = time.time()
        self.foam_state = quantum_state.foam.get_foam(
            quantum_state,
            sum(ord(c) for c in content)
        )
        
    def encrypt(self):
        """Encrypt message using quantum state and foam"""
        # Generate key from quantum state and foam
        foam_hash = sum(ord(c) for c in self.foam_state)
        key = (
            self.quantum_state.position.tobytes() + 
            bytes([int(self.quantum_state.phase * 256)]) +
            bytes([int(self.quantum_state.hyperradius * 256)]) +
            bytes([foam_hash % 256])
        )
        return bytes([
            a ^ b for a, b in zip(
                self.content.encode(), 
                key * (len(self.content) // len(key) + 1)
            )
        ])
        
    def decrypt(self, receiver_state):
        """Try to decrypt with receiver's quantum state"""
        alignment = self.quantum_state.alignment_with(receiver_state)
        if alignment > 0.8:  # Need 80% alignment to decrypt
            return self.content
        return None
        
    def to_json(self):
        return {
            'content': self.content,
            'state': self.quantum_state.to_json(),
            'timestamp': self.timestamp,
            'foam': self.foam_state
        }
        
    @classmethod
    def from_json(cls, data):
        msg = cls("", QuantumState.from_json(data['state']))
        msg.content = data['content']
        msg.timestamp = data['timestamp']
        msg.foam_state = data['foam']
        return msg
