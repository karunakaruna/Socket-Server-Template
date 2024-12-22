const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.logFile = path.join(this.logDir, `worldtree-${new Date().toISOString().split('T')[0]}.log`);
        this.recentLogs = [];
        this.maxRecentLogs = 100;
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(type, message, data = null) {
        const timestamp = new Date().toISOString();
        const logData = data ? ` | ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${type.toUpperCase()}] ${message}${logData}\n`;
    }

    log(type, message, data = null) {
        const logEntry = this.formatMessage(type, message, data);
        
        // Keep track of recent logs in memory
        this.recentLogs.push({
            timestamp: new Date().toISOString(),
            type: type.toUpperCase(),
            message,
            data
        });

        // Trim logs if we exceed the maximum
        if (this.recentLogs.length > this.maxRecentLogs) {
            this.recentLogs = this.recentLogs.slice(-this.maxRecentLogs);
        }
        
        // Append to file
        fs.appendFile(this.logFile, logEntry, (err) => {
            if (err) console.error('Error writing to log file:', err);
        });

        // Also log to console
        console.log(logEntry.trim());
        
        return logEntry;
    }

    getRecentLogs() {
        return this.recentLogs;
    }

    clearRecentLogs() {
        this.recentLogs = [];
    }

    info(message, data = null) {
        return this.log('INFO', message, data);
    }

    warn(message, data = null) {
        return this.log('WARN', message, data);
    }

    error(message, data = null) {
        return this.log('ERROR', message, data);
    }

    connection(message, data = null) {
        return this.log('CONNECTION', message, data);
    }

    ping(message, data = null) {
        return this.log('PING', message, data);
    }
}

module.exports = new Logger();
