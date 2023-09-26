    //websockets
    // Setup WebSocket client to receive messages from the server      
    const ws = new WebSocket('wss://worldtree.herokuapp.com'); // Replace with your Heroku app's WebSocket address
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'color') {
            // Update the cube's color
            cube.material.color.set(message.value);
        } else if (message.type === 'ping') {
            // Process ping
            console.log('ping!');
        } else if (message.type === 'loc') {
        const receivedPosition = new THREE.Vector3(
            message.position.x,
            message.position.y,
            message.position.z,
        
        );
        console.log('hi!');
        // Call your function to spawn and animate a ping instance at this position
        spawnPingAtPosition(receivedPosition);
    } else if (message.type === 'userCount') {
        // Update the user count on the page
        document.getElementById('userCount').textContent = message.value;
    }
    
    };
    


    //Audio Stuff!
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer; // Store the audio buffer globally
    
    // Load the audio file and store it in the audioBuffer
    const audioFile = 'multichime2.mp3';
    fetch(audioFile)
      .then(response => response.arrayBuffer())
      .then(data => audioContext.decodeAudioData(data))
      .then(buffer => {
        audioBuffer = buffer; // Store the audio buffer
      })
      .catch(error => console.error('Error loading audio:', error));
    
    // Create a function to play spatial audio
    function playSpatialAudio(buffer, position) {
      const source = audioContext.createBufferSource();
      const panner = audioContext.createPanner();
    
      source.buffer = buffer;
      source.connect(panner);
    
      panner.setPosition(position.x*-1, position.y, position.z);
      panner.connect(audioContext.destination);
    
      source.start();
      source.stop(audioContext.currentTime + 2);
    }


    
    
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
    const customUpVector = new THREE.Vector3(0, 0, 1); // Example: Use the default "up" direction

    // Set the camera's "up" vector
    camera.up.copy(customUpVector);

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
    const gridGeometry = new THREE.PlaneGeometry(88, 88, 88, 88);
    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
    scene.add(cube);
    cube.add(camera);

    //Lights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Use a lower intensity value like 0.2 for a dim light
    directionalLight.position.set(1, 1, 1); // Set the light's position
    scene.add(directionalLight); // Add the light to your scene




    // GLTF loader
    let gltfScene; 
    const loader = new THREE.GLTFLoader();
    loader.load('grid6.glb', function(gltf) {
        gltfScene = gltf.scene;  // Store the scene
        scene.add(gltfScene);
    }, undefined, function(error) {
        console.error('An error occurred loading the GLTF:', error);
    });


    //ping loader
    
    const pingloader = new THREE.GLTFLoader();
    let pingModel; // Store the loaded model
    pingloader.load('ping.glb', (gltf) => {
        pingModel = gltf.scene; // Store the loaded model
        pingModel.animations = gltf.animations; // Store animations
    
        // You can scale and position the model as needed
        pingModel.scale.set(2, 2, 2);
        pingModel.position.set(0, 1, 0);
        const materialred = new THREE.MeshBasicMaterial({ color: 0xFFFFFF }); // Create a basic material with a red color
        pingModel.traverse((child) => {
            if (child.isMesh) {
                child.material = materialred;
            }
        });
        // Add the model to the scene but initially hide it
        pingModel.visible = false;
        
        scene.add(pingModel);
        //console.log(pingModel); // Check if 'Animation' exists in the console
         // Check if 'Animation' exists in the console
        pingmixer = new THREE.AnimationMixer(pingModel);
        const pingclips = pingModel.animations;
        pingclip = THREE.AnimationClip.findByName(pingclips, 'CircleAction'); // Fetch the first animation
        const pingaction = pingmixer.clipAction(pingclip);
        pingaction.play();

    }, undefined, (error) => {
        console.error('An error occurred loading the GLB:', error);
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


    function spawnPingAtPosition(position) {
        const pingInstance = pingModel.clone();
        pingInstance.position.copy(position).add(new THREE.Vector3(0, 1, 0));
        pingInstance.animations = pingModel.animations;
        pingInstance.visible = true;
        scene.add(pingInstance);
    
        let mixer = new THREE.AnimationMixer(pingInstance);
        activeMixers.push(mixer);
        const clips = pingInstance.animations; 
        const clip = THREE.AnimationClip.findByName(clips, 'CircleAction');
    
        if (clip) {
            const action = mixer.clipAction(clip);
            action.play();
    
            setTimeout(() => {
                scene.remove(pingInstance);
                mixer.stopAllAction();
                const mixerIndex = activeMixers.indexOf(mixer);
                if (mixerIndex !== -1) {
                    activeMixers.splice(mixerIndex, 1);
                }
            }, (clip.duration * 1000));
            
        } else {
            console.error("Animation clip not found");
        }
    }
    
    window.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(gltfScene.children, true);
    
        for (let i = 0; i < intersects.length; i++) {
            const userData = intersects[i].object.userData;
            if (userData && userData.URL) {
                window.open(userData.URL, "_blank");
                return;
            }
        }
    
        if (intersects.length > 0) {
            const intersection = intersects[0];
    
            // Play spatial audio at the intersection point
            playSpatialAudio(audioBuffer, intersection.point);
    
            // Spawn the ping locally
            spawnPingAtPosition(intersection.point);
    
            // Send the position data to WebSocket server
            const payload = {
                type: 'loc',
                position: {
                    x: intersection.point.x,
                    y: intersection.point.y,
                    z: intersection.point.z
                }
            };
    
            ws.send(JSON.stringify(payload));
        }
    });
    


    const activeMixers = [];

    //Animation Update Loop
        const animate = () => {
            requestAnimationFrame(animate);
            activeMixers.forEach(mixer => mixer.update(0.01));

            // Use lerp to smoothly change FOV
            camera.fov += (targetFOV - camera.fov) * fovLerpSpeed;
            camera.updateProjectionMatrix();

            // Use lerp to smoothly move the cube towards the target position
            cubePosition.lerp(targetPosition, damping);
            cube.position.copy(cubePosition);

            // Apply rotation to the cube
            cube.rotation.y = cubeRotationY;

            // Update the camera position relative to the cube
            camera.position.copy(cube.position).add(new THREE.Vector3(0, 10, 0));
            
            //camera.rotation.copy(cube.rotation)
            camera.lookAt(cube.position);
            renderer.render(scene, camera);


        };

        animate();