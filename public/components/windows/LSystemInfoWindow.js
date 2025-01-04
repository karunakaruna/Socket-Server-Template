import { BaseWindow } from './BaseWindow.js';

/**
 * L-System info window component
 */
export class LSystemInfoWindow extends BaseWindow {
    constructor(eventBus) {
        super('lsystem-info-window', 'L-System Info', eventBus);
        this.defaultPosition = { x: 20, y: 400 };
        this.currentSystem = null;
    }

    /**
     * Render window content
     */
    renderContent() {
        return `
            <div class="lsystem-info">
                <div class="info-row">
                    <label>Name:</label>
                    <span id="lsystem-name">-</span>
                </div>
                <div class="info-row">
                    <label>Author:</label>
                    <span id="lsystem-author">-</span>
                </div>
                <div class="info-row">
                    <label>Created:</label>
                    <span id="lsystem-created">-</span>
                </div>
                <div class="info-row">
                    <label>Iterations:</label>
                    <span id="lsystem-iterations">-</span>
                </div>
                <div class="info-row description">
                    <label>Description:</label>
                    <p id="lsystem-description">-</p>
                </div>
            </div>
        `;
    }

    /**
     * Initialize window content
     */
    initContent() {
        this.setPosition(this.defaultPosition.x, this.defaultPosition.y);
        
        // Subscribe to L-System events
        this.eventBus.on('lsystemLoaded', (data) => this.handleLSystemLoaded(data));
        this.eventBus.on('lsystemUnloaded', () => this.handleLSystemUnloaded());
    }

    /**
     * Handle L-System loaded event
     */
    handleLSystemLoaded(data) {
        this.currentSystem = data;
        this.updateInfo();
    }

    /**
     * Handle L-System unloaded event
     */
    handleLSystemUnloaded() {
        this.currentSystem = null;
        this.updateInfo();
    }

    /**
     * Update L-System info in the UI
     */
    updateInfo() {
        const nameEl = this.element.querySelector('#lsystem-name');
        const authorEl = this.element.querySelector('#lsystem-author');
        const createdEl = this.element.querySelector('#lsystem-created');
        const iterationsEl = this.element.querySelector('#lsystem-iterations');
        const descriptionEl = this.element.querySelector('#lsystem-description');

        if (this.currentSystem) {
            nameEl.textContent = this.currentSystem.name;
            authorEl.textContent = this.currentSystem.author;
            createdEl.textContent = new Date(this.currentSystem.created).toLocaleDateString();
            iterationsEl.textContent = this.currentSystem.iterations;
            descriptionEl.textContent = this.currentSystem.description;
        } else {
            nameEl.textContent = '-';
            authorEl.textContent = '-';
            createdEl.textContent = '-';
            iterationsEl.textContent = '-';
            descriptionEl.textContent = '-';
        }
    }
}
