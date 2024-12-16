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
        
        // Only show name if it exists and isn't empty
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

function updateUsersTable() {
    const userTableBody = document.getElementById('users-table-body');
    if (!userTableBody) {
        console.error('Could not find users-table-body element');
        return;
    }

    // Clear the table
    userTableBody.innerHTML = '';

    // Track processed user IDs to prevent duplicates
    const processedIds = new Set();

    // Add active users
    Array.from(activeUsers.values()).forEach(user => {
        if (processedIds.has(user.id)) return;
        processedIds.add(user.id);

        const row = document.createElement('tr');
        const displayName = user.username || `User_${user.id.slice(0, 5)}`;
        const position = user.tx !== undefined ? 
            `(${user.tx.toFixed(2)}, ${user.ty.toFixed(2)}, ${user.tz.toFixed(2)})` : 
            'N/A';
        
        row.innerHTML = `
            <td>${displayName}</td>
            <td><span class="badge user">User</span></td>
            <td class="status-online">Online</td>
            <td>${position}</td>
            <td>${user.description || ''}</td>
        `;
        userTableBody.appendChild(row);
    });

    // Add dashboard viewers (only if they're not already shown as users)
    Array.from(dashboardViewers.values()).forEach(viewer => {
        if (processedIds.has(viewer.id)) return;
        processedIds.add(viewer.id);

        const row = document.createElement('tr');
        const deviceBadge = viewer.deviceType === 'mobile' ? 
            '<span class="badge mobile">Mobile</span>' : 
            '<span class="badge desktop">Desktop</span>';
            
        row.innerHTML = `
            <td>${viewer.username || 'Anonymous'}</td>
            <td><span class="badge viewer">Viewer</span> ${deviceBadge}</td>
            <td class="status-online">Online</td>
            <td>N/A</td>
            <td>Dashboard Viewer</td>
        `;
        userTableBody.appendChild(row);
    });

    // Update counts (only count unique users)
    const uniqueUsers = new Set(Array.from(activeUsers.values()).map(u => u.id));
    const uniqueViewers = new Set(Array.from(dashboardViewers.values())
        .filter(v => !uniqueUsers.has(v.id))
        .map(v => v.id));

    document.getElementById('user-count').textContent = uniqueUsers.size;
    document.getElementById('viewer-count').textContent = uniqueViewers.size;
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
    const lastSaveElement = document.getElementById('last-save-time');
    if (!lastSaveElement) return;
    
    if (lastSaveTime) {
        const formattedTime = new Date(lastSaveTime).toLocaleTimeString();
        lastSaveElement.textContent = `Last Save: ${formattedTime}`;
    } else {
        lastSaveElement.textContent = 'Last Save: Never';
    }
}

let scene, camera, renderer, controls;
const userSpheres = new Map(); // Store user spheres
const userLabels = new Map(); // Store user labels

function createUserSphere(color = 0x7aa2f7) {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: color });
    return new THREE.Mesh(geometry, material);
}

function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    // Background
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Text
    context.font = '24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        sizeAttenuation: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.1, 0.025, 1);
    return sprite;
}

function updateUserPosition(userId, coordinates, username) {
    let user = userSpheres.get(userId);
    if (!user) {
        // Create new user representation
        const geometry = new THREE.SphereGeometry(0.1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const sphere = new THREE.Mesh(geometry, material);
        const label = createTextSprite(username || userId);
        sphere.add(label);
        label.position.y = 0.2;
        
        user = sphere;
        userSpheres.set(userId, user);
        scene.add(user);
    }

    // Update position
    user.position.set(coordinates.tx || 0, coordinates.ty || 0, coordinates.tz || 0);
    
    // Update label text if username changed
    if (username && user.children[0].material.map.image) {
        const context = user.children[0].material.map.image.getContext('2d');
        context.clearRect(0, 0, user.children[0].material.map.image.width, user.children[0].material.map.image.height);
        
        // Redraw background
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, user.children[0].material.map.image.width, user.children[0].material.map.image.height);
        
        // Redraw text
        context.font = '24px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(username, user.children[0].material.map.image.width / 2, user.children[0].material.map.image.height / 2);
        
        user.children[0].material.map.needsUpdate = true;
    }
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
        // Update label rotations to face camera
        userSpheres.forEach(user => {
            if (user.children[0]) {
                user.children[0].quaternion.copy(camera.quaternion);
            }
        });
        
        if (controls) controls.update();
        renderer.render(scene, camera);
    }
}

// Initialize Three.js when the page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initThreeJS, 100);
});

// CSV file info
let lastCsvInfo = {
    saveTime: null,
    fileSize: null,
    rowCount: null,
    exists: false
};

// Mobile detection using User Agent
function isMobileDevice() {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(navigator.userAgent) || window.innerWidth <= 768;
}

// Mobile detection
function detectMobile() {
    const mobile = isMobileDevice();
    document.body.classList.toggle('is-mobile', mobile);
    
    // Update dashboard viewer type
    const dashboardId = document.getElementById('dashboard-uuid')?.textContent;
    if (dashboardId && dashboardViewers.has(dashboardId)) {
        const viewer = dashboardViewers.get(dashboardId);
        viewer.deviceType = mobile ? 'mobile' : 'desktop';
        updateUsersTable();
    }
}

// Update last save info display
function updateLastSaveInfo() {
    const lastSaveElement = document.getElementById('last-save-time');
    if (!lastSaveElement) return;
    
    if (!lastCsvInfo.exists) {
        lastSaveElement.textContent = 'No CSV file found';
        return;
    }
    
    if (lastCsvInfo.saveTime) {
        const timeStr = lastCsvInfo.saveTime.toLocaleString();
        let infoStr = `Last Save: ${timeStr}`;
        
        if (lastCsvInfo.fileSize !== undefined) {
            const sizeMB = (lastCsvInfo.fileSize / (1024 * 1024)).toFixed(2);
            infoStr += ` (${sizeMB} MB`;
            
            if (lastCsvInfo.rowCount !== undefined) {
                infoStr += `, ${lastCsvInfo.rowCount} rows`;
            }
            
            infoStr += ')';
        }
        
        lastSaveElement.textContent = infoStr;
    } else {
        lastSaveElement.textContent = 'Last Save: Never';
    }
}

// Update CSV info when received
function updateCsvInfo(info) {
    lastCsvInfo = {
        saveTime: info.modifiedTime ? new Date(info.modifiedTime) : null,
        fileSize: info.size,
        rowCount: info.rows,
        exists: info.exists
    };
    updateLastSaveInfo();
}

// Request CSV info periodically
setInterval(() => {
    ws.send(JSON.stringify({ type: 'requestCsvInfo' }));
}, 5000);

// WebSocket connection
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
// For local development, use the port. For deployed version, use the host directly
const wsUrl = window.location.port 
    ? `${protocol}//${window.location.hostname}:${window.location.port}`
    : `${protocol}//${window.location.hostname}`;
const ws = new WebSocket(wsUrl);

// Add connection status indicator
ws.onopen = function() {
    console.log('WebSocket Connected to:', wsUrl);
    addLogEntry('Connected to server', 'connection');
    document.getElementById('connection-status').className = 'status-online';
};

ws.onclose = function() {
    console.log('WebSocket Disconnected from:', wsUrl);
    document.getElementById('dashboard-uuid').textContent = 'Disconnected';
    document.getElementById('connection-status').className = 'status-offline';
    addLogEntry('WebSocket disconnected - attempting to reconnect...', 'error');
    // Try to reconnect after a delay
    setTimeout(() => {
        window.location.reload();
    }, 5000);
};

ws.onerror = function(error) {
    console.error('WebSocket Error for:', wsUrl, error);
    document.getElementById('dashboard-uuid').textContent = 'Connection Error';
    document.getElementById('connection-status').className = 'status-error';
    addLogEntry('WebSocket connection error', 'error');
};

// WebSocket message handling
ws.onmessage = function(event) {
    try {
        const message = JSON.parse(event.data);

        switch (message.type) {
            case 'welcome':
                const dashboardUuid = document.getElementById('dashboard-uuid');
                if (dashboardUuid) {
                    dashboardUuid.textContent = message.id;
                    // Add self to dashboard viewers with device type
                    dashboardViewers.set(message.id, {
                        id: message.id,
                        username: 'Dashboard Viewer',
                        type: 'viewer',
                        deviceType: isMobileDevice() ? 'mobile' : 'desktop'
                    });
                    updateUsersTable();
                }
                // Add welcome message
                addLogEntry(createWelcomeMessage(message.id), 'connection');
                break;

            case 'connect':
                addLogEntry(message.message, 'connection');
                if (message.userType === 'viewer') {
                    dashboardViewers.set(message.userId, {
                        id: message.userId,
                        username: 'Dashboard Viewer',
                        type: 'viewer',
                        deviceType: message.deviceType || 'desktop'
                    });
                    updateUsersTable();
                }
                break;

            case 'csvinfo':
                if (message.info) {
                    lastCsvInfo = {
                        saveTime: message.info.modifiedTime ? new Date(message.info.modifiedTime) : null,
                        fileSize: message.info.size,
                        rowCount: message.info.rows,
                        exists: message.info.exists
                    };
                    updateLastSaveInfo();
                }
                break;

            case 'serverlog':
                // Filter coordinate messages if enabled
                if (document.getElementById('filter-coordinates')?.checked && 
                    (message.message.includes('coordinate') || message.message.includes('position'))) {
                    return;
                }
                addLogEntry(message.message, message.logType || 'info');
                break;

            case 'userupdate':
                if (message.users) {
                    // Clear existing users first
                    activeUsers.clear();
                    
                    // Update active users (excluding dashboard viewers)
                    message.users.forEach(user => {
                        if (!isDashboardUser(user)) {
                            activeUsers.set(user.id, user);
                        }
                    });
                    
                    // Update 3D viewer
                    const existingSphereIds = new Set(userSpheres.keys());
                    Array.from(activeUsers.values()).forEach(user => {
                        let sphere = userSpheres.get(user.id);
                        if (!sphere) {
                            sphere = createUserSphere(Math.random() * 0xffffff);
                            userSpheres.set(user.id, sphere);
                            scene.add(sphere);
                        }
                        sphere.position.set(user.tx || 0, user.ty || 0, user.tz || 0);
                        existingSphereIds.delete(user.id);
                    });
                    
                    // Remove spheres for disconnected users
                    existingSphereIds.forEach(id => {
                        const sphere = userSpheres.get(id);
                        if (sphere) {
                            scene.remove(sphere);
                            userSpheres.delete(id);
                        }
                    });
                    
                    updateUsersTable();
                }
                break;

            case 'usercoordinateupdate':
                if (message.from && message.coordinates) {
                    const user = activeUsers.get(message.from);
                    if (user) {
                        // Update user position
                        user.tx = message.coordinates.tx ?? user.tx;
                        user.ty = message.coordinates.ty ?? user.ty;
                        user.tz = message.coordinates.tz ?? user.tz;
                        
                        // Update sphere position
                        const sphere = userSpheres.get(message.from);
                        if (sphere) {
                            sphere.position.set(user.tx, user.ty, user.tz);
                        }

                        // Update position in table
                        updateUsersTable();
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

            case 'metadata':
                if (!document.getElementById('filter-metadata')?.checked) {
                    addLogEntry(message.message, 'metadata', {
                        userId: message.userId,
                        changes: message.changes
                    });
                }
                break;

            case 'ping':
                // Silent ping handling
                break;

            default:
                console.log('Unknown message type:', message.type);
                break;
        }
    } catch (error) {
        console.error('Error processing message:', error);
        addLogEntry('Error processing message: ' + error.message, 'error');
    }
};

function isDashboardUser(user) {
    return user.username?.toLowerCase().includes('dashboard') || 
           user.description?.toLowerCase().includes('dashboard') ||
           user.id?.toLowerCase().includes('dashboard');
}

// Mobile detection
window.addEventListener('load', detectMobile);
window.addEventListener('resize', detectMobile);

const style = document.createElement('style');
style.textContent = `
    .log-entry.highlight-change {
        background-color: rgba(255, 255, 0, 0.1);
        font-weight: bold;
        padding: 4px;
        margin: 2px 0;
        border-radius: 4px;
    }
`;
document.head.appendChild(style);

function createWelcomeMessage(userId) {
    const natureEmojis = ['🌱', '🌳', '🌲', '🌿', '🍃', '🌸', '🦋', '🐝', '🌺', '🍄'];
    const randomEmojis = Array.from({ length: 5 }, () => 
        natureEmojis[Math.floor(Math.random() * natureEmojis.length)]
    ).join(' ');
    
    return `Welcome to WorldTree! ${randomEmojis} New connection: ${userId}`;
}
