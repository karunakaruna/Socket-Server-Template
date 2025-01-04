/**
 * Manages WebSocket client connection and communication
 */
export class WebSocketClient {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.socket = null;
        this.userId = null;
        this.secret = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.pingInterval = null;
        
        // Load saved credentials
        this.loadCredentials();
        
        // Connect to server
        this.connect();
    }

    loadCredentials() {
        try {
            const savedCredentials = localStorage.getItem('worldtree_credentials');
            if (savedCredentials) {
                const { userId, secret } = JSON.parse(savedCredentials);
                this.userId = userId;
                this.secret = secret;
            }
        } catch (error) {
            console.error('Error loading credentials:', error);
        }
    }

    saveCredentials() {
        try {
            localStorage.setItem('worldtree_credentials', JSON.stringify({
                userId: this.userId,
                secret: this.secret
            }));
        } catch (error) {
            console.error('Error saving credentials:', error);
        }
    }

    connect() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = 3001;
            
            this.socket = new WebSocket(`${protocol}//${host}:${port}`);
            
            this.socket.onopen = () => this.handleOpen();
            this.socket.onclose = () => this.handleClose();
            this.socket.onerror = (error) => this.handleError(error);
            this.socket.onmessage = (event) => this.handleMessage(event);
            
            this.eventBus.emit('log', { message: 'Connecting to server...' });
        } catch (error) {
            this.eventBus.emit('log', { 
                message: `WebSocket connection error: ${error.message}`, 
                type: 'error' 
            });
        }
    }

    handleOpen() {
        this.reconnectAttempts = 0;
        this.eventBus.emit('log', { message: 'Connected to server' });
        
        // Try to reconnect with saved credentials
        if (this.userId && this.secret) {
            this.send('reconnect', {
                userId: this.userId,
                secret: this.secret
            });
        }
        
        // Start ping interval
        this.pingInterval = setInterval(() => {
            this.send('ping');
        }, 5000);
    }

    handleClose() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        this.eventBus.emit('log', { 
            message: 'Disconnected from server', 
            type: 'warning' 
        });

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.eventBus.emit('log', { 
                message: `Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`, 
                type: 'warning' 
            });
            
            setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
        } else {
            this.eventBus.emit('log', { 
                message: 'Failed to reconnect to server', 
                type: 'error' 
            });
        }
    }

    handleError(error) {
        this.eventBus.emit('log', { 
            message: `WebSocket error: ${error.message}`, 
            type: 'error' 
        });
    }

    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'welcome':
                    this.handleWelcome(data);
                    break;
                    
                case 'ping':
                    this.eventBus.emit('log', { message: 'Ping received' });
                    break;
                    
                case 'userList':
                    this.eventBus.emit('userListUpdated', { users: data.users });
                    this.eventBus.emit('log', { 
                        message: `User list updated - ${data.users.length} users` 
                    });
                    break;
                    
                case 'error':
                    this.eventBus.emit('log', { 
                        message: data.message, 
                        type: 'error' 
                    });
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    handleWelcome(data) {
        this.userId = data.user.id;
        this.secret = data.secret;
        this.saveCredentials();
        
        this.eventBus.emit('log', { 
            message: `Connected as ${data.user.name}` 
        });
    }

    send(type, data = {}) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, ...data }));
        }
    }

    updatePosition(position) {
        this.send('updatePosition', { position });
    }

    updateMetadata(metadata) {
        this.send('updateMetadata', { metadata });
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
}
