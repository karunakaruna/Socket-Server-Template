class LogViewer {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.initializeUI();
    }

    initializeUI() {
        // Create log viewer container
        const container = document.createElement('div');
        container.id = 'log-viewer-container';
        container.style.display = 'none';
        container.innerHTML = `
            <div class="log-header">
                <div class="log-controls">
                    <button id="clear-logs">Clear</button>
                    <button id="export-logs">Export</button>
                </div>
            </div>
            <div id="log-content" class="log-content"></div>
        `;

        document.body.appendChild(container);

        // Add event listeners
        document.getElementById('clear-logs').addEventListener('click', () => this.clearLogs());
        document.getElementById('export-logs').addEventListener('click', () => this.exportLogs());

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #log-viewer-container {
                position: fixed;
                top: 60px;
                right: 20px;
                width: 600px;
                height: 80vh;
                background: var(--bg-primary);
                border: 1px solid var(--border);
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                z-index: 1000;
            }

            .log-header {
                padding: 10px;
                border-bottom: 1px solid var(--border);
                display: flex;
                justify-content: flex-end;
                align-items: center;
            }

            .log-controls {
                display: flex;
                gap: 10px;
            }

            .log-content {
                flex: 1;
                overflow-y: auto;
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
                line-height: 1.4;
            }

            .log-entry {
                margin: 2px 0;
                padding: 2px 5px;
                border-radius: 3px;
                white-space: pre-wrap;
            }

            .log-entry:hover {
                background: var(--hover);
            }

            .log-type-info { color: var(--info); }
            .log-type-warn { color: var(--warning); }
            .log-type-error { color: var(--error); }
            .log-type-connection { color: var(--success); }
            .log-type-ping { color: var(--accent); }
            .log-type-metadata { color: var(--update); }
            .log-type-worldtree { color: #b19cd9; font-weight: bold; }
        `;
        document.head.appendChild(style);
    }

    addLog(type, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type,
            message,
            data
        };

        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        this.renderLogs();
        return logEntry;
    }

    renderLogs() {
        const content = document.getElementById('log-content');
        if (!content) return;

        content.innerHTML = this.logs.map(log => {
            const dataStr = log.data ? `\n${JSON.stringify(log.data, null, 2)}` : '';
            return `<div class="log-entry log-type-${log.type.toLowerCase()}">
                <span class="log-time">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span class="log-type">[${log.type}]</span>
                ${log.message}${dataStr}
            </div>`;
        }).join('');

        content.scrollTop = content.scrollHeight;
    }

    clearLogs() {
        this.logs = [];
        this.renderLogs();
    }

    exportLogs() {
        const blob = new Blob([JSON.stringify(this.logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `worldtree-logs-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    show() {
        document.getElementById('log-viewer-container').style.display = 'flex';
    }

    hide() {
        document.getElementById('log-viewer-container').style.display = 'none';
    }

    toggle() {
        const container = document.getElementById('log-viewer-container');
        if (container.style.display === 'none') {
            this.show();
        } else {
            this.hide();
        }
    }
}

// Export for use in dashboard.js
window.LogViewer = LogViewer;
