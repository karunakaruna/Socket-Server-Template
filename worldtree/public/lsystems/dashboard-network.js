import { addLogEntry, updateUserList } from './dashboard-ui.js';
import { updateUserPosition } from './dashboard-3d.js';

let ws = null;
let isReconnecting = false;
let reconnectAttempts = 0;
let pingCount = 0;
let activeUsers = new Map();
let dashboardViewers = new Map();

function updatePingIndicator(active = true) {
    const indicator = document.getElementById('ping-indicator');
    if (!indicator) return;
    
    indicator.style.backgroundColor = active ? 'var(--success)' : 'var(--error)';
    document.getElementById('ping-count').textContent = pingCount;
}

function handlePingMessage() {
    pingCount++;
    updatePingIndicator(true);
    setTimeout(() => updatePingIndicator(false), 1000);
}

function initWebSocket() {
    if (ws) {
        ws.close();
        ws = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        addLogEntry('Connected to server', 'success');
        isReconnecting = false;
        reconnectAttempts = 0;
        
        // Send initial message to identify as dashboard
        ws.send(JSON.stringify({
            type: 'identify',
            role: 'dashboard',
            deviceType: document.body.classList.contains('mobile-device') ? 'mobile' : 'desktop'
        }));
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        addLogEntry('Disconnected from server', 'error');
        ws = null;
        handleReconnection();
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addLogEntry('WebSocket error occurred', 'error');
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'ping':
                    handlePingMessage();
                    break;
                    
                case 'user_update':
                    if (message.user) {
                        activeUsers.set(message.user.id, message.user);
                        updateUserPosition(message.user.id, message.user);
                        updateUserList(Array.from(activeUsers.values()));
                    }
                    break;
                    
                case 'user_disconnect':
                    if (message.userId) {
                        activeUsers.delete(message.userId);
                        updateUserList(Array.from(activeUsers.values()));
                    }
                    break;
                    
                case 'viewer_update':
                    if (message.viewer) {
                        dashboardViewers.set(message.viewer.id, message.viewer);
                        updateUserList([...Array.from(activeUsers.values()), ...Array.from(dashboardViewers.values())]);
                    }
                    break;
                    
                case 'viewer_disconnect':
                    if (message.viewerId) {
                        dashboardViewers.delete(message.viewerId);
                        updateUserList([...Array.from(activeUsers.values()), ...Array.from(dashboardViewers.values())]);
                    }
                    break;
                    
                default:
                    console.log('Received message:', message);
            }
        } catch (error) {
            console.error('Error processing message:', error);
            addLogEntry('Error processing server message', 'error');
        }
    };
}

function handleReconnection() {
    if (isReconnecting) return;
    
    isReconnecting = true;
    reconnectAttempts++;
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
    addLogEntry(`Reconnecting in ${delay/1000} seconds... (Attempt ${reconnectAttempts})`, 'warning');
    
    setTimeout(() => {
        if (!ws) initWebSocket();
    }, delay);
}

function disconnectWebSocket() {
    if (ws) {
        ws.close();
        ws = null;
        addLogEntry('Manually disconnected from server', 'info');
    }
}

// Initialize WebSocket when page loads
document.addEventListener('DOMContentLoaded', initWebSocket);

// Add disconnect button handler
document.addEventListener('DOMContentLoaded', function() {
    const disconnectBtn = document.getElementById('disconnect-btn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
            if (ws) {
                disconnectWebSocket();
                disconnectBtn.textContent = 'Connect';
            } else {
                initWebSocket();
                disconnectBtn.textContent = 'Disconnect';
            }
        });
    }
});
