import { EventBus } from './utils/EventBus.js';
import { WindowManager } from './components/core/WindowManager.js';
import { ThreeScene } from './components/core/ThreeScene.js';
import { WebSocketManager } from './components/core/WebSocketManager.js';
import { ControlsWindow } from './components/windows/ControlsWindow.js';
import { UsersWindow } from './components/windows/UsersWindow.js';
import { LSystemInfoWindow } from './components/windows/LSystemInfoWindow.js';
import { LogWindow } from './components/windows/LogWindow.js';

/**
 * Main application class
 */
class DashMerged {
    constructor() {
        // Initialize core systems
        this.eventBus = new EventBus();
        this.windowManager = new WindowManager(this.eventBus);
        this.threeScene = new ThreeScene(this.eventBus);
        this.webSocket = new WebSocketManager(this.eventBus);
        
        // Initialize components
        this.initializeComponents();
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Log startup
        this.eventBus.emit('log', { message: 'Connected to server' });
    }

    /**
     * Initialize all components
     */
    initializeComponents() {
        // Create windows
        const controlsWindow = new ControlsWindow(this.eventBus);
        const usersWindow = new UsersWindow(this.eventBus);
        const lsystemInfoWindow = new LSystemInfoWindow(this.eventBus);
        const logWindow = new LogWindow(this.eventBus);

        // Add windows to manager
        this.windowManager.addWindow(controlsWindow);
        this.windowManager.addWindow(usersWindow);
        this.windowManager.addWindow(lsystemInfoWindow);
        this.windowManager.addWindow(logWindow);
    }

    /**
     * Setup application-wide event handlers
     */
    setupEventHandlers() {
        // Layout management
        this.eventBus.on('saveLayout', () => {
            const layout = this.windowManager.saveLayout();
            const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'window-layout.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        this.eventBus.on('loadLayout', async (data) => {
            try {
                const text = await data.file.text();
                const layout = JSON.parse(text);
                this.windowManager.loadLayout(layout);
            } catch (error) {
                console.error('Error loading layout:', error);
                this.eventBus.emit('log', { 
                    message: `Error loading layout: ${error.message}`, 
                    type: 'error' 
                });
            }
        });

        // Handle window beforeunload
        window.addEventListener('beforeunload', () => {
            this.windowManager.destroy();
            this.threeScene.dispose();
            this.webSocket.disconnect();
        });
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DashMerged();
});
