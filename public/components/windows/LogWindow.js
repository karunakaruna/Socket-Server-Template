import { BaseWindow } from './BaseWindow.js';

/**
 * Log window component
 */
export class LogWindow extends BaseWindow {
    constructor(eventBus) {
        super('log-window', 'Log', eventBus);
        this.defaultPosition = { x: window.innerWidth - 420, y: window.innerHeight - 300 };
        this.maxLogEntries = 100;
        this.logs = [];
    }

    /**
     * Render window content
     */
    renderContent() {
        return `
            <div class="log-container">
                <div id="log-entries" class="log-entries"></div>
            </div>
        `;
    }

    /**
     * Initialize window content
     */
    initContent() {
        this.setPosition(this.defaultPosition.x, this.defaultPosition.y);
        
        // Subscribe to log events
        this.eventBus.on('log', (data) => this.handleLog(data));
        this.eventBus.on('clearLog', () => this.handleClearLog());
    }

    /**
     * Format timestamp
     */
    formatTimestamp(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `[${hours}:${minutes}:${seconds} PM]`;
    }

    /**
     * Handle log event
     */
    handleLog(data) {
        const timestamp = this.formatTimestamp(new Date());
        const logEntry = { timestamp, message: data.message, type: data.type || 'info' };
        
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogEntries) {
            this.logs.shift();
        }
        
        this.updateLogDisplay();
    }

    /**
     * Handle clear log event
     */
    handleClearLog() {
        this.logs = [];
        this.updateLogDisplay();
    }

    /**
     * Update log display
     */
    updateLogDisplay() {
        const logEntries = this.element.querySelector('#log-entries');
        if (!logEntries) return;

        logEntries.innerHTML = this.logs.map(log => `
            <div class="log-entry ${log.type}">
                <span class="timestamp">${log.timestamp}</span>
                <span class="message">${log.message}</span>
            </div>
        `).join('');

        // Auto-scroll to bottom
        logEntries.scrollTop = logEntries.scrollHeight;
    }
}
