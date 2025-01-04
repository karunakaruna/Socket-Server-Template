/**
 * Base window component that all window components extend
 */
export class BaseWindow {
    constructor(id, title) {
        this.id = id;
        this.title = title;
        this.element = null;
        this.isMinimized = false;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;
    }

    /**
     * Create the window HTML
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
     */
    renderContent() {
        return '';
    }

    /**
     * Initialize the window
     */
    init() {
        this.element = document.getElementById(this.id);
        if (!this.element) {
            throw new Error(`Window element with id "${this.id}" not found`);
        }

        this.initDragging();
        this.initMinimize();
        this.initContent();
    }

    /**
     * Initialize dragging functionality
     */
    initDragging() {
        const titleBar = this.element.querySelector('.window-title');
        
        titleBar.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only handle left click
            
            this.isDragging = true;
            const rect = this.element.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;

            // Keep window within viewport bounds
            const rect = this.element.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const boundedX = Math.max(0, Math.min(x, viewportWidth - rect.width));
            const boundedY = Math.max(0, Math.min(y, viewportHeight - rect.height));

            this.element.style.left = `${boundedX}px`;
            this.element.style.top = `${boundedY}px`;
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
    }

    /**
     * Initialize minimize button
     */
    initMinimize() {
        const minimizeButton = this.element.querySelector('.minimize-button');
        minimizeButton.addEventListener('click', () => {
            this.isMinimized = !this.isMinimized;
            const content = this.element.querySelector('.window-content');
            content.style.display = this.isMinimized ? 'none' : 'block';
            minimizeButton.textContent = this.isMinimized ? '+' : '−';
        });
    }

    /**
     * Initialize window content - override in child classes
     */
    initContent() {}

    /**
     * Set window position
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
            this.element.remove();
        }
    }
}
