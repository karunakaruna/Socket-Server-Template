import numpy as np
import json
import random

class QuantumState:
    def __init__(self):
        # Position in 4D space
        self.position = np.random.rand(4)  # x, y, z, w
        # Rotation angles in 6D (15 possible rotation planes in 4D)
        self.rotation = np.random.rand(6) * 2 * np.pi
        
    def to_json(self):
        return {
            'position': self.position.tolist(),
            'rotation': self.rotation.tolist()
        }
        
    @classmethod
    def from_json(cls, json_data):
        state = cls()
        data = json.loads(json_data) if isinstance(json_data, str) else json_data
        state.position = np.array(data['position'])
        state.rotation = np.array(data['rotation'])
        return state
        
    def alignment_with(self, other):
        """Calculate quantum alignment with another state"""
        pos_diff = np.linalg.norm(self.position - other.position)
        rot_diff = np.linalg.norm(self.rotation - other.rotation)
        return 1.0 / (1.0 + pos_diff + rot_diff)

class HyperMessage:
    def __init__(self, content, quantum_state):
        self.content = content
        self.quantum_state = quantum_state
        self.encrypted = self._encrypt()
        
    def _encrypt(self):
        """Encrypt message using quantum state"""
        # Use quantum state to generate encryption key
        key = np.concatenate([self.quantum_state.position, self.quantum_state.rotation])
        # Simple XOR encryption with key
        return ''.join(chr(ord(c) ^ int(k*256) % 256) for c, k in zip(self.content, np.tile(key, len(self.content))))
        
    def decrypt(self, receiver_state):
        """Try to decrypt with receiver's quantum state"""
        alignment = self.quantum_state.alignment_with(receiver_state)
        if alignment > 0.9:  # Threshold for successful decryption
            return self.content
        return None
        
    def to_quantum_foam(self):
        """Convert message to quantum foam visualization"""
        # Generate quantum foam characters based on message and state
        foam_chars = '░▒▓█▀▄▌▐■□▢▣▤▥▦▧▨▩▪▫▬▭▮▯▰▱▲▼◄►◆◇○●◐◑'
        state_hash = sum(self.quantum_state.position) + sum(self.quantum_state.rotation)
        foam = ''
        for i, c in enumerate(self.encrypted):
            idx = (ord(c) + int(state_hash * 1000)) % len(foam_chars)
            foam += foam_chars[idx]
        return foam
        
    def __str__(self):
        return self.to_quantum_foam()
        
    def to_json(self):
        return {
            'encrypted': self.encrypted,
            'quantum_state': self.quantum_state.to_json()
        }
