import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Add Three.js variables and functions
let scene, camera, renderer, controls, labelRenderer;
let grid;
const userSpheres = new Map();
const userLabels = new Map();
const userOrbits = new Map(); // Store orbit parameters for each user
let userId = null;
let userSecret = null;

function createUserSphere() {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        color: 0x7aa2f7,
        emissive: 0x4a6ad7,
        emissiveIntensity: 0.2,
        shininess: 50
    });
    return new THREE.Mesh(geometry, material);
}

function createUserLabel(text) {
    const div = document.createElement('div');
    div.className = 'label';
    div.textContent = text;
    div.style.color = '#87CEFA'; // Light blue for user labels
    div.style.fontSize = '12px';
    div.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    div.style.padding = '2px 4px';
    div.style.borderRadius = '3px';
    return new CSS2DObject(div);
}

function createCenterLabel(text) {
    const div = document.createElement('div');
    div.className = 'label';
    div.textContent = text;
    div.style.color = '#FFFFFF'; // White for center label
    div.style.fontSize = '14px';
    div.style.fontWeight = 'bold';
    div.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    div.style.padding = '3px 6px';
    div.style.borderRadius = '4px';
    return new CSS2DObject(div);
}

function createOrbitParameters() {
    return {
        radius: 2 + Math.random() * 3, // Random radius between 2-5
        speed: 0.2 + Math.random() * 0.3, // Random speed
        height: 0,
        phase: Math.random() * Math.PI * 2, // Random starting position
        rotation: (Math.random() - 0.5) * (Math.PI / 3.6), // Random rotation ±25 degrees
        orbitPath: null,
        orbitGroup: null // Parent group for orbit and sphere
    };
}

function updateUserPosition(userId) {
    let sphere = userSpheres.get(userId);
    let orbit = userOrbits.get(userId);
    const user = activeUsers.get(userId);
    
    if (!user) return;
    const username = user.username || `User_${userId.slice(0, 5)}`;
    
    if (!orbit) {
        orbit = createOrbitParameters();
        userOrbits.set(userId, orbit);
        
        // Create parent group
        const orbitGroup = new THREE.Group();
        scene.add(orbitGroup);
        orbit.orbitGroup = orbitGroup;
        
        // Create sphere first
        sphere = createUserSphere();
        userSpheres.set(userId, sphere);
        orbitGroup.add(sphere);
        
        const label = createUserLabel(username);
        sphere.add(label);
        label.position.set(0, 0.05, 0); // Moved very close to sphere surface
        userLabels.set(userId, label);
        
        // Create orbit path in the group
        const curve = new THREE.EllipseCurve(
            0, 0,             // Center at origin
            orbit.radius, orbit.radius,
            0, 2 * Math.PI,
            false,
            0
        );
        
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x4a6ad7,
            transparent: true,
            opacity: 0.3 
        });
        const orbitPath = new THREE.Line(geometry, material);
        orbitPath.rotateX(Math.PI / 2);
        orbitGroup.add(orbitPath);
        orbit.orbitPath = orbitPath;
        
        // Apply rotation to the group
        orbitGroup.rotation.z = orbit.rotation;
    }
    
    const time = performance.now() * 0.001;
    const angle = time * orbit.speed + orbit.phase;
    
    // Position relative to the group
    sphere.position.x = Math.cos(angle) * orbit.radius;
    sphere.position.z = Math.sin(angle) * orbit.radius;
    sphere.position.y = orbit.height;
}

function removeUser(userId) {
    const sphere = userSpheres.get(userId);
    const orbit = userOrbits.get(userId);
    const label = userLabels.get(userId);
    
    if (sphere) {
        if (label) {
            sphere.remove(label);
        }
        if (orbit && orbit.orbitGroup) {
            orbit.orbitGroup.remove(sphere);
        }
        userSpheres.delete(userId);
    }
    
    if (orbit) {
        if (orbit.orbitGroup) {
            scene.remove(orbit.orbitGroup);  // Remove entire group
        }
        userOrbits.delete(userId);
    }
    
    userLabels.delete(userId);
}

function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('three-canvas'),
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Label renderer
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(labelRenderer.domElement);

    // Controls with smooth damping
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    // Remove maxPolarAngle to allow orbiting under the ground plane
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    controls.enableZoom = true;
    controls.enablePan = true;

    // Central sphere
    const centerGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const centerMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.5
    });
    const centerSphere = new THREE.Mesh(centerGeometry, centerMaterial);
    scene.add(centerSphere);
    
    const centerLabel = createCenterLabel("Z Space");
    centerSphere.add(centerLabel);
    centerLabel.position.set(0, 0.2, 0); // Moved closer to sphere

    // Grid with fresnel shader material
    const gridGeometry = new THREE.PlaneGeometry(500, 500, 100, 100);
    const gridMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 1.0 },
            viewVector: { value: new THREE.Vector3() },
            resolution: { value: new THREE.Vector2() }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vViewPosition = cameraPosition - worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            uniform float time;
            
            void main() {
                // Grid
                vec2 grid = abs(fract(vUv * 50.0 - 0.5) - 0.5) / fwidth(vUv * 50.0);
                float line = min(grid.x, grid.y);
                float color = 1.0 - min(line, 1.0);
                
                // Time-based pulse
                float pulse = 0.5 + 0.5 * sin(time * 0.5);
                
                // Combine effects
                float alpha = mix(0.05, 0.15, pulse) * color;
                vec3 finalColor = vec3(0.2, 0.4, 1.0);
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    
    grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const lightParent = new THREE.Object3D();
    camera.add(lightParent);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(2, 2, -4);
    lightParent.add(directionalLight);

    scene.add(camera);

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update grid shader uniforms
    if (grid.material.uniforms) {
        grid.material.uniforms.time.value = performance.now() * 0.001;
        grid.material.uniforms.viewVector.value.copy(camera.position);
    }
    
    // Update all user positions
    for (const userId of userSpheres.keys()) {
        updateUserPosition(userId);
    }
    
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height'));
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
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
            console.log('WebSocket Connected Successfully to:', wsUrl);
            // If we have a stored secret, attempt to reconnect with it
            if (userSecret) {
                console.log('Attempting to reconnect with stored secret');
                ws.send(JSON.stringify({
                    type: 'reconnect',
                    secret: userSecret
                }));
            } else {
                console.log('No stored secret, will receive new one from server');
                ws.send(JSON.stringify({
                    type: 'reconnect'
                }));
            }
            addLogEntry('Connected to server', 'connection');
            document.getElementById('status-dot').className = 'status-dot online';
            reconnectAttempts = 0;

            
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
                        addLogEntry('Ping received', 'info');
                        break;

                        case 'welcome':
                            const dashboardUuid = document.getElementById('dashboard-uuid');
                            if (dashboardUuid) {
                                dashboardUuid.textContent = message.id;
                                // Store secret in memory
                                if (message.secret) {
                                    userSecret = message.secret;
                                    // Add secret to debug panel - first remove any existing secret display
                                    const debugPanel = document.getElementById('debug-panel');
                                    if (debugPanel) {
                                        // Remove existing secret display if any
                                        const existingSecret = debugPanel.querySelector('.debug-item .user-secret');
                                        if (existingSecret) {
                                            existingSecret.closest('.debug-item').remove();
                                        }
                                        // Add new secret display
                                        const secretDiv = document.createElement('div');
                                        secretDiv.className = 'debug-item';
                                        secretDiv.innerHTML = `<strong>Secret:</strong> <span class="user-secret">${message.secret}</span>`;
                                        debugPanel.appendChild(secretDiv);
                                    }
                                }
                                // Add welcome message
                                addLogEntry(createWelcomeMessage(message.id), 'connection');
                                // Add self to dashboard viewers with device type
                                dashboardViewers.set(message.id, {
                                    id: message.id,
                                    username: 'Dashboard Viewer',
                                    type: 'viewer',
                                    deviceType: isMobileDevice() ? 'mobile' : 'desktop'
                                });
                                updateUsersTable();
                            }
                            break;
    
                    case 'userupdate':
                        if (data.users) {
                            addLogEntry(`User list updated - ${data.users.length} users`, 'info');
                            
                            // Get list of current users to remove
                            const currentUserIds = new Set(userSpheres.keys());
                            
                            // Clear existing users
                            activeUsers.clear();
                            
                            // Update active users and their positions
                            data.users.forEach(user => {
                                activeUsers.set(user.id, user);
                                currentUserIds.delete(user.id);
                                
                                // Update user orbit and position
                                updateUserPosition(user.id);
                            });
                            
                            // Remove any users that are no longer in the list
                            currentUserIds.forEach(userId => {
                                addLogEntry(`Removing user ${userId}`, 'info');
                                removeUser(userId);
                            });
                            
                            updateUsersTable();
                            document.getElementById('user-count').textContent = activeUsers.size;
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
                        removeUser(data.userId);
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

    // Initialize everything when the page loads
    window.addEventListener('load', () => {
        initThreeJS();
        initWebSocket();

        // Add event listeners for controls
        document.getElementById('center-camera').addEventListener('click', () => {
            camera.position.set(5, 5, 5);
            camera.lookAt(0, 0, 0);
            addLogEntry('Camera centered', 'info');
        });

        document.getElementById('toggle-grid').addEventListener('click', () => {
            grid.visible = !grid.visible;
            addLogEntry(`Grid ${grid.visible ? 'shown' : 'hidden'}`, 'info');
        });

        // Handle window resize
        window.addEventListener('resize', onWindowResize, false);
    });
});
