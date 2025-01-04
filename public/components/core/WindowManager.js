/**
 * Manages all window components in the application
 */
export class WindowManager {
    constructor(eventBus) {
        this.windows = new Map();
        this.eventBus = eventBus;
        this.layouts = new Map();
        
        // Bind event handlers
        this.handleWindowReady = this.handleWindowReady.bind(this);
        this.handleWindowMinimize = this.handleWindowMinimize.bind(this);
        
        // Subscribe to events
        this.eventBus.on('windowReady', this.handleWindowReady);
        this.eventBus.on('windowMinimize', this.handleWindowMinimize);
    }

    /**
     * Add a window to the manager
     * @param {BaseWindow} windowComponent - Window component instance
     */
    addWindow(windowComponent) {
        this.windows.set(windowComponent.id, windowComponent);
        
        // Insert window HTML into DOM
        document.body.insertAdjacentHTML('beforeend', windowComponent.createTemplate());
        
        // Initialize window
        windowComponent.init();
    }

    /**
     * Remove a window from the manager
     * @param {string} windowId - Window ID
     */
    removeWindow(windowId) {
        const window = this.windows.get(windowId);
        if (window) {
            window.destroy();
            this.windows.delete(windowId);
        }
    }

    /**
     * Handle window ready event
     * @param {Object} data - Event data
     */
    handleWindowReady(data) {
        const window = this.windows.get(data.id);
        if (window) {
            // Apply saved position if available
            const layout = this.layouts.get(data.id);
            if (layout) {
                window.setPosition(layout.x, layout.y);
            }
        }
    }

    /**
     * Handle window minimize event
     * @param {Object} data - Event data
     */
    handleWindowMinimize(data) {
        // You can add additional handling here
        this.eventBus.emit('layoutChanged', {
            windowId: data.id,
            minimized: data.minimized
        });
    }

    /**
     * Save current window layout
     * @returns {Object} Layout data
     */
    saveLayout() {
        const layout = {};
        this.windows.forEach((window, id) => {
            if (window.element) {
                const rect = window.element.getBoundingClientRect();
                layout[id] = {
                    x: rect.left,
                    y: rect.top,
                    minimized: window.isMinimized
                };
            }
        });
        return layout;
    }

    /**
     * Load window layout
     * @param {Object} layout - Layout data
     */
    loadLayout(layout) {
        Object.entries(layout).forEach(([id, pos]) => {
            this.layouts.set(id, pos);
            const window = this.windows.get(id);
            if (window) {
                window.setPosition(pos.x, pos.y);
                if (pos.minimized !== window.isMinimized) {
                    window.toggleMinimize();
                }
            }
        });
    }

    /**
     * Clean up all windows
     */
    destroy() {
        this.windows.forEach(window => window.destroy());
        this.windows.clear();
        this.layouts.clear();
        
        // Unsubscribe from events
        this.eventBus.off('windowReady', this.handleWindowReady);
        this.eventBus.off('windowMinimize', this.handleWindowMinimize);
    }
}
