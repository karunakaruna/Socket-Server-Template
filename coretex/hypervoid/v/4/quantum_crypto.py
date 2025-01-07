import numpy as np
import time
import json
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
        
        # Create colorful border
        border_top = "╔" + "═" * 38 + "╗"
        border_bottom = "╚" + "═" * 38 + "╝"
        
        # Generate foam pattern with colors
        lines = []
        lines.append("\033[38;5;82m" + border_top + "\033[0m")  # Green border
        
        for i in range(3):  # 3 lines of foam
            line = ["║"]
            for j in range(38):
                idx = int(abs(
                    np.sin(
                        time.time() * 0.1 + 
                        current_foam[(i + j) % 4] + 
                        message_hash * 0.05
                    ) * len(self.foam_chars)
                ))
                # Add color based on position
                color = 82 + ((i * 38 + j) % 6)  # Shades of green
                line.append(f"\033[38;5;{color}m{self.foam_chars[idx % len(self.foam_chars)]}\033[0m")
            line.append("║")
            lines.append("".join(line))
            
        lines.append("\033[38;5;82m" + border_bottom + "\033[0m")
        
        return "\n".join(lines)

    def get_state(self):
        """Get current foam state"""
        self.evolve()  # Make sure we have current state
        if len(self.foam_history) == 0:
            self.foam_history.append(np.random.rand(4))
        return self.foam_history[-1]
        
class QuantumState:
    """Represents a quantum state in 4D hyperspace"""
    def __init__(self):
        self.position = np.random.randn(4)  # 4D position vector
        self.hyperradius = 1.0  # Hyperradius for quantum alignment
        self.foam = QuantumFoam()  # Quantum foam for this state
        
    def evolve(self, message):
        """Evolve quantum state based on message"""
        # Hash message for deterministic evolution
        message_hash = sum(ord(c) for c in message)
        
        # Update position based on message
        evolution = np.array([
            np.sin(message_hash * 0.1),
            np.cos(message_hash * 0.2),
            np.sin(message_hash * 0.3),
            np.cos(message_hash * 0.4)
        ])
        
        self.position += evolution * 0.1
        # Normalize to maintain stability
        self.position = self.position / np.linalg.norm(self.position)
        
    def tune(self, new_radius):
        """Tune hyperradius"""
        self.hyperradius = max(0.1, min(2.0, new_radius))
        
    def align(self, target_phase):
        """Align quantum state with target phase"""
        phase_vector = np.array([
            np.cos(target_phase),
            np.sin(target_phase),
            np.cos(target_phase * 2),
            np.sin(target_phase * 2)
        ])
        self.position = 0.8 * self.position + 0.2 * phase_vector
        self.position = self.position / np.linalg.norm(self.position)
        
    def alignment_with(self, other):
        """Calculate quantum alignment with another state"""
        return np.dot(self.position, other.position)
        
    def to_json(self):
        """Convert state to JSON"""
        return {
            'position': self.position.tolist(),
            'hyperradius': self.hyperradius,
            'foam': list(self.foam.foam_history)[-1].tolist()
        }
        
    @classmethod
    def from_json(cls, data):
        """Create state from JSON"""
        state = cls()
        state.position = np.array(data['position'])
        state.hyperradius = data['hyperradius']
        state.foam.foam_history.append(np.array(data['foam']))
        return state
        
    def __str__(self):
        """String representation with ASCII art"""
        # Create ASCII representation
        foam = self.foam.get_foam()
        pos_str = [f"{p:.2f}" for p in self.position]
        return f"{foam}\nPHASE: [{', '.join(pos_str)}]\nRADIUS: {self.hyperradius:.1f}"

class HyperMessage:
    """Quantum-encrypted message"""
    def __init__(self, content, quantum_state):
        self.content = content
        self.quantum_state = quantum_state
        self.timestamp = time.time()
        self.foam_state = quantum_state.foam.get_foam()
        
    def encrypt(self):
        """Encrypt message using quantum state"""
        # Convert message to bytes
        message_bytes = self.content.encode()
        # Generate quantum key from state
        key = np.abs(np.fft.fft(self.quantum_state.position))
        # Apply quantum foam influence
        foam_influence = self.quantum_state.foam.get_state()
        key = key * foam_influence
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
            key = np.abs(np.fft.fft(self.quantum_state.position))
            # Apply quantum foam influence
            foam_influence = self.quantum_state.foam.get_state()
            key = key * foam_influence
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
            'foam_state': self.foam_state
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
            msg.foam_state = data['foam_state']
            return msg
        except:
            return None
