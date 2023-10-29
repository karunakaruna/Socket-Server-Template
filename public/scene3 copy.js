//about to break things


//Scene3.js

let userID = null;
const scene = new THREE.Scene();

import { loadAllWorlds, loadPingModel, loadBeaconLightModel, gltfScene, setBoundingBox, checkSpriteVisibility, loadedGLTF, pingModel, beaconLightModel     } from './js/Loaders';
import { addMouseMovementListener, addScrollWheelListener, addClickListener, targetRotationX, targetRotationZ, targetPosition, targetFOV, addRightClickListener } from './js/Listeners.js';
import { spawnBeaconLightAtPosition, spawnPingAtPosition, spawnEntrancePingAtPosition } from './js/Spawners.js';
import { myUserID, getMyID, users, ws } from './js/WebSockets.js'; 
import { addLog } from './js/log.js';

const lerpFactor = 0.05;

// Modal
//
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});
document.querySelector("#urlMenu > button:nth-child(2)").addEventListener("click", bookmark);


//Bookmark Function
function bookmark() {
    // Create a JSON message with the user's ID and a dummy URL
    const message = {
        type: "bookmark",
        userID: myUserID,
        url: "http://dummy-url.com"
    };
    console.log('Bookmark sent:', message);
    // Send the message to the server via WebSocket
    ws.send(JSON.stringify(message));
}

//Element Grabbers
const urlModal = document.getElementById('urlModal');
const confirmButton = document.getElementById('confirmButton');
const modalText = document.getElementById('modalText');

//Show Modal Function
function showModal(objectName, url, intersectionPoint) {
    modalText.innerText = `Enter ${objectName}`;
    urlModal.style.display = 'block';
    
    // Close the modal if clicked outside the content
    urlModal.onclick = (e) => {
        if (e.target === urlModal) {
            urlModal.style.display = 'none';
        }
    };

    // When confirm is clicked, open the URL
    confirmButton.onclick = () => {
        urlModal.style.display = 'none';
    
        // Handle the entrance ping on URL confirmation
            
        const payload = {
            type: 'entrance',
            objectName: objectName,
            position: {
                x: intersectionPoint.x,
                y: intersectionPoint.y,
                z: intersectionPoint.z
            }
        };
        
        ws.send(JSON.stringify(payload));
        console.log('Payload sent:', payload);

        if (loadedGLTF && loadedGLTF.scene) {
            loadedGLTF.scene.traverse((object) => {
                if (object.userData && object.userData.Name === objectName) {
                    if (object.userData.URL) {
                        addLog(`You entered <a href="${object.userData.URL}" target="_blank">${object.userData.Name}</a>`);
                    } else {
                        addLog(`You entered ${objectName}`);
                    }
                }
            });
        }




        // Delay the opening of the URL by 1 second
        spawnEntrancePingAtPosition(intersectionPoint);

        setTimeout(() => {
            window.open(url, "_blank");
        }, 1000);
    };
    
}



// Audio ///
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer; // Store the audio buffer globally
    
    // Load the audio file and store it in the audioBuffer
    const audioFiles = {
        'chime': 'audio/multichime2.mp3',
        'beacon': 'audio/636631__eponn__soft-buildup-game-fx-3.mp3',
        'click': 'audio/420997__eponn__click.mp3',
        'beep': 'audio/528863__eponn__beep-3.mp3',
        // ...add other sounds as needed
    };
    const listener = new THREE.AudioListener();
    const loop = new THREE.PositionalAudio( listener );

// load a sound and set it as the Audio object's buffer
    const loopLoader = new THREE.AudioLoader();
    loopLoader.load( 'audio/Precession - bnk736_1.mp3', function( buffer ) {
        loop.setBuffer( buffer );
        loop.setLoop(true);
        loop.setVolume(2);
        loop.play();
    });


    let audioBuffers = {};
    
    for (let soundName in audioFiles) {
        fetch(audioFiles[soundName])
          .then(response => response.arrayBuffer())
          .then(data => audioContext.decodeAudioData(data))
          .then(buffer => {
              audioBuffers[soundName] = buffer; // Store the audio buffer with its key
          })
          .catch(error => console.error(`Error loading ${soundName} audio:`, error));
    }

    function playSpatialAudio(soundName, position, volume = 1) {
        const buffer = audioBuffers[soundName];
        if (!buffer) {
            console.error(`Audio buffer for "${soundName}" not found.`);
            return;
        }
        
        const sound = new THREE.PositionalAudio(listener);
        
        sound.setBuffer(buffer);
        sound.setRefDistance(1);
        sound.setRolloffFactor(1);
        sound.setDistanceModel('exponential');
        sound.setMaxDistance(1000);
        sound.setVolume(volume);
        sound.position.copy(position);
        scene.add(sound);
        
        sound.play();
    
        sound.onEnded = function() {
            scene.remove(sound);
        };
    }
    

    
    

    // Initialize cube position, target position, and rotation
    let cubePosition = new THREE.Vector3(0, 0, 0);
    

    //Camera Movement
    let cameraFOV = 60;
    const maxMovement = 8;
    const damping = 0.04; // Damping factor to control lerping speed
    const deadZoneRadius = 0; // Adjust this for the dead-zone size
    const fovLerpSpeed = 0.1; // Adjust this for zoom speed
    const customUpVector = new THREE.Vector3(0, 0, 1); // Example: Use the default "up" direction
    const cubeRotationY = 0; // Initial rotation around Y-axis
    const rotationSpeed = 0.1; // Adjust this for rotation speed
    const activeMixers = [];
    
    // Camera Renderer Setup
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.add(listener);
    camera.position.set(0, 25, 0);
    camera.rotation.set(-1.5708, 0, 0);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2()


    // Scale the three.js scene when you change the window size.
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        //labelRenderer.setSize( window.innerWidth, window.innerHeight );
    }
    window.addEventListener('resize', onWindowResize, false);


;
    
    
 
 

    // Set the camera's "up" vector
    camera.up.copy(customUpVector);

    //Setup Basis Geometry (used for camera testing)
    const geometry = new THREE.BoxGeometry(0.1,0.1,0.1);
    const material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0 });
    const cube = new THREE.Mesh(geometry, material);
    const geometry2 = new THREE.BoxGeometry();
    const material2 = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const cube2 = new THREE.Mesh(geometry2, material2);
    cube.name = "cube"; 
    cube.scale.set(1,1,1);
    cube2.scale.set(.1,.1,.1);
    cube2.position.set(0,0,0);
    cube.add(cube2);


    //Grid
    const gridGeometry = new THREE.PlaneGeometry(188, 188, 88, 88);
    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
    cube.visible = true;
    scene.add(cube);
    cube.add(camera);



//  Jiggle Sphere
    const userGeometry = new THREE.SphereGeometry(0.2, 32, 32); 
    const userMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF});  // WHITE
    const userSphere = new THREE.Mesh(userGeometry, userMaterial);
    userSphere.position.set(0, 0.7, 0);  // Slightly above the cube's center
    const tempID = getMyID();
    //console.log('uid: ' + tempID);
    // userSphere.userData.userID = tempID;
    cube.add(userSphere);  // Attach to the cube







    //Lights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Use a lower intensity value like 0.2 for a dim light
    directionalLight.position.set(1, 1, 1); // Set the light's position
    scene.add(directionalLight); // Add the light to your scene




const imageElem = document.getElementById('imageDisplay');

export{ scene, cube, camera, mouse, raycaster, playSpatialAudio, showModal, userID, userSphere, activeMixers };



loadAllWorlds(scene);
loadPingModel(scene);
loadBeaconLightModel(scene); 
addMouseMovementListener(scene);
addScrollWheelListener();
addClickListener(scene);
addRightClickListener(scene,userSphere);
export {loadedGLTF, pingModel, beaconLightModel};


//Animation Update Loop
const animate = () => {
    requestAnimationFrame(animate);
    activeMixers.forEach(mixer => mixer.update(0.01));

    // Use lerp to smoothly change FOV
    camera.fov += (targetFOV - camera.fov) * fovLerpSpeed;
    camera.updateProjectionMatrix();

    TWEEN.update();
    // Use lerp to smoothly move the cube towards the target position
    cubePosition.lerp(targetPosition, damping);
    cube.position.copy(cubePosition);

    // Lerp the cube's rotation to the target
    cube.rotation.x += (targetRotationX - cube.rotation.x) * lerpFactor;
    cube.rotation.z += (targetRotationZ - cube.rotation.z) * lerpFactor;

    for (const userID in users) {
        const user = users[userID];
        user.sphere.position.lerp(user.targetPosition, 0.05);
        

        
    }





    renderer.render(scene, camera);
    //labelRenderer.render( scene, camera );


    setBoundingBox();
    checkSpriteVisibility()

};


        animate();




// Websocket Error Handling
