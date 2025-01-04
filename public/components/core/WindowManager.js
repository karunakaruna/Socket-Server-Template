/**
 * Manages draggable windows in the application
 */
export class WindowManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.windows = new Map();
        this.activeWindow = null;
        this.offset = { x: 0, y: 0 };
        
        // Bind event handlers
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        
        // Add global mouse event listeners
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    }

    /**
     * Initialize a window with drag functionality
     * @param {string} id - Window element ID
     * @param {Object} options - Window options
     */
    initializeWindow(id, options = {}) {
        const windowElement = document.getElementById(id);
        if (!windowElement) return;
        
        // Set initial position
        if (options.position) {
            windowElement.style.left = `${options.position.x}px`;
            windowElement.style.top = `${options.position.y}px`;
        }
        
        // Store window data
        this.windows.set(id, {
            element: windowElement,
            header: windowElement.querySelector('.window-header'),
            options
        });
        
        // Add event listeners
        const header = windowElement.querySelector('.window-header');
        if (header) {
            header.addEventListener('mousedown', (e) => this.onMouseDown(e, id));
        }
        
        const closeButton = windowElement.querySelector('.window-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.toggleWindow(id));
        }
        
        // Restore saved position
        this.restoreWindowPosition(id);
    }

    /**
     * Handle mouse down event on window header
     */
    onMouseDown(event, windowId) {
        if (event.button !== 0) return; // Only handle left click
        
        const windowData = this.windows.get(windowId);
        if (!windowData) return;
        
        this.activeWindow = windowData;
        
        const rect = windowData.element.getBoundingClientRect();
        this.offset = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        // Bring window to front
        this.bringToFront(windowId);
        
        event.preventDefault();
    }

    /**
     * Handle mouse move event for dragging
     */
    onMouseMove(event) {
        if (!this.activeWindow) return;
        
        const x = event.clientX - this.offset.x;
        const y = event.clientY - this.offset.y;
        
        // Keep window within viewport
        const maxX = window.innerWidth - this.activeWindow.element.offsetWidth;
        const maxY = window.innerHeight - this.activeWindow.element.offsetHeight;
        
        this.activeWindow.element.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
        this.activeWindow.element.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
        
        this.saveWindowPosition(this.activeWindow.element.id);
    }

    /**
     * Handle mouse up event to end dragging
     */
    onMouseUp() {
        this.activeWindow = null;
    }

    /**
     * Toggle window visibility
     */
    toggleWindow(id) {
        const windowData = this.windows.get(id);
        if (!windowData) return;
        
        windowData.element.style.display = 
            windowData.element.style.display === 'none' ? 'block' : 'none';
        
        this.saveWindowState(id);
    }

    /**
     * Bring window to front
     */
    bringToFront(id) {
        const windowData = this.windows.get(id);
        if (!windowData) return;
        
        let maxZ = 0;
        this.windows.forEach(data => {
            const z = parseInt(getComputedStyle(data.element).zIndex) || 0;
            maxZ = Math.max(maxZ, z);
        });
        
        windowData.element.style.zIndex = maxZ + 1;
    }

    /**
     * Save window position to localStorage
     */
    saveWindowPosition(id) {
        const windowData = this.windows.get(id);
        if (!windowData) return;
        
        try {
            const state = {
                left: windowData.element.style.left,
                top: windowData.element.style.top,
                display: windowData.element.style.display
            };
            
            localStorage.setItem(`window_${id}`, JSON.stringify(state));
        } catch (error) {
            console.error('Error saving window position:', error);
        }
    }

    /**
     * Restore window position from localStorage
     */
    restoreWindowPosition(id) {
        const windowData = this.windows.get(id);
        if (!windowData) return;
        
        try {
            const savedState = localStorage.getItem(`window_${id}`);
            if (savedState) {
                const state = JSON.parse(savedState);
                Object.assign(windowData.element.style, state);
            }
        } catch (error) {
            console.error('Error restoring window position:', error);
        }
    }

    /**
     * Save window state (visibility)
     */
    saveWindowState(id) {
        const windowData = this.windows.get(id);
        if (!windowData) return;
        
        try {
            localStorage.setItem(`window_${id}_visible`, 
                windowData.element.style.display !== 'none');
        } catch (error) {
            console.error('Error saving window state:', error);
        }
    }

    /**
     * Clean up event listeners
     */
    dispose() {
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        
        this.windows.clear();
    }
}
