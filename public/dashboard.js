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
    // Skip coordinate and position related messages
    if (message.toLowerCase().includes('coordinate') || 
        message.toLowerCase().includes('position') || 
        message.includes('ping') || 
        message.includes('pong')) {
        return;
    }

    const logPanel = document.getElementById('log-container');
    if (!logPanel) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry message-type-${type}`;
    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    logPanel.appendChild(entry);
    logPanel.scrollTop = logPanel.scrollHeight;

    // Keep only the last 100 entries
    while (logPanel.children.length > 100) {
        logPanel.removeChild(logPanel.firstChild);
    }
}

function createUserElement(user) {
    const li = document.createElement('li');
    li.className = `user-item ${user.afk ? 'afk' : ''}`;
    li.id = `user-${user.id}`;

    // Only show name if it exists and isn't empty
    const displayName = user.username && user.username.trim() ? user.username : `User_${user.id.slice(0, 5)}`;
    
    li.innerHTML = `
        <div class="user-name">${displayName}</div>
        <div class="user-details">
            <div class="position">
                Position: <span class="position-value" id="pos-${user.id}">
                    (${user.tx.toFixed(2)}, ${user.ty.toFixed(2)}, ${user.tz.toFixed(2)})
                </span>
            </div>
            <div class="listening">
                Listening to: ${user.listeningTo.length} users
            </div>
            ${user.afk ? '<div class="afk-status">AFK</div>' : ''}
        </div>
    `;
    return li;
}

function updateUserPosition(userId, coordinates) {
    const posElement = document.getElementById(`pos-${userId}`);
    if (posElement) {
        posElement.textContent = `(${coordinates.tx.toFixed(2)}, ${coordinates.ty.toFixed(2)}, ${coordinates.tz.toFixed(2)})`;
        posElement.style.transition = 'color 0.3s ease';
        posElement.style.color = 'var(--warning)';
        setTimeout(() => {
            posElement.style.color = 'var(--success)';
        }, 300);
    }
}

function updateUserList(users) {
    const userList = document.getElementById('user-list');
    const currentUsers = new Set();
    
    users.forEach(user => {
        currentUsers.add(user.id);
        let userElement = document.getElementById(`user-${user.id}`);
        
        if (!userElement) {
            userElement = createUserElement(user);
            userList.appendChild(userElement);
        } else {
            // Update existing user element
            const newElement = createUserElement(user);
            userElement.innerHTML = newElement.innerHTML;
            userElement.className = newElement.className;
        }
    });
    
    // Remove users that are no longer connected
    Array.from(userList.children).forEach(child => {
        const userId = child.id.replace('user-', '');
        if (!currentUsers.has(userId)) {
            child.remove();
        }
    });

    document.getElementById('connected-users').textContent = users.length;
}

let logMessages = [];
const maxLogMessages = 1000;

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

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('worldtree-settings');
    if (savedSettings) {
        Object.assign(settings, JSON.parse(savedSettings));
        applySettings();
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('worldtree-settings', JSON.stringify(settings));
}

// Apply current settings to the UI
function applySettings() {
    // Apply filters
    document.getElementById('filter-coordinates').checked = settings.filters.coordinates;
    document.getElementById('filter-connections').checked = settings.filters.connections;
    document.getElementById('filter-metadata').checked = settings.filters.metadata;

    // Apply text size
    document.getElementById('text-size').value = settings.textSize;
    document.documentElement.style.setProperty('--base-font-size', `${settings.textSize}px`);

    // Apply theme
    document.getElementById('theme-select').value = settings.theme;
    applyTheme(settings.theme);
    
    // Refresh log display with current filters
    refreshLogDisplay();
}

// Theme handling
function applyTheme(theme) {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.body.classList.toggle('dark-theme', isDark);
}

// Initialize event listeners for settings
function initializeSettings() {
    document.getElementById('filter-coordinates').addEventListener('change', (e) => {
        settings.filters.coordinates = e.target.checked;
        saveSettings();
        refreshLogDisplay();
    });

    document.getElementById('filter-connections').addEventListener('change', (e) => {
        settings.filters.connections = e.target.checked;
        saveSettings();
        refreshLogDisplay();
    });

    document.getElementById('filter-metadata').addEventListener('change', (e) => {
        settings.filters.metadata = e.target.checked;
        saveSettings();
        refreshLogDisplay();
    });

    document.getElementById('text-size').addEventListener('input', (e) => {
        settings.textSize = parseInt(e.target.value);
        saveSettings();
        applySettings();
    });

    document.getElementById('theme-select').addEventListener('change', (e) => {
        settings.theme = e.target.value;
        saveSettings();
        applySettings();
    });
}

// Connected users table handling
let activeUsers = new Map();
let dashboardViewers = new Map();

function updateLastSaveTime() {
    const saveTimeElement = document.getElementById('last-save-time');
    if (saveTimeElement && lastSaveTime) {
        const timeStr = new Date(lastSaveTime).toLocaleTimeString();
        saveTimeElement.textContent = `Last Save: ${timeStr}`;
    }
}

function updateUsersTable() {
    const userTableBody = document.getElementById('users-table-body');
    if (!userTableBody) return;

    // Clear table
    userTableBody.innerHTML = '';
    
    // Add active users
    Array.from(activeUsers.values())
        .sort((a, b) => (a.username || '').localeCompare(b.username || ''))
        .forEach(user => {
            const row = document.createElement('tr');
            const status = user.afk ? 'AFK' : 'Online';
            
            row.innerHTML = `
                <td>${user.username || 'Anonymous'}</td>
                <td><span class="badge user">User</span></td>
                <td class="status-${status.toLowerCase()}">${status}</td>
                <td>${user.tx?.toFixed(2) || '0.00'}, ${user.ty?.toFixed(2) || '0.00'}, ${user.tz?.toFixed(2) || '0.00'}</td>
                <td>${user.description || ''}</td>
            `;
            userTableBody.appendChild(row);
        });

    // Add viewers
    Array.from(dashboardViewers.values())
        .sort((a, b) => (a.username || '').localeCompare(b.username || ''))
        .forEach(viewer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${viewer.username || 'Anonymous'}</td>
                <td><span class="badge viewer">Viewer</span></td>
                <td class="status-online">Online</td>
                <td>N/A</td>
                <td>Dashboard Viewer</td>
            `;
            userTableBody.appendChild(row);
        });

    // Update counts
    document.getElementById('user-count').textContent = activeUsers.size;
    document.getElementById('viewer-count').textContent = dashboardViewers.size;
}

let scene, camera, renderer, controls;
const userSpheres = new Map(); // Store user spheres

function createUserSphere(color = 0x7aa2f7) {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: color });
    return new THREE.Mesh(geometry, material);
}

function initThreeJS() {
    const container = document.getElementById('three-container');
    if (!container) {
        console.error('Could not find three-container');
        return;
    }

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1b26);

    // Camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Add grid
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Add OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Add smooth damping
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    animate();
}

function onWindowResize() {
    const container = document.getElementById('three-container');
    if (!container || !camera || !renderer) return;

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (renderer && scene && camera) {
        if (controls) controls.update();
        renderer.render(scene, camera);
    }
}

// Initialize Three.js when the page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initThreeJS, 100);
});

// WebSocket connection
const ws = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`);

ws.onopen = function() {
    console.log('WebSocket Connected');
};

ws.onclose = function() {
    console.log('WebSocket Disconnected');
    document.getElementById('dashboard-uuid').textContent = 'Disconnected';
};

ws.onerror = function() {
    console.log('WebSocket Error');
    document.getElementById('dashboard-uuid').textContent = 'Connection Error';
};

// WebSocket message handling
ws.onmessage = function(event) {
    try {
        const message = JSON.parse(event.data);

        switch (message.type) {
            case 'welcome':
                // Set UUID as soon as we get the welcome message
                document.getElementById('dashboard-uuid').textContent = message.id;
                break;
            case 'connect':
                addLogEntry(message.message, 'connection');
                break;
            case 'userupdate':
                if (message.users) {
                    // Clear existing users first
                    activeUsers.clear();

                    // Update user spheres
                    const existingSphereIds = new Set(userSpheres.keys());
                    
                    message.users.forEach(user => {
                        if (!isDashboardUser(user)) {
                            activeUsers.set(user.id, user);
                            
                            // Create or update sphere for user
                            let sphere = userSpheres.get(user.id);
                            if (!sphere) {
                                sphere = createUserSphere(Math.random() * 0xffffff); // Random color for each user
                                userSpheres.set(user.id, sphere);
                                scene.add(sphere);
                            }
                            
                            // Update sphere position
                            sphere.position.set(user.tx || 0, user.ty || 0, user.tz || 0);
                            existingSphereIds.delete(user.id);
                        }
                    });
                    
                    // Remove spheres for disconnected users
                    existingSphereIds.forEach(id => {
                        const sphere = userSpheres.get(id);
                        if (sphere) {
                            scene.remove(sphere);
                            userSpheres.delete(id);
                        }
                    });

                    updateUserList(Array.from(activeUsers.values()));
                }
                break;
            case 'usercoordinateupdate':
                if (message.from && message.coordinates) {
                    // Update position in active users
                    const user = activeUsers.get(message.from);
                    if (user) {
                        user.tx = message.coordinates.tx || user.tx;
                        user.ty = message.coordinates.ty || user.ty;
                        user.tz = message.coordinates.tz || user.tz;
                        updateUserPosition(message.from, message.coordinates);
                        
                        // Update sphere position
                        const sphere = userSpheres.get(message.from);
                        if (sphere) {
                            sphere.position.set(user.tx, user.ty, user.tz);
                        }
                    }
                }
                break;
            case 'disconnect':
                const userId = message.userId;
                if (activeUsers.has(userId)) {
                    activeUsers.delete(userId);
                }
                if (dashboardViewers.has(userId)) {
                    dashboardViewers.delete(userId);
                }
                updateUsersTable();
                addLogEntry(message.message, 'connection');
                break;
            case 'serverlog':
                if (message.message.includes('Data saved to CSV')) {
                    lastSaveTime = new Date();
                    updateLastSaveTime();
                }
                // Filter coordinate and position related messages from the log
                if (!message.message.includes('coordinate') && !message.message.includes('position')) {
                    addLogEntry(message.message, message.logType || 'info');
                }
                break;
            case 'metadata':
                addLogEntry(message.message, 'metadata');
                break;
            case 'ping':
                // Silent ping handling
                break;
            default:
                console.log('Unhandled message type:', message.type);
        }
    } catch (error) {
        console.error('Error processing message:', error);
        addLogEntry(`Error: ${error.message}`, 'error');
    }
};

function isDashboardUser(user) {
    return user.username?.toLowerCase().includes('dashboard') || 
           user.description?.toLowerCase().includes('dashboard') ||
           user.id?.toLowerCase().includes('dashboard');
}
