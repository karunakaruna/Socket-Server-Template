import numpy as np
import random

class QuantumState:
    def __init__(self):
        # Initialize to |0⟩ state
        self.state = np.array([1.0, 0.0], dtype=np.complex128)
        self.foam = np.zeros((32, 32))
        self.update_foam()
        
    def set_state(self, new_state):
        """Set the quantum state vector"""
        state = np.array(new_state, dtype=np.complex128)
        # Normalize the state
        norm = np.linalg.norm(state)
        if norm > 0:
            state = state / norm
        self.state = state
        self.update_foam()
        
    def get_state(self):
        """Get the current state vector"""
        return np.real(self.state)  # For visualization, just use real part
        
    def update_foam(self):
        """Update quantum foam based on current state"""
        # Create interference pattern
        x = np.linspace(-2, 2, 32)
        y = np.linspace(-2, 2, 32)
        X, Y = np.meshgrid(x, y)
        
        # Generate foam pattern based on state
        foam = np.zeros((32, 32))
        for i in range(32):
            for j in range(32):
                r = np.sqrt(X[i,j]**2 + Y[i,j]**2)
                theta = np.arctan2(Y[i,j], X[i,j])
                
                # Create interference between state components
                psi = self.state[0] * np.exp(-r) + self.state[1] * np.exp(-r + 1j*theta)
                foam[i,j] = np.abs(psi)**2
                
        # Normalize foam
        if np.max(foam) > 0:
            foam = foam / np.max(foam)
            
        self.foam = foam
        
    def get_foam(self):
        """Get current quantum foam state"""
        return self.foam
        
    def measure(self):
        """Perform a measurement"""
        prob_0 = np.abs(self.state[0])**2
        if random.random() < prob_0:
            self.state = np.array([1.0, 0.0])
            result = 0
        else:
            self.state = np.array([0.0, 1.0])
            result = 1
        self.update_foam()
        return result
