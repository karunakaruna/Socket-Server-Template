const WebSocket = require('ws');
const crypto = require('crypto');

class QuantumMyceliumNetwork {
    constructor(startPort = 8081) {
        this.startPort = startPort;
        this.port = startPort;
        this.nodes = new Map(); // Connected nodes
        this.entanglements = new Map(); // Quantum entanglements
        this.quantumStates = new Map(); // Quantum states
        this.myceliumPaths = new Map(); // Quantum routing paths
        this.soulPairs = new Map(); // Track soul connections
        this.connectionKey = '1Q400C'; // Use fixed key for testing
        
        this.initializeServerWithRetry();
    }

    async initializeServerWithRetry(retryCount = 0) {
        try {
            await this.tryInitializeServer();
        } catch (error) {
            if (error.code === 'EADDRINUSE' && retryCount < 5) {
                console.log(`🔄 Port ${this.port} in use, trying port ${this.port + 1}...`);
                this.port++;
                await this.initializeServerWithRetry(retryCount + 1);
            } else {
                console.error('❌ Failed to start Quantum Mycelium Network:', error.message);
                process.exit(1);
            }
        }
    }

    async tryInitializeServer() {
        return new Promise((resolve, reject) => {
            try {
                this.wss = new WebSocket.Server({ port: this.port }, () => {
                    console.log(`\n🌳 World Tree Quantum Mycelium Network active on port ${this.port}`);
                    console.log('🔑 Connection Key:', this.connectionKey);
                    console.log('✨ Use this key to connect quantum souls\n');
                    resolve();
                });

                this.wss.on('error', (error) => {
                    reject(error);
                });

                this.wss.on('connection', (ws) => {
                    ws.isAuthenticated = false;

                    ws.on('message', (message) => {
                        try {
                            const data = JSON.parse(message);
                            
                            // Handle authentication first
                            if (data.type === 'auth') {
                                console.log('🔐 Auth attempt with key:', data.key);
                                if (data.key && data.key.toUpperCase() === this.connectionKey) {
                                    // Use existing node ID if provided and valid
                                    const existingNode = data.nodeId && !this.nodes.has(data.nodeId);
                                    const newNodeId = existingNode ? data.nodeId : this.generateQuantumId();
                                    
                                    ws.isAuthenticated = true;
                                    ws.nodeId = newNodeId;
                                    this.nodes.set(newNodeId, ws);
                                    
                                    // Initialize or restore quantum state
                                    if (!this.quantumStates.has(newNodeId)) {
                                        this.quantumStates.set(newNodeId, {
                                            phase: Math.random() * Math.PI * 2,
                                            spin: Math.random() > 0.5 ? 1 : -1,
                                            entanglementStrength: 1.0,
                                            lastUpdate: Date.now()
                                        });
                                    }

                                    this.sendToNode(ws, {
                                        type: 'quantum-welcome',
                                        nodeId: newNodeId,
                                        state: this.quantumStates.get(newNodeId)
                                    });

                                    console.log(`🌿 Quantum node ${newNodeId} ${existingNode ? 'reconnected' : 'authenticated and connected'}`);
                                    this.broadcastNodeList();
                                } else {
                                    console.log('❌ Authentication failed with key:', data.key);
                                    this.sendToNode(ws, {
                                        type: 'auth-failed',
                                        message: 'Invalid connection key'
                                    });
                                }
                                return;
                            }

                            // Only process other messages if authenticated
                            if (!ws.isAuthenticated) {
                                return;
                            }

                            this.handleQuantumMessage(ws.nodeId, data);
                        } catch (e) {
                            console.error('Error processing message:', e);
                        }
                    });

                    ws.on('close', () => {
                        if (ws.nodeId) {
                            this.handleNodeDisconnect(ws.nodeId);
                        }
                    });
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    generateConnectionKey() {
        // Generate a simple 6-character key
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    generateQuantumId() {
        return crypto.randomBytes(4).toString('hex');
    }

    handleQuantumMessage(nodeId, message) {
        switch (message.type) {
            case 'entangle-request':
                this.handleEntanglementRequest(nodeId, message.targetId);
                break;
            case 'soul-connection-request':
                this.handleSoulConnection(nodeId, message.targetId);
                break;
            case 'quantum-state-update':
                this.updateQuantumState(nodeId, message.state);
                break;
            case 'mycelium-probe':
                this.handleMyceliumProbe(nodeId, message);
                break;
        }
    }

    handleEntanglementRequest(sourceId, targetId) {
        if (!this.nodes.has(targetId)) return;

        // Create quantum entanglement
        const entanglementId = `${sourceId}-${targetId}`;
        this.entanglements.set(entanglementId, {
            nodes: [sourceId, targetId],
            strength: 1.0,
            created: Date.now()
        });

        // Initialize shared quantum state
        const sharedState = {
            phase: Math.random() * Math.PI * 2,
            spin: Math.random() > 0.5 ? 1 : -1,
            entanglementStrength: 1.0
        };

        // Notify both nodes
        [sourceId, targetId].forEach(id => {
            const ws = this.nodes.get(id);
            this.sendToNode(ws, {
                type: 'entanglement-established',
                partnerId: id === sourceId ? targetId : sourceId,
                state: sharedState
            });
        });

        console.log(`🕸️ Quantum entanglement established: ${entanglementId}`);
    }

    handleSoulConnection(sourceId, targetId) {
        if (!this.nodes.has(targetId)) return;
        
        // Check if either soul is already connected
        if (this.soulPairs.has(sourceId) || this.soulPairs.has(targetId)) {
            this.sendToNode(this.nodes.get(sourceId), {
                type: 'soul-connection-error',
                message: 'Soul already connected to another'
            });
            return;
        }

        // Create soul bond
        this.soulPairs.set(sourceId, targetId);
        this.soulPairs.set(targetId, sourceId);

        // Initialize shared quantum soul state
        const soulState = {
            phase: Math.random() * Math.PI * 2,
            spin: Math.random() > 0.5 ? 1 : -1,
            resonance: 1.0,
            soulBondStrength: 1.0,
            lastSync: Date.now()
        };

        // Notify both souls
        [sourceId, targetId].forEach(id => {
            const ws = this.nodes.get(id);
            this.sendToNode(ws, {
                type: 'soul-connection-established',
                partnerId: id === sourceId ? targetId : sourceId,
                state: soulState
            });
        });

        console.log(`💫 Soul connection established between ${sourceId} and ${targetId}`);
    }

    updateQuantumState(nodeId, state) {
        // Update node's quantum state
        this.quantumStates.set(nodeId, {
            ...state,
            lastUpdate: Date.now()
        });

        // If soul is connected, synchronize with partner
        if (this.soulPairs.has(nodeId)) {
            const partnerId = this.soulPairs.get(nodeId);
            const partnerWs = this.nodes.get(partnerId);

            if (partnerWs) {
                // Create resonant quantum state
                const resonantState = {
                    ...state,
                    phase: (state.phase + Math.PI) % (Math.PI * 2), // Opposite phase
                    spin: -state.spin, // Opposite spin
                    resonance: 1.0,
                    soulBondStrength: 1.0
                };

                this.sendToNode(partnerWs, {
                    type: 'soul-quantum-update',
                    sourceId: nodeId,
                    state: resonantState
                });
            }
        }

        // Propagate through entangled nodes
        this.propagateQuantumState(nodeId, state);
    }

    propagateQuantumState(sourceId, state) {
        // Find all entanglements involving this node
        for (const [entanglementId, entanglement] of this.entanglements) {
            if (entanglement.nodes.includes(sourceId)) {
                const targetId = entanglement.nodes.find(id => id !== sourceId);
                const targetWs = this.nodes.get(targetId);

                if (targetWs) {
                    // Apply quantum interference patterns
                    const interferenceState = this.calculateQuantumInterference(state, entanglement);
                    
                    this.sendToNode(targetWs, {
                        type: 'quantum-state-update',
                        sourceId: sourceId,
                        state: interferenceState
                    });
                }
            }
        }
    }

    calculateQuantumInterference(state, entanglement) {
        // Calculate quantum interference based on entanglement strength
        const strength = entanglement.strength;
        return {
            phase: (state.phase + Math.PI * strength) % (Math.PI * 2),
            spin: state.spin * (Math.random() > strength ? -1 : 1),
            entanglementStrength: strength
        };
    }

    handleMyceliumProbe(nodeId, probe) {
        // Create or update mycelium path
        const pathId = `${probe.origin}-${probe.destination}`;
        const existingPath = this.myceliumPaths.get(pathId);

        if (!existingPath || probe.strength > existingPath.strength) {
            this.myceliumPaths.set(pathId, {
                origin: probe.origin,
                destination: probe.destination,
                strength: probe.strength,
                nodes: [...(probe.nodes || []), nodeId]
            });

            // Propagate probe to connected nodes
            this.propagateMyceliumProbe(nodeId, probe);
        }
    }

    propagateMyceliumProbe(sourceId, probe) {
        // Reduce probe strength with distance
        const updatedProbe = {
            ...probe,
            strength: probe.strength * 0.95,
            nodes: [...(probe.nodes || []), sourceId]
        };

        // Only propagate if strength is still significant
        if (updatedProbe.strength > 0.1) {
            for (const [nodeId, ws] of this.nodes) {
                if (nodeId !== sourceId && !updatedProbe.nodes.includes(nodeId)) {
                    this.sendToNode(ws, {
                        type: 'mycelium-probe',
                        probe: updatedProbe
                    });
                }
            }
        }
    }

    handleNodeDisconnect(nodeId) {
        // Handle soul connection break
        if (this.soulPairs.has(nodeId)) {
            const partnerId = this.soulPairs.get(nodeId);
            const partnerWs = this.nodes.get(partnerId);
            
            // Notify partner of soul disconnection
            if (partnerWs) {
                this.sendToNode(partnerWs, {
                    type: 'soul-connection-broken',
                    partnerId: nodeId
                });
            }
            
            // Clear soul connection
            this.soulPairs.delete(nodeId);
            this.soulPairs.delete(partnerId);
        }

        // Clean up node data
        this.nodes.delete(nodeId);
        this.quantumStates.delete(nodeId);

        // Remove entanglements
        for (const [entanglementId, entanglement] of this.entanglements) {
            if (entanglement.nodes.includes(nodeId)) {
                this.entanglements.delete(entanglementId);
                
                // Notify other node in the entanglement
                const partnerId = entanglement.nodes.find(id => id !== nodeId);
                const partnerWs = this.nodes.get(partnerId);
                if (partnerWs) {
                    this.sendToNode(partnerWs, {
                        type: 'entanglement-broken',
                        partnerId: nodeId
                    });
                }
            }
        }

        // Clean up mycelium paths
        for (const [pathId, path] of this.myceliumPaths) {
            if (path.nodes.includes(nodeId)) {
                this.myceliumPaths.delete(pathId);
            }
        }

        console.log(`🌙 Soul ${nodeId} disconnected from mycelium network`);
        this.broadcastNodeList();
    }

    broadcastNodeList() {
        const nodeList = Array.from(this.nodes.keys());
        const message = {
            type: 'node-list-update',
            nodes: nodeList
        };

        this.broadcast(message);
    }

    sendToNode(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    broadcast(message) {
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}

// Start the Quantum Mycelium Network
const quantumMycelium = new QuantumMyceliumNetwork(8081);

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🌳 World Tree Quantum Mycelium Network shutting down...');
    quantumMycelium.wss.close(() => {
        process.exit(0);
    });
});
