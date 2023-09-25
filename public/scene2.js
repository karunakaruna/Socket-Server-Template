        // Setup WebSocket client to receive messages from the server
        const ws = new WebSocket('wss://worldtree.herokuapp.com'); // Replace with your Heroku app's WebSocket address

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'color') {
                // Update the cube's color
                cube.material.color.set(message.value);
            }
        };





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
    loader.load('https://raw.githubusercontent.com/karunakaruna/memory/main/Temple_Garden_21b.glb', function(gltf) {
        scene.add(gltf.scene);
    }, undefined, function(error) {
        console.error('An error occurred loading the GLTF:', error);www
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
