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
let clientId = null;
let centerSphere = null; // Declare centerSphere globally

function createUserSphere(userId) {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        color: 0x7aa2f7,
        emissive: 0x4a6ad7,
        emissiveIntensity: 0.2,
        shininess: 50
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.userData.userId = userId; // Add this to identify spheres
    return sphere;
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
        sphere = createUserSphere(userId);
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

    // Prevent context menu on right click
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Initialize click handler right after renderer is created
    renderer.domElement.addEventListener('click', handleTargetClick);
    renderer.domElement.addEventListener('mousedown', handleTargetClick);
    
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
    centerSphere = new THREE.Mesh(centerGeometry, centerMaterial);
    centerSphere.userData.label = 'zspace'; // Add this to identify it
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

    // Create particle systems
    particleSystem = new ParticleSystem(scene);
    staticParticleField = new StaticParticleField(scene);
    
    animate();
}

// Particle System
class ParticleSystem {
    constructor(scene, maxParticles = 1000) {
        this.scene = scene;
        this.maxParticles = maxParticles;
        this.energy = 0.5; // Default energy level
        this.particles = [];
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(maxParticles * 3);
        this.velocities = [];
        this.lifetimes = [];
        
        // Create particle material
        this.material = new THREE.PointsMaterial({
            color: 0x7dcfff,
            size: 0.1,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Set up geometry
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.points = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.points);
    }

    addParticle() {
        if (this.particles.length >= this.maxParticles) return;

        // Random position in a sphere - reduced radius
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const radius = Math.random() * 0.05; // Halved from 0.1

        const particle = {
            position: new THREE.Vector3(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            ),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            ),
            lifetime: Math.random() * 2 + 1, // 1-3 seconds
            age: 0
        };

        this.particles.push(particle);
        this.updateGeometry();
    }

    updateGeometry() {
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            const i3 = i * 3;
            this.positions[i3] = particle.position.x;
            this.positions[i3 + 1] = particle.position.y;
            this.positions[i3 + 2] = particle.position.z;
        }
        this.geometry.attributes.position.needsUpdate = true;
    }

    update(deltaTime) {
        // Add new particles based on energy
        const particlesToAdd = Math.floor(this.energy * 5); // 0-5 particles per frame
        for (let i = 0; i < particlesToAdd; i++) {
            this.addParticle();
        }

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.age += deltaTime;

            // Update position
            particle.position.add(particle.velocity);

            // Add gentle floating motion
            particle.position.y += Math.sin(particle.age * 2) * 0.001;

            // Fade out and remove old particles
            if (particle.age >= particle.lifetime) {
                this.particles.splice(i, 1);
            } else {
                // Update opacity based on age
                const life = 1 - (particle.age / particle.lifetime);
                particle.opacity = life;
            }
        }

        this.updateGeometry();
        
        // Update material opacity for all particles
        this.material.opacity = 0.6 * this.energy;
    }

    setEnergy(value) {
        this.energy = Math.max(0, Math.min(1, value));
    }
}

// Static Particle Field
class StaticParticleField {
    constructor(scene, maxParticles = 15000) {  // Increased max particles for larger volume
        this.scene = scene;
        this.maxParticles = maxParticles;
        this.density = 0.5; // Default density level
        this.particles = [];
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(maxParticles * 3);
        this.lifetimes = [];
        
        // Create particle material with bright white color
        this.material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.1,  // Slightly larger particles for visibility at greater distances
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Set up geometry
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.points = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.points);
    }

    addParticle() {
        if (this.particles.length >= this.maxParticles) return;

        // Random position in a cube volume
        const volume = 80; // 2x larger (was 40)
        const particle = {
            position: new THREE.Vector3(
                (Math.random() - 0.5) * volume,
                (Math.random() - 0.5) * volume,
                (Math.random() - 0.5) * volume
            ),
            lifetime: 3.0, // Fixed 3-second lifetime
            age: 0
        };

        this.particles.push(particle);
        this.updateGeometry();
    }

    updateGeometry() {
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            const i3 = i * 3;
            this.positions[i3] = particle.position.x;
            this.positions[i3 + 1] = particle.position.y;
            this.positions[i3 + 2] = particle.position.z;
        }
        this.geometry.attributes.position.needsUpdate = true;
    }

    update(deltaTime) {
        // Add new particles based on density
        const targetParticles = Math.floor(this.maxParticles * this.density);
        const particlesToAdd = Math.min(
            30, // Increased particles per frame for larger volume
            targetParticles - this.particles.length
        );
        
        for (let i = 0; i < particlesToAdd; i++) {
            this.addParticle();
        }

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.age += deltaTime;

            // Remove old particles
            if (particle.age >= particle.lifetime) {
                this.particles.splice(i, 1);
            }
        }

        this.updateGeometry();
        
        // Update material opacity
        const opacityScale = 0.6; // Slightly reduced opacity for better balance
        this.material.opacity = opacityScale * this.density;
    }

    setDensity(value) {
        this.density = Math.max(0, Math.min(1, value));
    }
}

let particleSystem;
let staticParticleField;
let lastTime = 0;

// Add after other global variables
let targetReticle = null;
let currentTarget = null;
let zspaceReticle = null;
let currentZTarget = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

class TargetReticle {
    constructor(color = 0x00ff88) {
        // Create reticle geometry
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        // Create crosshair shape
        const size = 1.0;
        // Horizontal line
        vertices.push(-size, 0, 0);
        vertices.push(size, 0, 0);
        // Vertical line
        vertices.push(0, -size, 0);
        vertices.push(0, size, 0);
        // Circle segments
        const segments = 32;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            vertices.push(Math.cos(theta) * size * 0.8, Math.sin(theta) * size * 0.8, 0);
            vertices.push(Math.cos((i + 1) / segments * Math.PI * 2) * size * 0.8, 
                         Math.sin((i + 1) / segments * Math.PI * 2) * size * 0.8, 0);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        // Create material with additive blending
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            linewidth: 2
        });

        this.mesh = new THREE.LineSegments(geometry, material);
        this.mesh.renderOrder = 999;
        scene.add(this.mesh);
    }

    update(target) {
        if (!target) return;
        
        if (target.isZSpace) {
            // For Z-space, use the intersection point
            this.mesh.position.copy(target.position);
        } else if (target instanceof THREE.Object3D) {
            // For user spheres, get world position
            const worldPosition = new THREE.Vector3();
            target.getWorldPosition(worldPosition);
            this.mesh.position.copy(worldPosition);
        }
        
        // Always face the camera
        this.mesh.quaternion.copy(camera.quaternion);
        
        // Pulse the opacity
        const pulse = (Math.sin(performance.now() * 0.003) + 1) * 0.5;
        this.mesh.material.opacity = 0.6 + pulse * 0.4;
    }

    remove() {
        scene.remove(this.mesh);
    }
}

function handleTargetClick(event) {
    // Handle right click for Z-space targeting
    if (event.button === 2) {
        event.preventDefault();
        
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / renderer.domElement.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(grid);

        if (intersects.length > 0) {
            if (!zspaceReticle) {
                zspaceReticle = new TargetReticle(0x4488ff); // Blue color for Z-space
            }
            const target = { 
                isZSpace: true,
                position: intersects[0].point.clone()
            };
            currentZTarget = target;
            return;
        }
        return;
    }

    // Left click for user targeting
    if (event.button !== 0) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / renderer.domElement.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // First check for centerSphere hit
    const centerIntersects = raycaster.intersectObject(centerSphere);
    if (centerIntersects.length > 0) {
        currentTarget = centerSphere;
        if (!targetReticle) {
            targetReticle = new TargetReticle();
        }
        return;
    }

    // Then check for user spheres
    const targetObjects = [];
    scene.traverse(object => {
        if (object.userData && object.userData.userId) {
            targetObjects.push(object);
        }
    });

    const intersects = raycaster.intersectObjects(targetObjects, true);
    let newTarget = null;
    
    for (const intersect of intersects) {
        const object = intersect.object;
        if (object.userData && object.userData.userId) {
            newTarget = object;
            break;
        }
    }

    if (newTarget) {
        currentTarget = newTarget;
        if (!targetReticle) {
            targetReticle = new TargetReticle();
        }
    } else {
        if (targetReticle) {
            targetReticle.remove();
            targetReticle = null;
            currentTarget = null;
        }
    }
}

function animate(timestamp) {
    requestAnimationFrame(animate);
    
    // Update particle systems
    const deltaTime = (timestamp - lastTime) / 1000;
    if (particleSystem) {
        particleSystem.update(deltaTime);
    }
    if (staticParticleField) {
        staticParticleField.update(deltaTime);
    }
    lastTime = timestamp;
    
    // Update grid shader uniforms
    if (grid.material.uniforms) {
        grid.material.uniforms.time.value = performance.now() * 0.001;
        grid.material.uniforms.viewVector.value.copy(camera.position);
    }
    
    // Update all user positions
    for (const userId of userSpheres.keys()) {
        updateUserPosition(userId);
    }
    
    // Update target reticle
    if (targetReticle && currentTarget) {
        targetReticle.update(currentTarget);
    }
    if (zspaceReticle && currentZTarget) {
        zspaceReticle.update(currentZTarget);
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

// Audio context and sound setup
let audioContext = null;
let heartbeatSound = null;
let eventSound = null;

async function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Load heartbeat sound
        const heartbeatResponse = await fetch('/sound/466554__danieldouch__little-pop.wav');
        const heartbeatBuffer = await heartbeatResponse.arrayBuffer();
        heartbeatSound = await audioContext.decodeAudioData(heartbeatBuffer);
        
        // Load event sound
        const eventResponse = await fetch('/sound/193259__b_lamerichs__eventsounds4-m.mp3');
        const eventBuffer = await eventResponse.arrayBuffer();
        eventSound = await audioContext.decodeAudioData(eventBuffer);
    } catch (error) {
        console.error('Error initializing audio:', error);
    }
}

function playHeartbeatSound() {
    if (!audioContext || !heartbeatSound) return;
    
    // Create source and gain nodes
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    source.buffer = heartbeatSound;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Random pitch modulation between 0.7 and 1.0
    source.playbackRate.value = 0.7 + Math.random() * 0.3;
    
    // Set volume and play
    gainNode.gain.value = 0.2; // Reduce volume to 20%
    source.start(0);
}

function playEventSound() {
    if (!audioContext || !eventSound) return;
    
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = eventSound;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Higher pitch for events
    source.playbackRate.value = 1.2 + Math.random() * 0.2;
    gainNode.gain.value = 0.035; // Slightly louder
    source.start(0);
}

// Add ping counter
let pingCount = 0;

function updatePingCount() {
    pingCount++;
    const pingCountElement = document.getElementById('ping-count');
    if (pingCountElement) {
        pingCountElement.textContent = pingCount;
    }
    
    // Play event sound every 5 pings
    if (pingCount % 100 === 0) {
        playEventSound();
    }
}

function flashZSpaceLabel() {
    const labels = document.getElementsByClassName('label');
    for (let label of labels) {
        if (label.textContent === 'Z Space') {
            // Remove existing flash class to reset animation
            label.classList.remove('flash');
            // Force reflow
            void label.offsetWidth;
            // Add flash class back
            label.classList.add('flash');
            break;
        }
    }
}

// Connection and ping state
let ws = null;
let isReconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;
let pingTimer = null;

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
                        playHeartbeatSound();
                        flashZSpaceLabel();
                        updatePingCount();
                        addLogEntry('Ping received', 'info');
                        break;

                    case 'welcome':
                        userId = data.id;
                        clientId = data.id;  // Store client ID
                        userSecret = data.secret;
                        
                        // Update client ID in stats
                        const clientIdElement = document.getElementById('client-id');
                        if (clientIdElement) {
                            clientIdElement.textContent = data.id;
                        }
                        
                        const dashboardUuid = document.getElementById('dashboard-uuid');
                        if (dashboardUuid) {
                            dashboardUuid.textContent = data.id;
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
    // Initialize minimize buttons
    document.querySelectorAll('.minimize-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent dragging when clicking minimize
            const window = button.closest('.window');
            window.classList.toggle('minimized');
            button.textContent = window.classList.contains('minimized') ? '+' : '−';
        });
    });

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
        initAudio();
        ///load the testrite lsystem
        loadLSystem('public/lsystems/testrite.json');

        // L-System loading
        document.getElementById('load-lsystem').addEventListener('click', () => {
            document.getElementById('lsystem-file').click();
        });
        
        document.getElementById('lsystem-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                loadLSystem(file);
            }
        });

        // Window dragging
        document.addEventListener('mousedown', startDragging);
        document.addEventListener('mousemove', dragWindow);
        document.addEventListener('mouseup', stopDragging);
        
        // Other controls
        document.getElementById('autoRotate').addEventListener('change', (e) => {
            controls.autoRotate = e.target.checked;
        });
        
        document.getElementById('showGrid').addEventListener('change', (e) => {
            if (grid) grid.visible = e.target.checked;
        });
        
        document.getElementById('muteAudio').addEventListener('change', (e) => {
            if (audioContext) {
                if (e.target.checked) {
                    audioContext.suspend();
                } else {
                    audioContext.resume();
                }
            }
        });

        // Particle system energy control
        document.getElementById('particle-energy').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            document.getElementById('energy-value').textContent = value.toFixed(2);
            if (particleSystem) {
                particleSystem.setEnergy(value);
            }
        });

        // Static particle field density control
        document.getElementById('static-particle-density').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            document.getElementById('density-value').textContent = value.toFixed(2);
            if (staticParticleField) {
                staticParticleField.setDensity(value);
            }
        });
        
        // Add click handler for targeting
        // Removed from here
    });
});

// L-System functionality
let currentLSystem = null;
let currentLSystemData = null;
let currentLSystemScale = 1.0;
let currentLSystemHeight = 0.0;
let isGenerating = false;

function updateLSystemTransform() {
    if (currentLSystem) {
        currentLSystem.scale.setScalar(currentLSystemScale);
        currentLSystem.position.y = currentLSystemHeight;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function regenerateLSystem() {
    if (!currentLSystemData || isGenerating) return;
    
    isGenerating = true;
    addLogEntry('Regenerating L-System...', 'info');
    
    // Update parameters from controls
    currentLSystemData.iterations = parseInt(document.getElementById('lsystem-iterations').value);
    currentLSystemData.angle = parseFloat(document.getElementById('lsystem-angle').value);
    currentLSystemData.stepLength = parseFloat(document.getElementById('lsystem-step').value);
    
    // Use setTimeout to allow the UI to update
    setTimeout(() => {
        try {
            // Generate new geometry
            const geometry = generateLSystemGeometry(currentLSystemData);
            
            // Remove existing L-system
            if (currentLSystem) {
                scene.remove(currentLSystem);
            }
            
            const material = new THREE.LineBasicMaterial({ 
                color: 0x7dcfff,
                linewidth: 2
            });
            
            // Create new mesh
            const mesh = new THREE.LineSegments(geometry, material);
            
            // Center the geometry at origin
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const center = new THREE.Vector3();
            box.getCenter(center);
            geometry.translate(-center.x, -center.y, -center.z);
            
            // Apply current scale and height
            mesh.scale.setScalar(currentLSystemScale);
            mesh.position.y = currentLSystemHeight;
            
            scene.add(mesh);
            currentLSystem = mesh;
            
            // Update info window
            updateLSystemInfo(currentLSystemData);
            
            // Add log entry
            addLogEntry(`Regenerated L-System with ${currentLSystemData.iterations} iterations`, 'info');
        } catch (error) {
            console.error('Error regenerating L-System:', error);
            addLogEntry('Error regenerating L-System', 'error');
        } finally {
            isGenerating = false;
        }
    }, 0);
}

const debouncedRegenerate = debounce(regenerateLSystem, 300);

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    // Load window layout first
    fetch('window-layout.json')
        .then(response => response.json())
        .then(layout => {
            loadWindowLayout(layout);
        })
        .catch(error => console.error('Error loading window layout:', error));

    // L-System transform controls
    document.getElementById('lsystem-scale').addEventListener('input', (e) => {
        currentLSystemScale = parseFloat(e.target.value);
        document.getElementById('scale-value').textContent = currentLSystemScale.toFixed(1);
        updateLSystemTransform();
    });
    
    document.getElementById('lsystem-height').addEventListener('input', (e) => {
        currentLSystemHeight = parseFloat(e.target.value);
        document.getElementById('height-value').textContent = currentLSystemHeight.toFixed(1);
        updateLSystemTransform();
    });
    
    // L-System generation controls - now reactive
    document.getElementById('lsystem-iterations').addEventListener('input', (e) => {
        document.getElementById('iterations-value').textContent = e.target.value;
        debouncedRegenerate();
    });
    
    document.getElementById('lsystem-angle').addEventListener('input', (e) => {
        document.getElementById('angle-value').textContent = e.target.value + '°';
        debouncedRegenerate();
    });
    
    document.getElementById('lsystem-step').addEventListener('input', (e) => {
        document.getElementById('step-value').textContent = parseFloat(e.target.value).toFixed(1);
        debouncedRegenerate();
    });
});

function updateLSystemInfo(lsystem) {
    currentLSystemData = lsystem;
    document.getElementById('info-name').textContent = lsystem.plantname || 'Untitled';
    document.getElementById('info-author').textContent = lsystem.author || 'Anonymous';
    document.getElementById('info-created').textContent = new Date(lsystem.created).toLocaleDateString();
    document.getElementById('info-iterations').textContent = lsystem.iterations;
    document.getElementById('info-description').textContent = lsystem.description || 'No description provided';
    
    // Update control values
    document.getElementById('lsystem-iterations').value = lsystem.iterations;
    document.getElementById('iterations-value').textContent = lsystem.iterations;
    document.getElementById('lsystem-angle').value = lsystem.angle;
    document.getElementById('angle-value').textContent = lsystem.angle + '°';
    document.getElementById('lsystem-step').value = lsystem.stepLength;
    document.getElementById('step-value').textContent = lsystem.stepLength.toFixed(1);
}

function loadLSystem(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const lsystem = JSON.parse(e.target.result);
            
            // Generate new geometry
            const geometry = generateLSystemGeometry(lsystem);
            const material = new THREE.LineBasicMaterial({ 
                color: 0x7dcfff,
                linewidth: 2
            });
            
            // Remove existing L-system if present
            if (currentLSystem) {
                scene.remove(currentLSystem);
            }
            
            // Create mesh and add to scene
            const mesh = new THREE.LineSegments(geometry, material);
            
            // Center the geometry at origin
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const center = new THREE.Vector3();
            box.getCenter(center);
            geometry.translate(-center.x, -center.y, -center.z);
            
            // Reset transform values
            currentLSystemScale = 1.0;
            currentLSystemHeight = 0.0;
            document.getElementById('lsystem-scale').value = 1.0;
            document.getElementById('scale-value').textContent = '1.0';
            document.getElementById('lsystem-height').value = 0.0;
            document.getElementById('height-value').textContent = '0.0';
            
            mesh.scale.setScalar(currentLSystemScale);
            mesh.position.y = currentLSystemHeight;
            
            scene.add(mesh);
            currentLSystem = mesh;
            
            // Update info window and controls
            updateLSystemInfo(lsystem);
            
            // Add log entry
            addLogEntry(`Loaded L-System: ${lsystem.plantname}`, 'info');
            
        } catch (error) {
            console.error('Error loading L-System:', error);
            addLogEntry('Error loading L-System', 'error');
        }
    };
    reader.readAsText(file);
}

function generateLSystemGeometry(lsystem) {
    const states = [];
    const vertices = [];
    const lines = [];
    let currentState = {
        pos: new THREE.Vector3(0, 0, 0),
        dir: new THREE.Vector3(0, 1, 0),
        right: new THREE.Vector3(1, 0, 0)
    };
    
    const stepLength = lsystem.stepLength || 1;
    const angle = (lsystem.angle || 25.7) * Math.PI / 180;
    let axiom = lsystem.axiom;
    let rules = {};
    
    // Parse rules
    lsystem.rules.split('\n').forEach(rule => {
        const [symbol, production] = rule.split('=');
        if (symbol && production) {
            rules[symbol.trim()] = production.trim();
        }
    });
    
    // Apply rules
    for (let i = 0; i < lsystem.iterations; i++) {
        let newAxiom = '';
        for (let char of axiom) {
            newAxiom += rules[char] || char;
        }
        axiom = newAxiom;
    }
    
    // Generate geometry
    for (let char of axiom) {
        switch (char) {
            case 'F':
                const start = currentState.pos.clone();
                currentState.pos.add(currentState.dir.clone().multiplyScalar(stepLength));
                vertices.push(start, currentState.pos.clone());
                lines.push(vertices.length - 2, vertices.length - 1);
                break;
            case '+':
                const rotMatrixPlus = new THREE.Matrix4().makeRotationAxis(currentState.right, -angle);
                currentState.dir.applyMatrix4(rotMatrixPlus);
                break;
            case '-':
                const rotMatrixMinus = new THREE.Matrix4().makeRotationAxis(currentState.right, angle);
                currentState.dir.applyMatrix4(rotMatrixMinus);
                break;
            case '[':
                states.push({
                    pos: currentState.pos.clone(),
                    dir: currentState.dir.clone(),
                    right: currentState.right.clone()
                });
                break;
            case ']':
                if (states.length > 0) {
                    currentState = states.pop();
                }
                break;
        }
    }
    
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flatMap(v => [v.x, v.y, v.z]), 3));
    geometry.setIndex(lines);
    
    return geometry;
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    // L-System transform controls
    document.getElementById('lsystem-scale').addEventListener('input', (e) => {
        currentLSystemScale = parseFloat(e.target.value);
        document.getElementById('scale-value').textContent = currentLSystemScale.toFixed(1);
        updateLSystemTransform();
    });
    
    document.getElementById('lsystem-height').addEventListener('input', (e) => {
        currentLSystemHeight = parseFloat(e.target.value);
        document.getElementById('height-value').textContent = currentLSystemHeight.toFixed(1);
        updateLSystemTransform();
    });
    
    // L-System generation controls
    document.getElementById('lsystem-iterations').addEventListener('input', (e) => {
        document.getElementById('iterations-value').textContent = e.target.value;
    });
    
    document.getElementById('lsystem-angle').addEventListener('input', (e) => {
        document.getElementById('angle-value').textContent = e.target.value + '°';
    });
    
    document.getElementById('lsystem-step').addEventListener('input', (e) => {
        document.getElementById('step-value').textContent = parseFloat(e.target.value).toFixed(1);
    });
    
    document.getElementById('regenerate-lsystem').addEventListener('click', regenerateLSystem);
});

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
    const tableBody = document.querySelector('#users-table tbody');
    if (!tableBody) return;

    // Clear existing rows
    tableBody.innerHTML = '';

    // Sort users by ID
    const sortedUsers = Array.from(activeUsers.values()).sort((a, b) => a.id.localeCompare(b.id));

    // Add rows for each user
    sortedUsers.forEach(user => {
        const row = document.createElement('tr');
        
        // Create name cell with star for client user
        const nameCell = document.createElement('td');
        nameCell.textContent = user.id === clientId ? `⭐ ${user.username || `User_${user.id.slice(0, 5)}`}` : user.username || `User_${user.id.slice(0, 5)}`;
        row.appendChild(nameCell);

        const typeCell = document.createElement('td');
        const typeSpan = document.createElement('span');
        typeSpan.className = 'user-type';
        typeSpan.textContent = 'USER';
        typeCell.appendChild(typeSpan);
        row.appendChild(typeCell);

        const statusCell = document.createElement('td');
        statusCell.textContent = 'Online';
        row.appendChild(statusCell);

        const positionCell = document.createElement('td');
        positionCell.textContent = '(0.00, 0.00, 0.00)';
        row.appendChild(positionCell);

        const infoCell = document.createElement('td');
        infoCell.textContent = '';
        row.appendChild(infoCell);

        tableBody.appendChild(row);
    });

    // Update stats
    const userCountEl = document.getElementById('user-count');
    const viewerCountEl = document.getElementById('viewer-count');
    const clientIdEl = document.getElementById('client-id');
    
    if (userCountEl) userCountEl.textContent = activeUsers.size;
    if (viewerCountEl) viewerCountEl.textContent = 0;  // We don't track viewers yet
    if (clientIdEl) clientIdEl.textContent = clientId || '-';
}

// Window management functionality
function getAllWindowPositions() {
    const layout = {};
    document.querySelectorAll('.window').forEach(window => {
        const id = window.id;
        const rect = window.getBoundingClientRect();
        layout[id] = {
            left: window.style.left,
            top: window.style.top,
            width: window.style.width,
            height: window.style.height,
            transform: window.style.transform,
            minimized: window.classList.contains('minimized'),
            zIndex: window.style.zIndex || '1'
        };
    });
    return layout;
}

function loadWindowLayout(layout) {
    Object.entries(layout).forEach(([id, position]) => {
        const window = document.getElementById(id);
        if (window) {
            window.style.left = position.left;
            window.style.top = position.top;
            window.style.width = position.width || '';
            window.style.height = position.height || '';
            window.style.transform = position.transform || '';
            window.style.zIndex = position.zIndex || '1';
            
            if (position.minimized) {
                window.classList.add('minimized');
            } else {
                window.classList.remove('minimized');
            }
        }
    });
}

// Window management button handlers
document.addEventListener('DOMContentLoaded', () => {
    const echoBtn = document.getElementById('echo-windows');
    const saveBtn = document.getElementById('save-windows');
    const loadBtn = document.getElementById('load-windows');
    const fileInput = document.getElementById('window-config-file');

    if (echoBtn) {
        echoBtn.addEventListener('click', () => {
            const positions = getAllWindowPositions();
            console.log('Current Window Positions:', positions);
            
            // Create a formatted message for the log
            const message = Object.entries(positions)
                .map(([id, pos]) => {
                    return `${id}: (${Math.round(pos.x)}, ${Math.round(pos.y)}) - ` +
                           `${pos.visible ? 'Visible' : 'Hidden'}, ` +
                           `${pos.minimized ? 'Minimized' : 'Normal'}`;
                })
                .join('\n');
            
            addLogEntry('Window Positions:\n' + message);
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const positions = getAllWindowPositions();
            const blob = new Blob([JSON.stringify(positions, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `window-layout-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            addLogEntry('Window layout saved to file');
        });
    }

    if (loadBtn && fileInput) {
        loadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const layout = JSON.parse(event.target.result);
                    loadWindowLayout(layout);
                    addLogEntry('Window layout loaded successfully');
                } catch (error) {
                    console.error('Error loading window layout:', error);
                    addLogEntry('Error loading window layout: ' + error.message);
                }
            };
            reader.readAsText(file);
            fileInput.value = ''; // Reset for future use
        });
    }
});

// Add this CSS to the existing styles
const style = document.createElement('style');
style.textContent = `
    #users-window {
        max-height: 80vh !important;
        display: flex;
        flex-direction: column;
    }
    
    #users-table-container {
        flex-grow: 1;
        overflow-y: auto;
    }
    
    #users-table td {
        padding: 2px 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.2;
        max-width: 150px;
    }
    
    .user-type {
        background-color: #4CAF50;
        padding: 1px 4px;
        border-radius: 2px;
        color: white;
        font-size: 0.8em;
    }

    .stats-container {
        padding: 4px;
    }

    .stat-row {
        display: flex;
        justify-content: space-between;
        padding: 2px 4px;
        line-height: 1.2;
    }

    .stat-row span:first-child {
        color: #8899aa;
    }

    @keyframes flash {
        0% { opacity: 1; }
        50% { opacity: 0.3; }
        100% { opacity: 1; }
    }

    .flash {
        animation: flash 0.3s ease-out;
    }
`;
document.head.appendChild(style);

// Add save/load layout functionality
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('save-layout').addEventListener('click', () => {
        const layout = getAllWindowPositions();
        const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'window-layout.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Add visual feedback
        const saveBtn = document.getElementById('save-layout');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Layout Saved!';
        setTimeout(() => {
            saveBtn.textContent = originalText;
        }, 1000);
    });

    document.getElementById('load-layout').addEventListener('click', () => {
        document.getElementById('layout-file').click();
    });

    document.getElementById('layout-file').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const layout = JSON.parse(e.target.result);
                    loadWindowLayout(layout);
                } catch (error) {
                    console.error('Error loading layout:', error);
                }
            };
            reader.readAsText(file);
            event.target.value = ''; // Reset for future use
        }
    });
});
