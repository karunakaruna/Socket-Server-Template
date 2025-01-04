/**
 * Central event bus for application-wide communication
 */
export class EventBus {
    constructor() {
        this.listeners = new Map();
        this.debug = false;
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        
        if (this.debug) {
            console.log(`[EventBus] Subscribed to: ${event}`);
        }

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
            if (this.debug) {
                console.log(`[EventBus] Unsubscribed from: ${event}`);
            }
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error in event handler for ${event}:`, error);
                }
            });
            if (this.debug) {
                console.log(`[EventBus] Emitted: ${event}`, data);
            }
        }
    }

    /**
     * Enable debug logging
     */
    enableDebug() {
        this.debug = true;
    }
}
