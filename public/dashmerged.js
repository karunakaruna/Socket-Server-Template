// Add Three.js variables and functions
let scene, camera, renderer, controls, grid;
const userSpheres = new Map();
let userId = null;
let userSecret = null;

function createUserSphere(color = 0x7aa2f7) {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshPhongMaterial({ 
        color: color,
        emissive: 0x222222
    });
    return new THREE.Mesh(geometry, material);
}

function updateUserPosition(userId, coordinates) {
    if (!coordinates || !scene) return;

    let sphere = userSpheres.get(userId);
    if (!sphere) {
        sphere = createUserSphere(Math.random() * 0xffffff);
        userSpheres.set(userId, sphere);
        scene.add(sphere);
    }

    // Use TWEEN to animate the position change
    sphere.position.set(
        coordinates.tx || 0,
        coordinates.ty || 0,
        coordinates.tz || 0
    );

    // Update the position in the table
    const posElement = document.querySelector(`#users-table tr[data-userid="${userId}"] td:nth-child(4)`);
    if (posElement) {
        posElement.textContent = `(${coordinates.tx.toFixed(2)}, ${coordinates.ty.toFixed(2)}, ${coordinates.tz.toFixed(2)})`;
    }
}

function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x1a1b26);
    document.getElementById('three-container').appendChild(renderer.domElement);
    
    // Add grid
    grid = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
    scene.add(grid);
    
    // Add lights
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));
    
    // Setup camera and controls
    camera.position.set(5, 3, 5);
    camera.lookAt(0, 0, 0);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    
    animate();

    // Add event listeners for controls
    document.getElementById('center-camera').addEventListener('click', () => {
        camera.position.set(5, 3, 5);
        camera.lookAt(0, 0, 0);
        addLogEntry('Camera centered', 'info');
    });

    document.getElementById('toggle-grid').addEventListener('click', () => {
        grid.visible = !grid.visible;
        addLogEntry(`Grid ${grid.visible ? 'shown' : 'hidden'}`, 'info');
    });

    document.getElementById('light-intensity').addEventListener('input', (e) => {
        scene.children.forEach(child => {
            if (child instanceof THREE.DirectionalLight) {
                child.intensity = parseFloat(e.target.value);
            }
        });
        addLogEntry(`Light intensity changed to ${e.target.value}`, 'info');
    });

    document.getElementById('grid-color').addEventListener('input', (e) => {
        grid.material.color.set(e.target.value);
        addLogEntry(`Grid color changed to ${e.target.value}`, 'info');
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Connection and ping state
let ws = null;
let isReconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;
let pingTimer = null;

// Connected users table handling
let activeUsers = new Map();
let dashboardViewers = new Map();

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

function updateLastSave(timestamp) {
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

function updateUsersTable() {
    const tableBody = document.getElementById('users-table-body');
    const userCountEl = document.getElementById('user-count');
    const viewerCountEl = document.getElementById('viewer-count');

    if (!tableBody || !userCountEl || !viewerCountEl) {
        console.error('Required elements not found:', {
            tableBody: !!tableBody,
            userCountEl: !!userCountEl,
            viewerCountEl: !!viewerCountEl
        });
        return;
    }

    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Track counts
    let userCount = 0;
    let viewerCount = 0;

    // Add active users
    for (const [id, user] of activeUsers) {
        userCount++;
        const row = document.createElement('tr');
        row.setAttribute('data-userid', id);
        
        const position = user.tx !== undefined ? 
            `(${user.tx.toFixed(2)}, ${user.ty.toFixed(2)}, ${user.tz.toFixed(2)})` : 
            '(0.00, 0.00, 0.00)';

        row.innerHTML = `
            <td>${user.username || `User_${id.slice(0, 5)}`}${id === userId ? ' (You)' : ''}</td>
            <td><span class="badge user">User</span></td>
            <td class="status-online">Online</td>
            <td>${position}</td>
            <td>${user.description || ''}</td>
        `;
        tableBody.appendChild(row);
    }

    // Add viewers
    for (const [id, viewer] of dashboardViewers) {
        if (!activeUsers.has(id)) {
            viewerCount++;
            const row = document.createElement('tr');
            row.setAttribute('data-userid', id);
            row.innerHTML = `
                <td>${viewer.username || 'Anonymous'}</td>
                <td><span class="badge viewer">Viewer</span></td>
                <td class="status-online">Online</td>
                <td>N/A</td>
                <td>Dashboard Viewer</td>
            `;
            tableBody.appendChild(row);
        }
    }

    // Update counts
    userCountEl.textContent = userCount;
    viewerCountEl.textContent = viewerCount;
}

function updatePingIndicator(active = true) {
    const indicator = document.getElementById('ping-indicator');
    if (indicator) {
        indicator.className = active ? 'indicator active' : 'indicator';
    }
}

function handlePingMessage() {
    updatePingIndicator(true);
    setTimeout(() => updatePingIndicator(false), 1000);
}

function initWebSocket() {
    if (ws) {
        console.log('Closing existing WebSocket connection');
        ws.close();
    }

    // For remote server, we might need to use the host without the port
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
    const wsUrl = `${protocol}//${host}:${port}`;
    
    console.log('Attempting WebSocket connection to:', wsUrl);

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = function() {
            console.log('WebSocket Connected Successfully');
            addLogEntry('Connected to server', 'success');
            isReconnecting = false;
            reconnectAttempts = 0;

            // Try to reconnect with stored secret if available
            const storedSecret = localStorage.getItem('userSecret');
            if (storedSecret) {
                console.log('Attempting to reconnect with stored secret');
                ws.send(JSON.stringify({
                    type: 'reconnect',
                    secret: storedSecret
                }));
            } else {
                // Initialize as a new user
                console.log('Initializing as new user');
                ws.send(JSON.stringify({
                    type: 'init',
                    username: 'Dashboard User',
                    deviceType: 'desktop'
                }));
            }

            // Start ping timer
            if (pingTimer) clearInterval(pingTimer);
            pingTimer = setInterval(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping', time: Date.now() }));
                    updatePingIndicator(true);
                }
            }, 5000);
        };

        ws.onclose = function(event) {
            console.log('WebSocket Connection Closed:', event.code, event.reason);
            addLogEntry('Disconnected from server', 'error');
            
            // Clear ping timer
            if (pingTimer) {
                clearInterval(pingTimer);
                pingTimer = null;
            }

            // Attempt to reconnect
            if (!isReconnecting && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                isReconnecting = true;
                setTimeout(() => {
                    reconnectAttempts++;
                    console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                    initWebSocket();
                }, RECONNECT_DELAY);
            }
        };

        ws.onerror = function(error) {
            console.error('WebSocket Error:', error);
            addLogEntry('Connection error', 'error');
        };

        ws.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('Received message:', data);
                
                switch(data.type) {
                    case 'ping':
                        handlePingMessage();
                        break;

                    case 'welcome':
                        userId = data.id;
                        userSecret = data.secret;
                        // Store secret for reconnection
                        localStorage.setItem('userSecret', userSecret);
                        addLogEntry(`Connected as User_${userId.slice(0, 5)}`, 'success');
                        document.getElementById('client-id').textContent = userId;
                        break;

                    case 'userupdate':
                        if (data.users) {
                            // Clear existing users first
                            activeUsers.clear();
                            data.users.forEach(user => {
                                activeUsers.set(user.id, user);
                                // Update user sphere if position changed
                                updateUserPosition(user.id, {
                                    tx: user.tx || 0,
                                    ty: user.ty || 0,
                                    tz: user.tz || 0
                                });
                            });
                            updateUsersTable();
                        }
                        break;

                    case 'user_join':
                        addLogEntry(`${data.username || 'Anonymous'} joined`, 'info');
                        if (data.data) {
                            activeUsers.set(data.userId, data.data);
                            updateUsersTable();
                        }
                        break;

                    case 'user_leave':
                        addLogEntry(`${data.username || 'Anonymous'} left`, 'info');
                        activeUsers.delete(data.userId);
                        updateUsersTable();
                        break;

                    case 'viewer_join':
                        if (data.data) {
                            dashboardViewers.set(data.userId, {
                                id: data.userId,
                                username: data.username || 'Anonymous',
                                deviceType: data.deviceType || 'desktop'
                            });
                            updateUsersTable();
                        }
                        break;

                    case 'viewer_leave':
                        dashboardViewers.delete(data.userId);
                        updateUsersTable();
                        break;

                    case 'save':
                        if (data.timestamp) {
                            updateLastSave(data.timestamp);
                            addLogEntry('World state saved', 'success');
                        }
                        break;

                    default:
                        console.log('Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('Error processing message:', error);
                addLogEntry('Error processing message', 'error');
            }
        };
    } catch (error) {
        console.error('Error creating WebSocket:', error);
        addLogEntry('Failed to create connection', 'error');
    }
}

function handleReconnection() {
    if (!isReconnecting && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        isReconnecting = true;
        setTimeout(() => {
            reconnectAttempts++;
            console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            initWebSocket();
        }, RECONNECT_DELAY);
    }
}

function disconnectWebSocket() {
    if (ws) {
        ws.close();
        ws = null;
    }
    if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
    }
}

// Window dragging functionality
let draggedWindow = null;
let dragOffset = { x: 0, y: 0 };

document.addEventListener('DOMContentLoaded', () => {
    // Initialize window dragging
    document.querySelectorAll('.window-title').forEach(titleBar => {
        titleBar.addEventListener('mousedown', e => {
            draggedWindow = titleBar.parentElement;
            const rect = draggedWindow.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
        });
    });

    document.addEventListener('mousemove', e => {
        if (draggedWindow) {
            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;
            draggedWindow.style.left = `${x}px`;
            draggedWindow.style.top = `${y}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        draggedWindow = null;
    });

    // Initialize Three.js
    initThreeJS();

    // Initialize WebSocket
    initWebSocket();
});
