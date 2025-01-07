import numpy as np
import random

class QuantumState:
    def __init__(self, size=64):
        self.size = size
        self.state = np.random.random(size)
        self.normalize()
        
    def normalize(self):
        norm = np.linalg.norm(self.state)
        if norm > 0:
            self.state = self.state / norm
            
    def get_state(self):
        return self.state
        
    def set_state(self, new_state):
        self.state = np.array(new_state)
        self.normalize()
        
    def get_foam(self):
        """Generate quantum foam visualization data"""
        foam = np.zeros((8, 8))
        for i in range(8):
            for j in range(8):
                idx = i * 8 + j
                if idx < self.size:
                    foam[i,j] = self.state[idx]
        return foam
        
    def collapse(self):
        """Collapse the quantum state"""
        idx = random.randint(0, self.size-1)
        self.state = np.zeros(self.size)
        self.state[idx] = 1.0
