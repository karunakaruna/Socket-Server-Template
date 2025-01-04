let lastSaveTime = null;

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

function updateLastSave(timestamp) {
    lastSaveTime = timestamp;
    document.getElementById('last-save').textContent = formatTimestamp(timestamp);
}

function addLogEntry(message, type = 'info') {
    const log = document.getElementById('log-container');
    if (!log) return;

    const entry = document.createElement('div');
    entry.className = `log-entry message-type-${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;

    // Keep only last 1000 entries
    while (log.children.length > 1000) {
        log.removeChild(log.firstChild);
    }
}

function updateUserList(users) {
    const userTableBody = document.getElementById('users-table-body');
    if (!userTableBody) {
        console.error('Could not find users-table-body element');
        return;
    }

    // Clear existing rows
    userTableBody.innerHTML = '';
    
    // Update user count
    document.getElementById('user-count').textContent = users.length;
    
    users.forEach(user => {
        const row = document.createElement('tr');
        const displayName = user.username && user.username.trim() ? user.username : `User_${user.id.slice(0, 5)}`;
        const position = `(${user.tx.toFixed(2)}, ${user.ty.toFixed(2)}, ${user.tz.toFixed(2)})`;
        const status = user.afk ? 'AFK' : 'Online';
        const statusClass = user.afk ? 'status-afk' : 'status-online';
        
        row.innerHTML = `
            <td>${displayName}</td>
            <td><span class="badge user">User</span></td>
            <td class="${statusClass}">${status}</td>
            <td>${position}</td>
            <td>${user.description || ''}</td>
        `;
        
        userTableBody.appendChild(row);
    });
}

// System settings and state
const settings = {
    filters: {
        coordinates: true,
        connections: false,
        metadata: false
    },
    textSize: 16,
    theme: 'system'
};

function loadSettings() {
    const savedSettings = localStorage.getItem('worldtree-settings');
    if (savedSettings) {
        Object.assign(settings, JSON.parse(savedSettings));
        applySettings();
    }
}

function saveSettings() {
    localStorage.setItem('worldtree-settings', JSON.stringify(settings));
}

function applySettings() {
    document.getElementById('filter-coordinates').checked = settings.filters.coordinates;
    document.getElementById('filter-connections').checked = settings.filters.connections;
    document.getElementById('filter-metadata').checked = settings.filters.metadata;
    document.getElementById('text-size').value = settings.textSize;
    document.documentElement.style.setProperty('--base-text-size', `${settings.textSize}px`);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    settings.theme = theme;
    saveSettings();
}

function initializeSettings() {
    // Load saved settings
    loadSettings();

    // Initialize filter checkboxes
    document.getElementById('filter-coordinates').addEventListener('change', (e) => {
        settings.filters.coordinates = e.target.checked;
        saveSettings();
    });

    document.getElementById('filter-connections').addEventListener('change', (e) => {
        settings.filters.connections = e.target.checked;
        saveSettings();
    });

    document.getElementById('filter-metadata').addEventListener('change', (e) => {
        settings.filters.metadata = e.target.checked;
        saveSettings();
    });

    // Initialize text size control
    document.getElementById('text-size').addEventListener('change', (e) => {
        settings.textSize = parseInt(e.target.value);
        document.documentElement.style.setProperty('--base-text-size', `${settings.textSize}px`);
        saveSettings();
    });
}

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function detectMobile() {
    const isMobile = isMobileDevice();
    document.body.classList.toggle('mobile-device', isMobile);
    
    // Update viewport meta tag for mobile devices
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
        viewport.content = isMobile ? 
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' :
            'width=device-width, initial-scale=1.0';
    }
}

// Initialize UI when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeSettings();
    detectMobile();
});

// Export functions and variables needed by other modules
export {
    addLogEntry,
    updateUserList,
    settings,
    loadSettings,
    applyTheme,
    detectMobile
};
