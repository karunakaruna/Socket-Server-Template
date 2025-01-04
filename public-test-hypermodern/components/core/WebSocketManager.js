/**
 * Manages WebSocket connection and communication
 */
export class WebSocketManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.pingInterval = null;
        
        this.connect();
    }

    connect() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = 3001; // Match your server port
            
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
            
            setTimeout(() => this.connect(), this.reconnectDelay);
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
                case 'ping':
                    this.eventBus.emit('log', { message: 'Ping received' });
                    break;
                    
                case 'userList':
                    this.eventBus.emit('userListUpdated', { users: data.users });
                    this.eventBus.emit('log', { 
                        message: `User list updated - ${data.users.length} users` 
                    });
                    break;
                    
                case 'userJoined':
                    this.eventBus.emit('userJoined', data.user);
                    this.eventBus.emit('log', { 
                        message: `${data.user.name} joined` 
                    });
                    break;
                    
                case 'userLeft':
                    this.eventBus.emit('userLeft', data.user);
                    this.eventBus.emit('log', { 
                        message: `${data.user.name} left` 
                    });
                    break;
                    
                case 'userUpdated':
                    this.eventBus.emit('userUpdated', data.user);
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    send(type, data = {}) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, ...data }));
        }
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
