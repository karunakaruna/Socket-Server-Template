import { BaseWindow } from './BaseWindow.js';

/**
 * Connected users window component
 */
export class UsersWindow extends BaseWindow {
    constructor(eventBus) {
        super('users-window', 'Connected Users', eventBus);
        this.users = new Map();
        this.defaultPosition = { x: 20, y: 120 };
    }

    /**
     * Render window content
     */
    renderContent() {
        return `
            <div class="users-list">
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Position</th>
                            <th>Info</th>
                        </tr>
                    </thead>
                    <tbody id="users-table-body">
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Initialize window content
     */
    initContent() {
        this.setPosition(this.defaultPosition.x, this.defaultPosition.y);
        
        // Subscribe to user events
        this.eventBus.on('userJoined', (data) => this.handleUserJoined(data));
        this.eventBus.on('userLeft', (data) => this.handleUserLeft(data));
        this.eventBus.on('userUpdated', (data) => this.handleUserUpdated(data));
        this.eventBus.on('userListUpdated', (data) => this.handleUserListUpdated(data));
    }

    /**
     * Handle user joined event
     */
    handleUserJoined(data) {
        this.users.set(data.id, data);
        this.updateUsersList();
    }

    /**
     * Handle user left event
     */
    handleUserLeft(data) {
        this.users.delete(data.id);
        this.updateUsersList();
    }

    /**
     * Handle user updated event
     */
    handleUserUpdated(data) {
        this.users.set(data.id, { ...this.users.get(data.id), ...data });
        this.updateUsersList();
    }

    /**
     * Handle user list updated event
     */
    handleUserListUpdated(data) {
        this.users.clear();
        data.users.forEach(user => this.users.set(user.id, user));
        this.updateUsersList();
    }

    /**
     * Update users list in the UI
     */
    updateUsersList() {
        const tbody = this.element.querySelector('#users-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        [...this.users.values()].forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.isHost ? '⭐ ' : ''}${user.name}</td>
                <td><span class="user-type">${user.type}</span></td>
                <td>${user.status}</td>
                <td>(${user.position?.x.toFixed(2)}, ${user.position?.y.toFixed(2)}, ${user.position?.z.toFixed(2)})</td>
                <td>${user.info || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}
