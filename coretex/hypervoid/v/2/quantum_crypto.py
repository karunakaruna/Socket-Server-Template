import numpy as np
import time
import json
import random

class QuantumState:
    """Represents a quantum state with position and rotation"""
    def __init__(self):
        self.position = np.random.rand(4) * 2 - 1  # 4D position vector
        self.rotation = np.random.rand(6) * np.pi * 2  # 6D rotation angles
        
    def get_rotation_matrix(self):
        """Get 4D rotation matrix from angles"""
        c = np.cos(self.rotation)
        s = np.sin(self.rotation)
        return np.array([
            [c[0], -s[0], 0, 0],
            [s[0], c[0], 0, 0],
            [0, 0, c[1], -s[1]],
            [0, 0, s[1], c[1]]
        ])
        
    def alignment_with(self, other):
        """Calculate quantum alignment with another state"""
        my_vec = self.get_rotation_matrix() @ self.position
        other_vec = other.get_rotation_matrix() @ other.position
        return abs(np.dot(my_vec, other_vec))
        
    def to_json(self):
        return {
            'position': self.position.tolist(),
            'rotation': self.rotation.tolist()
        }
        
    @classmethod
    def from_json(cls, data):
        state = cls()
        state.position = np.array(data['position'])
        state.rotation = np.array(data['rotation'])
        return state
        
    def to_quantum_foam(self):
        """Generate quantum foam visualization"""
        # Quantum foam characters
        foam_chars = "░▒▓█▀▄▌▐■□▢▣▤▥▦▧▨▩"
        
        # Generate foam based on quantum state
        foam = ""
        for i in range(20):  # Generate 20 characters of foam
            # Use position and rotation to select characters
            idx = int(abs(
                np.sin(self.position[i % 4] + self.rotation[i % 6] + time.time() * 0.1)
                * len(foam_chars)
            ))
            foam += foam_chars[idx % len(foam_chars)]
            
            # Add glitch effects
            if random.random() < 0.2:  # 20% chance of glitch
                foam += random.choice("⌠⌡∫≈≠±²³")
                
        return foam

class HyperMessage:
    """Quantum encrypted message"""
    def __init__(self, content, quantum_state):
        self.content = content
        self.quantum_state = quantum_state
        self.timestamp = time.time()
        
    def encrypt(self):
        """Encrypt message using quantum state"""
        key = (self.quantum_state.get_rotation_matrix() @ self.quantum_state.position).tobytes()
        return bytes([a ^ b for a, b in zip(self.content.encode(), key * (len(self.content) // len(key) + 1))])
        
    def decrypt(self, receiver_state):
        """Try to decrypt with receiver's quantum state"""
        alignment = self.quantum_state.alignment_with(receiver_state)
        if alignment > 0.9:  # States are aligned enough to decrypt
            return self.content
        return None
        
    def to_json(self):
        return {
            'content': self.content,
            'state': self.quantum_state.to_json(),
            'timestamp': self.timestamp
        }
        
    @classmethod
    def from_json(cls, data):
        msg = cls("", QuantumState.from_json(data['state']))
        msg.content = data['content']
        msg.timestamp = data['timestamp']
        return msg
        
    def to_quantum_foam(self):
        """Generate quantum foam for message"""
        base_foam = self.quantum_state.to_quantum_foam()
        # Add message-specific patterns
        msg_hash = sum(ord(c) for c in self.content)
        foam_pattern = "".join(random.choice("▀▄█▌▐") for _ in range(5))
        return f"{base_foam[:10]}{foam_pattern}{base_foam[15:]}"
