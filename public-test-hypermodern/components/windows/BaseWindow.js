import { DragManager } from '../../utils/DragAndDrop.js';

/**
 * Base window component that all window components extend
 */
export class BaseWindow {
    constructor(id, title, eventBus) {
        this.id = id;
        this.title = title;
        this.eventBus = eventBus;
        this.element = null;
        this.dragManager = new DragManager();
        this.isMinimized = false;
    }

    /**
     * Create the window HTML
     * @returns {string} Window HTML
     */
    createTemplate() {
        return `
            <div id="${this.id}" class="window">
                <div class="window-title">
                    <span class="window-title-text">${this.title}</span>
                    <button class="minimize-button">−</button>
                </div>
                <div class="window-content">
                    ${this.renderContent()}
                </div>
            </div>
        `;
    }

    /**
     * Render window content - override in child classes
     * @returns {string} Content HTML
     */
    renderContent() {
        return '';
    }

    /**
     * Initialize the window
     */
    init() {
        // Get window element
        this.element = document.getElementById(this.id);
        if (!this.element) {
            throw new Error(`Window element with id "${this.id}" not found`);
        }

        // Setup dragging
        const titleBar = this.element.querySelector('.window-title');
        this.dragManager.initializeDragging(this.element, titleBar);

        // Setup minimize button
        const minimizeButton = this.element.querySelector('.minimize-button');
        minimizeButton.addEventListener('click', () => this.toggleMinimize());

        // Initialize content
        this.initContent();

        // Emit ready event
        this.eventBus.emit('windowReady', { id: this.id });
    }

    /**
     * Initialize window content - override in child classes
     */
    initContent() {}

    /**
     * Toggle window minimize state
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        const content = this.element.querySelector('.window-content');
        content.style.display = this.isMinimized ? 'none' : 'block';
        
        const button = this.element.querySelector('.minimize-button');
        button.textContent = this.isMinimized ? '+' : '−';

        this.eventBus.emit('windowMinimize', {
            id: this.id,
            minimized: this.isMinimized
        });
    }

    /**
     * Set window position
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    setPosition(x, y) {
        if (this.element) {
            this.element.style.left = `${x}px`;
            this.element.style.top = `${y}px`;
        }
    }

    /**
     * Clean up window
     */
    destroy() {
        if (this.element) {
            this.dragManager.destroy();
            this.element.remove();
        }
    }
}
