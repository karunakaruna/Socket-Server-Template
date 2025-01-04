import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ParticleSystem } from './ParticleSystem.js';

/**
 * Manages the Three.js scene
 */
export class ThreeScene {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.labelRenderer = null;
        this.controls = null;
        this.grid = null;
        this.autoRotate = false;
        this.showGrid = true;
        this.userObjects = new Map();
        this.particleSystem = null;
        this.clock = new THREE.Clock();
        
        this.init();
        this.setupEventHandlers();
    }

    init() {
        // Scene setup
        this.scene.background = new THREE.Color(0x1a1b26);
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(20, 15, 20);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('three-canvas'),
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Label renderer setup
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        document.body.appendChild(this.labelRenderer.domElement);
        
        // Controls setup
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
        
        // Grid setup
        this.grid = new THREE.GridHelper(40, 40, 0x888888, 0x444444);
        this.scene.add(this.grid);
        this.grid.visible = this.showGrid;
        
        // Lighting setup
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        
        // Add center sphere
        const centerGeometry = new THREE.SphereGeometry(1, 32, 32);
        const centerMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            emissive: 0x7aa2f7,
            emissiveIntensity: 0.5
        });
        const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
        this.scene.add(centerMesh);
        
        // Add center label
        const centerDiv = document.createElement('div');
        centerDiv.className = 'label';
        centerDiv.textContent = 'Z Space';
        const centerLabel = new CSS2DObject(centerDiv);
        centerMesh.add(centerLabel);
        centerLabel.position.set(0, 2, 0);
        
        // Initialize particle systems
        this.particleSystem = new ParticleSystem(this.scene);
        this.particleSystem.createStarfield();
        this.particleSystem.createCenterEffect();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start animation loop
        this.animate();
    }

    setupEventHandlers() {
        // Scene controls
        this.eventBus.on('toggleAutoRotate', () => {
            this.autoRotate = !this.autoRotate;
            this.controls.autoRotate = this.autoRotate;
        });
        
        this.eventBus.on('toggleGrid', () => {
            this.showGrid = !this.showGrid;
            this.grid.visible = this.showGrid;
        });
        
        // User management
        this.eventBus.on('userJoined', (data) => this.addUser(data));
        this.eventBus.on('userLeft', (data) => this.removeUser(data));
        this.eventBus.on('userUpdated', (data) => this.updateUser(data));
        this.eventBus.on('userListUpdated', (data) => this.updateUserList(data));
    }

    addUser(data) {
        if (this.userObjects.has(data.id)) return;
        
        // Create user sphere
        const geometry = new THREE.SphereGeometry(0.3, 32, 32);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x7aa2f7,
            emissive: 0x7aa2f7,
            emissiveIntensity: 0.5
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Create user label
        const div = document.createElement('div');
        div.className = 'label';
        div.textContent = data.name;
        const label = new CSS2DObject(div);
        mesh.add(label);
        label.position.set(0, 0.5, 0);
        
        // Create orbital trail
        const orbit = this.particleSystem.createOrbitalTrail(data.id);
        
        // Add to scene
        this.scene.add(mesh);
        this.userObjects.set(data.id, { mesh, label, orbit });
        
        // Set initial position
        if (data.position) {
            mesh.position.set(data.position.x, data.position.y, data.position.z);
        }
    }

    removeUser(data) {
        const userObject = this.userObjects.get(data.id);
        if (userObject) {
            this.scene.remove(userObject.mesh);
            this.particleSystem.remove(`orbit-${data.id}`);
            this.userObjects.delete(data.id);
        }
    }

    updateUser(data) {
        const userObject = this.userObjects.get(data.id);
        if (userObject && data.position) {
            userObject.mesh.position.set(data.position.x, data.position.y, data.position.z);
        }
    }

    updateUserList(data) {
        // Remove all existing users
        this.userObjects.forEach((obj, id) => {
            this.scene.remove(obj.mesh);
            this.particleSystem.remove(`orbit-${id}`);
        });
        this.userObjects.clear();
        
        // Add all users from the list
        data.users.forEach(user => this.addUser(user));
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        this.controls.update();
        if (this.particleSystem) {
            this.particleSystem.update(deltaTime);
        }
        
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }

    dispose() {
        // Clean up Three.js resources
        this.scene.traverse(object => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        if (this.particleSystem) {
            this.particleSystem.dispose();
        }
        
        this.renderer.dispose();
        this.controls.dispose();
    }
}
