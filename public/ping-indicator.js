// Simple ping indicator that works with existing HTML/CSS
class PingIndicator {
    constructor(indicatorId, progressId) {
        this.indicator = document.getElementById(indicatorId);
        this.progress = document.getElementById(progressId);
        
        if (!this.indicator || !this.progress) {
            console.error('Ping indicator elements not found');
            return;
        }
    }

    ping() {
        // Pulse the indicator
        this.indicator.className = 'ping-indicator active';
        
        // Reset and restart progress animation
        this.progress.classList.remove('active');
        void this.progress.offsetWidth; // Force reflow
        this.progress.classList.add('active');
        
        // Reset indicator after pulse
        setTimeout(() => {
            this.indicator.className = 'ping-indicator inactive';
        }, 300);
    }

    stop() {
        this.indicator.className = 'ping-indicator inactive';
        this.progress.classList.remove('active');
    }
}

// Export for use in other files
window.PingIndicator = PingIndicator;
