export class TimerWidget {
    constructor(duration) {
        this.duration = duration * 1000; // Convert to milliseconds
        this.circle = document.querySelector('.progress-ring__circle');
        this.circumference = this.circle.r.baseVal.value * 2 * Math.PI;
        this.circle.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
        this.circle.style.strokeDashoffset = this.circumference;
        this.onFinish = null; // Initialize callback as null
    }

    setDuration(seconds) {
        this.duration = seconds * 1000; // Convert to milliseconds
    }

    setCallback(callback) {
        this.onFinish = callback;
    }

    start() {
        console.log('State: Start');
        const startTime = Date.now();
        this.stop(); // Ensure no previous timer is running
        this.interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(this.duration - elapsed, 0);
            const offset = this.circumference * (remaining / this.duration);
            this.circle.style.strokeDashoffset = offset;
            document.querySelector('.time-text').textContent = `${(this.duration - remaining) / 1000}s / ${this.duration / 1000}s`;
            if (remaining <= 0) {
                clearInterval(this.interval);
                this.circle.style.stroke = '#ff9800'; // Change color to orange
                console.log('State: Finished');
                if (this.onFinish) {
                    this.onFinish(); // Call the callback
                }
            }
        }, 100); // Update every 100 milliseconds for smoother animation
    }

    stop() {
        clearInterval(this.interval);
    }

    reset() {
        clearInterval(this.interval);
        this.circle.style.strokeDashoffset = this.circumference;
        document.querySelector('.time-text').textContent = `${this.duration / 1000}s / ${this.duration / 1000}s`;
    }
}

export class SmallTimerWidget {
    constructor(duration) {
        this.duration = duration * 1000; // Convert to milliseconds
        this.circle = document.querySelector('.small-progress-ring__circle');
        this.circumference = this.circle.r.baseVal.value * 2 * Math.PI;
        this.circle.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
        this.circle.style.strokeDashoffset = this.circumference;
        this.onFinish = null;
    }

    setDuration(seconds) {
        this.duration = seconds * 1000;
    }

    start() {
        console.log('Small Timer: Start');
        const startTime = Date.now();
        this.stop();
        this.interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(this.duration - elapsed, 0);
            const offset = this.circumference * (remaining / this.duration);
            this.circle.style.strokeDashoffset = offset;
            
            if (remaining <= 0) {
                clearInterval(this.interval);
                this.circle.style.stroke = '#ff9800';
                console.log('Small Timer: Finished');
                if (this.onFinish) {
                    this.onFinish();
                }
            }
        }, 100);
    }

    stop() {
        clearInterval(this.interval);
    }

    reset() {
        this.stop();
        this.circle.style.strokeDashoffset = this.circumference;
        this.circle.style.stroke = '#4caf50'; // Reset color back to green
    }

    setCallback(callback) {
        this.onFinish = callback;
    }
}
