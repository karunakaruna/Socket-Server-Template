        // Setup WebSocket client to receive messages from the server      
        const ws = new WebSocket('wss://worldtree.herokuapp.com'); // Replace with your Heroku app's WebSocket address
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'color') {
                // Update the cube's color
                cube.material.color.set(message.value);
            }
        };

// define the camera stuff



let controlState = 'orbit'; // can be 'orbit' or 'custom'
let mouse = new THREE.Vector2();
let pivotPoint = new THREE.Vector3(0, 0, 0);
let spherical = new THREE.Spherical(10, THREE.Math.degToRad(45), 0);


const MAX_PIVOT_X = 20;
const MIN_PIVOT_X = -20;
const MAX_RADIUS = 20;
const MIN_RADIUS = 5;
const deadZoneSize = 500; // 500x500 pixels

// event listener
window.addEventListener('keydown', function(event) {
    if (event.key === 'c') {
        console.log('c pressed');
        if (controlState === 'orbit') {
            controls.enabled = false;
            controlState = 'custom';
        } else {
            controls.enabled = true;
            controlState = 'orbit';
        }
    }
});



// mouse move handler
window.addEventListener('mousemove', function(event) {
    if (controlState !== 'custom') return;

    // Calculate mouse movement from the center of the screen
    const deltaX = (window.innerWidth / 2) - event.clientX;
    const deltaY = (window.innerHeight / 2) - event.clientY;

    // Ignore movements inside the dead zone
    if (Math.abs(deltaX) < deadZoneSize / 2 && Math.abs(deltaY) < deadZoneSize / 2) return;

    // Update the camera's pivot based on mouse movement
    pivotPoint.x = THREE.Math.clamp(pivotPoint.x - deltaX * 0.01, MIN_PIVOT_X, MAX_PIVOT_X);
    pivotPoint.z += deltaY * 0.01;

    // Update camera position based on updated pivot and spherical coordinates
    camera.position.setFromSphericalCoords(spherical.radius, spherical.phi, spherical.theta);
    camera.position.add(pivotPoint);
   // camera.lookAt(pivotPoint);
});


// mouse wheel handler
window.addEventListener('wheel', function(event) {
    if (controlState !== 'custom') return;

    spherical.radius -= event.deltaY * 0.1;
    spherical.radius = THREE.Math.clamp(spherical.radius, MIN_RADIUS, MAX_RADIUS);

    camera.position.setFromSphericalCoords(spherical.radius, spherical.phi, spherical.theta);
    camera.position.add(pivotPoint);
    camera.lookAt(pivotPoint);
});



let camera, scene, renderer, controls;

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 10);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // GLTF loader
    const loader = new THREE.GLTFLoader();

    loader.load('grid.glb', function(gltf) {
        // Iterate through all the meshes in the loaded GLTF model
        gltf.scene.traverse(function(child) {
            if (child instanceof THREE.Mesh) {
                // Create a white wireframe material with emissive
                const material = new THREE.MeshBasicMaterial({
                    color: 0xffffff,         // White color
                    emissive: 0xffffff,     // White emissive color
                    emissiveIntensity: 1,   // Emissive intensity (adjust as needed)
                    wireframe: true,        // Enable wireframe rendering
                });
    
                // Apply the new material to the mesh
                child.material = material;
            }
        });
    
        // Add the GLTF scene to your Three.js scene
        scene.add(gltf.scene);
    }, undefined, function(error) {
        console.error('An error occurred loading the GLTF:', error);
    });
    

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();

    window.addEventListener('resize', onWindowResize, false);
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
