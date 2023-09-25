    //websockets
    // Setup WebSocket client to receive messages from the server      
    const ws = new WebSocket('wss://worldtree.herokuapp.com'); // Replace with your Heroku app's WebSocket address
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'color') {
            // Update the cube's color
            cube.material.color.set(message.value);
        }
    };
    
    
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'ping') {
            // Update the cube's color
            console.log('ping!');
        }
    };

    
    
    const scene = new THREE.Scene();

    // Initialize cube position, target position, and rotation
    let cubePosition = new THREE.Vector3(0, 0, 0);
    let targetPosition = new THREE.Vector3(0, 0, 0);

    //Camera Movement
    const maxMovement = 8;
    const damping = 0.1; // Damping factor to control lerping speed
    const deadZoneRadius = 0; // Adjust this for the dead-zone size

    let cubeRotationY = 0; // Initial rotation around Y-axis
    const rotationSpeed = 0.1; // Adjust this for rotation speed

    // Camera Renderer Setup
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Scale the three.js scene when you change the window size.
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onWindowResize, false);


    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Camera Zoom Setup
    let cameraFOV = 45;
    let targetFOV = 45; // Initial target FOV
    const fovLerpSpeed = 0.1; // Adjust this for zoom speed


    //Setup Basis Geometry (used for camera testing)
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    const geometry2 = new THREE.BoxGeometry();
    const material2 = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const cube2 = new THREE.Mesh(geometry2, material2);
    cube.name = "cube"; 
    cube2.scale.set(.1,.1,.1)
    cube2.position.set(0,0,5)
    cube.add(cube2);
    camera.position.set(0, 5, -10);
    const gridGeometry = new THREE.PlaneGeometry(8, 8, 8, 8);
    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
    scene.add(cube);
    cube.add(camera);


    // GLTF loader
    let gltfScene; 
    const loader = new THREE.GLTFLoader();
    loader.load('grid5.glb', function(gltf) {
        gltfScene = gltf.scene;  // Store the scene
        scene.add(gltfScene);
    }, undefined, function(error) {
        console.error('An error occurred loading the GLTF:', error);
    });


    //Mouse movement listener.
    window.addEventListener('mousemove', (event) => {
        const mouseX = event.clientX - window.innerWidth / 2;
        const mouseY = event.clientY - window.innerHeight / 2;

        if (Math.abs(mouseX) > deadZoneRadius || Math.abs(mouseY) > deadZoneRadius) {
            // Only update target position if outside the dead-zone
            targetPosition.x = -(mouseX / window.innerWidth) * maxMovement;
            targetPosition.z = (mouseY / window.innerHeight) * -maxMovement;
        }

        // Normalize mouse position for raycasting
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);

        const divs = [document.getElementById('floatingText'), document.getElementById('authorText'), document.getElementById('yearText')];
        divs.forEach((div, index) => {
            div.style.left = `${event.clientX}px`;
            div.style.top = `${event.clientY + index * 25}px`; // Stack the divs vertically
        });
    // Update Text Overlay for Objects Intersected
    const intersects = raycaster.intersectObjects(gltfScene.children, true);
                for (let i = 0; i < intersects.length; i++) {
                    const userData = intersects[i].object.userData;

                    if (userData) {
                        document.getElementById('floatingText').innerText = userData.Name || "";
                        document.getElementById('authorText').innerText = userData.Author || "";
                        document.getElementById('yearText').innerText = userData.Year || "";
                        return;
                    }
                }
    // If no object is intersected
    divs.forEach(div => div.innerText = '');
    });

    // Listen to scroll wheel
    window.addEventListener('wheel', (event) => {
        targetFOV += event.deltaY * 0.1; // Invert the zoom direction
        targetFOV = Math.min(Math.max(targetFOV, 25), 80); // Clamp FOV between 25 and 80
    });


    // Event Listener For Clicks!
    window.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(gltfScene.children, true);

        for (let i = 0; i < intersects.length; i++) {
            const userData = intersects[i].object.userData;
            if (userData && userData.URL) {
                window.open(userData.URL, "_blank");  // Open URL in a new tab
                return;
            }
        }
    });
    //Animation Update Loop
        const animate = () => {
            requestAnimationFrame(animate);

            // Use lerp to smoothly change FOV
            camera.fov += (targetFOV - camera.fov) * fovLerpSpeed;
            camera.updateProjectionMatrix();

            // Use lerp to smoothly move the cube towards the target position
            cubePosition.lerp(targetPosition, damping);
            cube.position.copy(cubePosition);

            // Apply rotation to the cube
            cube.rotation.y = cubeRotationY;

            // Update the camera position relative to the cube
            camera.position.copy(cube.position).add(new THREE.Vector3(0, 10, -10));
            
            //camera.rotation.copy(cube.rotation)
            camera.lookAt(cube.position);
            renderer.render(scene, camera);
        };

        animate();