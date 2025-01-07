import numpy as np
import time
import json
import random
from collections import deque
from typing import List, Tuple, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class HyperMatrix:
    """Represents transformations in hyperdimensional space"""
    def __init__(self, dims: int = 4):
        self.dims = dims
        self.matrix = np.eye(dims)
        self.sp3_angle = np.deg2rad(104.5)  # sp³ hybridization angle
        
    def rotate_hyperplane(self, plane1: int, plane2: int, angle: float):
        """Rotate in a hyperplane defined by two axes"""
        c, s = np.cos(angle), np.sin(angle)
        R = np.eye(self.dims)
        R[plane1, plane1] = c
        R[plane1, plane2] = -s
        R[plane2, plane1] = s
        R[plane2, plane2] = c
        self.matrix = self.matrix @ R
        
    def sp3_hybridize(self):
        """Apply sp³ hybridization transformation"""
        # Create tetrahedral arrangement
        theta = self.sp3_angle
        phi = 2 * np.pi / 3
        
        # Base rotations for tetrahedral geometry
        rotations = [
            (0, 1, theta),
            (0, 2, theta),
            (1, 2, phi),
            (2, 3, theta)
        ]
        
        for p1, p2, angle in rotations:
            self.rotate_hyperplane(p1, p2, angle)

class QuantumFoam:
    """Represents the evolving quantum foam of spacetime with enhanced physics"""
    def __init__(self, size: int = 100):
        self.size = size
        self.foam_history = deque(maxlen=size)
        self.foam_history.append(np.random.rand(4))
        self.foam_chars = "░▒▓█▀▄▌▐■□▢▣▤▥▦▧▨▩⌠⌡∫≈≠±²³"
        self.last_evolution = time.time()
        self.evolution_rate = 0.1
        self.hypermatrix = HyperMatrix()
        self.decoherence_factor = 0.05
        self.electron_shells = [1, 2, 8, 18, 32]  # Principal quantum numbers
        
    def electron_transition(self, energy_level: float) -> Tuple[float, float]:
        """Calculate electron shell transitions with safety checks"""
        try:
            # Ensure energy level is within safe bounds
            energy_level = max(0.1, min(0.9, abs(energy_level)))
            n1 = max(1, min(int(energy_level * len(self.electron_shells)), len(self.electron_shells)))
            n2 = n1 - 1 if random.random() < 0.3 else min(n1 + 1, len(self.electron_shells))
            n2 = max(1, n2)  # Ensure n2 is never zero
            
            # Calculate energy levels with safety checks
            E1 = -13.6 / float(n1 * n1)
            E2 = -13.6 / float(n2 * n2)
            return E1, E2
        except Exception as e:
            logger.error(f"Electron transition error: {e}")
            return -13.6, -13.6  # Safe default values

    def quantum_decoherence(self, state: np.ndarray) -> np.ndarray:
        """Apply quantum decoherence with stability checks"""
        try:
            # Ensure state is valid
            if not isinstance(state, np.ndarray) or state.size == 0:
                return np.zeros_like(self.foam_history[-1])
                
            # Normalize state if needed
            if np.any(np.isnan(state)) or np.any(np.isinf(state)):
                state = np.random.rand(*state.shape)
                
            # Apply decoherence with safety bounds
            environment = np.random.normal(0, min(0.1, self.decoherence_factor), state.shape)
            phase_damp = np.clip(np.exp(-self.decoherence_factor * time.time()), 0.1, 0.9)
            return np.clip(state * phase_damp + environment, -1.0, 1.0)
        except Exception as e:
            logger.error(f"Decoherence error: {e}")
            return np.zeros_like(self.foam_history[-1])

    def evolve(self):
        """Evolve the quantum foam with enhanced physics"""
        now = time.time()
        if now - self.last_evolution > self.evolution_rate:
            # Generate new foam state with sp³ hybridization
            self.hypermatrix.sp3_hybridize()
            base_state = np.random.rand(4)
            new_state = self.hypermatrix.matrix @ base_state
            
            # Apply quantum decoherence
            if len(self.foam_history) > 0:
                prev_state = self.foam_history[-1]
                new_state = 0.8 * self.quantum_decoherence(new_state) + 0.2 * prev_state
                
            # Electron shell transitions
            e1, e2 = self.electron_transition(np.mean(new_state))
            transition_factor = np.exp(-(e2 - e1))
            new_state *= transition_factor
            
            self.foam_history.append(new_state)
            self.last_evolution = now

    def get_foam(self, quantum_state: Optional['QuantumState'] = None, 
                message_hash: float = 0) -> str:
        """Generate quantum foam visualization with enhanced physics"""
        self.evolve()
        
        if len(self.foam_history) == 0:
            self.foam_history.append(np.random.rand(4))
            
        current_foam = self.foam_history[-1]
        base_pattern = []
        
        # Enhanced pattern generation with quantum effects
        for i in range(40):
            # Quantum phase factor
            phase = np.exp(2j * np.pi * current_foam[i % 4])
            # Spacetime curvature effect
            curvature = np.sin(time.time() * 0.1 + message_hash * 0.05)
            # Combine quantum effects
            idx = int(abs(phase.real * curvature * len(self.foam_chars)))
            base_pattern.append(self.foam_chars[idx % len(self.foam_chars)])
            
        if quantum_state is not None:
            # Quantum entanglement effects
            entangled_pattern = self.apply_entanglement(base_pattern, quantum_state)
            base_pattern = entangled_pattern
            
        return "".join(base_pattern[:50])

    def apply_entanglement(self, pattern: List[str], 
                          quantum_state: 'QuantumState') -> List[str]:
        """Apply quantum entanglement effects to pattern"""
        entangled = pattern.copy()
        state_vector = quantum_state.position
        
        for i in range(len(pattern)):
            if random.random() < 0.3:
                # Entanglement influence
                entangle_idx = int(abs(
                    np.dot(state_vector, self.foam_history[-1]) * 
                    len(self.foam_chars)
                ))
                entangled[i] = self.foam_chars[entangle_idx % len(self.foam_chars)]
                
        return entangled

class QuantumState:
    """Represents a quantum state in hyperdimensional space"""
    def __init__(self):
        self.position = np.random.rand(4) * 2 - 1
        self.hyperradius = 1.0
        self.phase = np.random.rand() * 2 * np.pi
        self.foam = QuantumFoam()
        self.entanglement_history = deque(maxlen=10)
        
    def tune(self, hyperradius: float):
        """Tune quantum state's hyperradius"""
        self.hyperradius = max(0.1, min(2.0, hyperradius))
        
    def update_entanglement(self, other_state: 'QuantumState'):
        """Update entanglement history with another state"""
        alignment = self.alignment_with(other_state)
        self.entanglement_history.append((time.time(), alignment))
        
    def alignment_with(self, other: 'QuantumState') -> float:
        """Calculate quantum alignment with enhanced physics"""
        # Spatial alignment in 4D
        distance = np.linalg.norm(self.position - other.position)
        # Phase coherence
        phase_diff = abs(np.cos(self.phase - other.phase))
        # Hyperradius compatibility
        radius_match = 1 - abs(self.hyperradius - other.hyperradius) / 2
        # Entanglement strength
        entangle_factor = self.calculate_entanglement_strength(other)
        
        return max(0, min(1, 
            (1 - distance/4) * phase_diff * radius_match * entangle_factor
        ))
        
    def calculate_entanglement_strength(self, other: 'QuantumState') -> float:
        """Calculate quantum entanglement strength"""
        if not self.entanglement_history:
            return 1.0
            
        # Time decay of entanglement
        current_time = time.time()
        decay_factor = 0.1
        
        strength = 0
        for t, alignment in self.entanglement_history:
            time_diff = current_time - t
            strength += alignment * np.exp(-decay_factor * time_diff)
            
        return min(1.0, strength / len(self.entanglement_history))
        
    def to_json(self) -> Dict:
        """Convert quantum state to JSON representation"""
        return {
            'position': self.position.tolist(),
            'hyperradius': self.hyperradius,
            'phase': float(self.phase),
            'entanglement_history': [
                (float(t), float(a)) 
                for t, a in self.entanglement_history
            ]
        }
        
    @classmethod
    def from_json(cls, data: Dict) -> 'QuantumState':
        """Create quantum state from JSON data"""
        state = cls()
        state.position = np.array(data['position'])
        state.hyperradius = float(data['hyperradius'])
        state.phase = float(data['phase'])
        state.entanglement_history = deque(
            [(float(t), float(a)) for t, a in data.get('entanglement_history', [])],
            maxlen=10
        )
        return state

class HyperMessage:
    """Quantum encrypted message with enhanced encryption"""
    def __init__(self, content: str, quantum_state: QuantumState):
        self.content = content
        self.quantum_state = quantum_state
        self.timestamp = time.time()
        self.foam_state = quantum_state.foam.get_foam(
            quantum_state,
            sum(ord(c) for c in content)
        )
        
    def encrypt(self) -> Dict:
        """Encrypt message using quantum state and foam"""
        # Convert message to quantum phases
        phases = [ord(c) * 2 * np.pi / 256 for c in self.content]
        # Apply quantum transformation
        encrypted_phases = []
        
        for phase in phases:
            # Quantum rotation
            rotated = phase + self.quantum_state.phase
            # Foam influence
            foam_factor = sum(ord(c) for c in self.foam_state) / 1000
            # Entanglement effect
            entangle_factor = np.mean([a for _, a in self.quantum_state.entanglement_history]) if self.quantum_state.entanglement_history else 1.0
            
            encrypted_phase = (rotated * foam_factor * entangle_factor) % (2 * np.pi)
            encrypted_phases.append(encrypted_phase)
            
        return {
            'encrypted_phases': encrypted_phases,
            'foam_state': self.foam_state,
            'timestamp': self.timestamp,
            'sender_state': self.quantum_state.to_json()
        }
        
    def decrypt(self, receiver_state: QuantumState) -> Optional[str]:
        """Decrypt message using receiver's quantum state"""
        try:
            encrypted_data = self.encrypt()
            encrypted_phases = encrypted_data['encrypted_phases']
            
            # Calculate alignment between states
            sender_state = QuantumState.from_json(encrypted_data['sender_state'])
            alignment = receiver_state.alignment_with(sender_state)
            
            if alignment < 0.5:  # Insufficient quantum alignment
                return None
                
            # Reverse quantum transformation
            decrypted_chars = []
            for phase in encrypted_phases:
                # Remove quantum rotation
                unrotated = phase - receiver_state.phase
                # Remove foam influence
                foam_factor = sum(ord(c) for c in encrypted_data['foam_state']) / 1000
                # Remove entanglement effect
                entangle_factor = np.mean([a for _, a in receiver_state.entanglement_history]) if receiver_state.entanglement_history else 1.0
                
                original_phase = (unrotated / (foam_factor * entangle_factor)) % (2 * np.pi)
                char_code = int(original_phase * 256 / (2 * np.pi))
                decrypted_chars.append(chr(char_code))
                
            return ''.join(decrypted_chars)
            
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            return None
            
    def to_json(self) -> Dict:
        """Convert message to JSON format"""
        return {
            'encrypted_data': self.encrypt(),
            'foam_state': self.foam_state,
            'timestamp': self.timestamp
        }
        
    @classmethod
    def from_json(cls, data: Dict, quantum_state: QuantumState) -> 'HyperMessage':
        """Create message from JSON data"""
        msg = cls("", quantum_state)
        msg.foam_state = data['foam_state']
        msg.timestamp = data['timestamp']
        return msg
