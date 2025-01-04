/**
 * Window dragging functionality
 */
export class DragManager {
    constructor() {
        this.draggedElement = null;
        this.offset = { x: 0, y: 0 };
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    }

    /**
     * Initialize dragging for a window element
     * @param {HTMLElement} windowElement - The window element
     * @param {HTMLElement} handleElement - The drag handle element (title bar)
     */
    initializeDragging(windowElement, handleElement) {
        handleElement.addEventListener('mousedown', (e) => this.handleMouseDown(e, windowElement));
    }

    /**
     * Handle mouse down event
     * @param {MouseEvent} e - Mouse event
     * @param {HTMLElement} windowElement - The window element being dragged
     */
    handleMouseDown(e, windowElement) {
        if (e.button !== 0) return; // Only handle left click
        
        this.draggedElement = windowElement;
        const rect = windowElement.getBoundingClientRect();
        
        this.offset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // Add temporary event listeners
        document.addEventListener('mousemove', this.boundHandleMouseMove);
        document.addEventListener('mouseup', this.boundHandleMouseUp);
        
        // Prevent text selection during drag
        e.preventDefault();
    }

    /**
     * Handle mouse move event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        if (!this.draggedElement) return;

        const x = e.clientX - this.offset.x;
        const y = e.clientY - this.offset.y;

        // Keep window within viewport bounds
        const rect = this.draggedElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const boundedX = Math.max(0, Math.min(x, viewportWidth - rect.width));
        const boundedY = Math.max(0, Math.min(y, viewportHeight - rect.height));

        this.draggedElement.style.left = `${boundedX}px`;
        this.draggedElement.style.top = `${boundedY}px`;
    }

    /**
     * Handle mouse up event
     */
    handleMouseUp() {
        this.draggedElement = null;
        document.removeEventListener('mousemove', this.boundHandleMouseMove);
        document.removeEventListener('mouseup', this.boundHandleMouseUp);
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        if (this.draggedElement) {
            this.handleMouseUp();
        }
    }
}
