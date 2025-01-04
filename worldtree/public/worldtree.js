import { EventBus } from './utils/EventBus.js';
import { ThreeScene } from './components/core/ThreeScene.js';
import { WebSocketClient } from './components/core/WebSocketClient.js';
import { WindowManager } from './components/core/WindowManager.js';

/**
 * Main application class for WorldTree Visualizer
 */
class WorldTree {
    constructor() {
        // Initialize core components
        this.eventBus = new EventBus();
        this.threeScene = new ThreeScene(this.eventBus);
        this.webSocket = new WebSocketClient(this.eventBus);
        this.windowManager = new WindowManager(this.eventBus);
        
        // Initialize UI
        this.initializeUI();
        
        // Setup event handlers
        this.setupEventHandlers();
    }

    initializeUI() {
        // Initialize windows
        this.windowManager.initializeWindow('users-window', {
            title: 'Connected Users',
            position: { x: 20, y: 20 }
        });
        
        this.windowManager.initializeWindow('controls-window', {
            title: 'Scene Controls',
            position: { x: window.innerWidth - 220, y: 20 }
        });
        
        this.windowManager.initializeWindow('log-window', {
            title: 'Log',
            position: { x: 20, y: window.innerHeight - 220 }
        });
        
        // Initialize controls
        document.getElementById('auto-rotate').addEventListener('change', (e) => {
            this.eventBus.emit('toggleAutoRotate');
        });
        
        document.getElementById('show-grid').addEventListener('change', (e) => {
            this.eventBus.emit('toggleGrid');
        });
        
        document.getElementById('mute-audio').addEventListener('change', (e) => {
            this.eventBus.emit('toggleAudio');
        });
    }

    setupEventHandlers() {
        // User list updates
        this.eventBus.on('userListUpdated', (data) => {
            this.updateUserList(data.users);
        });
        
        // Log messages
        this.eventBus.on('log', (data) => {
            this.addLogMessage(data.message, data.type);
        });
    }

    updateUserList(users) {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            
            const status = document.createElement('div');
            status.className = `user-status ${user.status.toLowerCase()}`;
            
            const name = document.createElement('span');
            name.textContent = user.name;
            
            userItem.appendChild(status);
            userItem.appendChild(name);
            usersList.appendChild(userItem);
        });
    }

    addLogMessage(message, type = 'info') {
        const logMessages = document.getElementById('log-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `log-message ${type}`;
        messageElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        logMessages.appendChild(messageElement);
        logMessages.scrollTop = logMessages.scrollHeight;
        
        // Limit number of messages
        while (logMessages.children.length > 100) {
            logMessages.removeChild(logMessages.firstChild);
        }
    }
}

// Start application
window.addEventListener('DOMContentLoaded', () => {
    window.app = new WorldTree();
});
