import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const userSpheres = new Map();
const userLabels = new Map();

function createUserSphere(color = 0x7aa2f7) {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: 0x4a6ad7,
        emissiveIntensity: 0.2,
        shininess: 50
    });
    return new THREE.Mesh(geometry, material);
}

function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = 'Bold 20px Arial';
    
    // Get size of text
    const textWidth = context.measureText(text).width;
    
    // Set canvas size
    canvas.width = textWidth + 20;
    canvas.height = 30;
    
    // Clear and draw text
    context.font = 'Bold 20px Arial';
    context.fillStyle = '#ffffff';
    context.fillText(text, 10, 22);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 1, 1);
    
    return sprite;
}

function updateUserPosition(userId, coordinates, username) {
    let sphere = userSpheres.get(userId);
    let label = userLabels.get(userId);
    
    if (!sphere) {
        sphere = createUserSphere();
        userSpheres.set(userId, sphere);
        scene.add(sphere);
        
        if (username) {
            label = createTextSprite(username);
            userLabels.set(userId, label);
            scene.add(label);
        }
    }
    
    // Update sphere position
    sphere.position.set(coordinates.tx, coordinates.ty, coordinates.tz);
    
    // Update label position if it exists
    if (label) {
        label.position.set(
            coordinates.tx,
            coordinates.ty + 0.5, // Position above sphere
            coordinates.tz
        );
    }
}

function initThreeJS() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1b26);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('three-container').appendChild(renderer.domElement);

    // Controls setup
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Start animation loop
    animate();
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

// Initialize Three.js when the page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initThreeJS, 100);
});

window.addEventListener('resize', onWindowResize);

// Export functions needed by other modules
export {
    updateUserPosition,
    scene,
    camera
};
