import numpy as np
import time
import json
from collections import deque

class QuantumFoam:
    """Quantum foam simulation for state visualization"""
    def __init__(self, size=32):
        self.size = size
        self.foam_history = [np.random.random((size, size))]
        
    def evolve(self):
        """Evolve the quantum foam state"""
        current = self.foam_history[-1].copy()
        
        # Apply quantum fluctuations
        fluctuation = np.random.random((self.size, self.size)) * 0.1
        current += fluctuation
        
        # Apply smoothing
        for _ in range(2):
            new = current.copy()
            for i in range(self.size):
                for j in range(self.size):
                    neighbors = []
                    for di, dj in [(-1,0), (1,0), (0,-1), (0,1)]:
                        ni, nj = (i + di) % self.size, (j + dj) % self.size
                        neighbors.append(current[ni, nj])
                    new[i, j] = sum(neighbors) / 4
            current = new
            
        # Normalize
        current = (current - current.min()) / (current.max() - current.min())
        
        self.foam_history.append(current)
        if len(self.foam_history) > 10:
            self.foam_history.pop(0)
            
    def get_state(self):
        """Get current foam state"""
        return self.foam_history[-1]
        
class QuantumState:
    """Quantum state for the HyperVoid system"""
    def __init__(self):
        self.state = np.array([0.0, 0.0, 0.0])  # 3D state vector
        self.foam = QuantumFoam()  # Add quantum foam
        self.normalize()
        
    def set_state(self, state):
        """Set the state vector"""
        self.state = np.array(state[:3], dtype=float)
        self.normalize()
        self.foam.evolve()  # Evolve foam when state changes
        
    def get_state(self):
        """Get the state vector"""
        return self.state.tolist()
        
    def get_foam(self):
        """Get current foam state"""
        return self.foam.get_state()
        
    def normalize(self):
        """Normalize the state vector"""
        norm = np.linalg.norm(self.state)
        if norm > 0:
            self.state = self.state / norm
            
    def align_with(self, other_state):
        """Align with another quantum state"""
        other = np.array(other_state)
        # Calculate rotation matrix to align states
        v = np.cross(self.state, other)
        s = np.linalg.norm(v)
        c = np.dot(self.state, other)
        
        if s > 0:
            v_x = np.array([[0, -v[2], v[1]],
                           [v[2], 0, -v[0]],
                           [-v[1], v[0], 0]])
            R = np.eye(3) + v_x + np.dot(v_x, v_x) * (1 - c) / (s * s)
            self.state = np.dot(R, self.state)
            self.normalize()
            self.foam.evolve()  # Evolve foam on alignment
            
    def evolve(self, message):
        """Evolve state based on message"""
        # Hash message to get consistent evolution
        h = sum(ord(c) * i for i, c in enumerate(message))
        angle = (h % 360) * np.pi / 180
        
        # Create rotation matrix
        c, s = np.cos(angle), np.sin(angle)
        R = np.array([[c, -s, 0],
                     [s, c, 0],
                     [0, 0, 1]])
                     
        # Apply rotation
        self.state = np.dot(R, self.state)
        self.normalize()
        self.foam.evolve()  # Evolve foam on state evolution
        
    def to_json(self):
        """Convert to JSON-serializable format"""
        return {
            'state': self.get_state(),
            'foam': self.get_foam().tolist()
        }
        
    @classmethod
    def from_json(cls, data):
        """Create from JSON data"""
        state = cls()
        state.set_state(data['state'])
        state.foam.foam_history[-1] = np.array(data['foam'])
        return state
        
class HyperMessage:
    """Quantum-encrypted message"""
    def __init__(self, content, quantum_state):
        self.content = content
        self.quantum_state = quantum_state
        self.timestamp = time.time()
        self.foam_state = quantum_state.foam.get_state()
        
    def encrypt(self):
        """Encrypt message using quantum state"""
        # Convert message to bytes
        message_bytes = self.content.encode()
        # Generate quantum key from state
        key = np.abs(np.fft.fft(self.quantum_state.state))
        # Apply quantum foam influence
        foam_influence = self.quantum_state.foam.get_state()
        key = key * foam_influence.flatten()
        # Encrypt bytes
        encrypted = bytearray()
        for i, b in enumerate(message_bytes):
            key_byte = int(key[i % len(key)] * 256) & 0xFF
            encrypted.append(b ^ key_byte)
        return encrypted
        
    def decrypt(self, receiver_state):
        """Decrypt message using receiver's quantum state"""
        try:
            # Check quantum alignment
            alignment = receiver_state.alignment_with(self.quantum_state)
            if alignment < 0.5:  # Insufficient alignment
                return None
                
            # Generate quantum key from state
            key = np.abs(np.fft.fft(self.quantum_state.state))
            # Apply quantum foam influence
            foam_influence = self.quantum_state.foam.get_state()
            key = key * foam_influence.flatten()
            # Decrypt bytes
            decrypted = bytearray()
            encrypted = self.encrypt()  # Get encrypted bytes
            for i, b in enumerate(encrypted):
                key_byte = int(key[i % len(key)] * 256) & 0xFF
                decrypted.append(b ^ key_byte)
            return decrypted.decode()
            
        except Exception:
            return None
            
    def to_json(self):
        """Convert message to JSON"""
        return {
            'content': list(self.encrypt()),
            'quantum_state': self.quantum_state.to_json(),
            'timestamp': self.timestamp,
            'foam_state': self.foam_state.tolist()
        }
        
    @classmethod
    def from_json(cls, data):
        """Create message from JSON"""
        if not data:
            return None
        try:
            quantum_state = QuantumState.from_json(data['quantum_state'])
            msg = cls("", quantum_state)
            msg.content = bytes(data['content'])
            msg.timestamp = data['timestamp']
            msg.foam_state = np.array(data['foam_state'])
            return msg
        except:
            return None
