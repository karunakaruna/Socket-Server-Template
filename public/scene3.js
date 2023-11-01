//Scene3.js

let userID = null;
const scene = new THREE.Scene();

import { loadAllWorlds, loadPingModel, loadBeaconLightModel, gltfScene, setBoundingBox, checkSpriteVisibility, loadedGLTF, pingModel, beaconLightModel     } from './js/Loaders';
import { addMouseMovementListener, addScrollWheelListener, addClickListener, targetRotationX, targetRotationZ, targetPosition, targetFOV, addRightClickListener } from './js/Listeners.js';
import { spawnBeaconLightAtPosition, spawnPingAtPosition, spawnEntrancePingAtPosition } from './js/Spawners.js';
import { myUserID, getMyID, users, ws } from './js/WebSockets.js'; 
import { addLog } from './js/log.js';

import { bookmark } from './js/Bookmark.js';
import {onWindowResize} from './js/Resizer.js';
import { playSpatialAudio } from './js/Audio';
import { showModal } from './js/ShowModal';
import { listener } from './js/Audio';
import { DOM } from './js/DOM';


// Modal
DOM();

export const activeMixers = [];





    
    

    // Initialize cube position, target position, and rotation
    let cubePosition = new THREE.Vector3(0, 0, 0);
    

    //Camera Movement
    const maxMovement = 8;
    const damping = 0.04; // Damping factor to control lerping speed
    const deadZoneRadius = 0; // Adjust this for the dead-zone size
    let cubeRotationY = 0; // Initial rotation around Y-axis
    const rotationSpeed = 0.1; // Adjust this for rotation speed
    let cameraFOV = 60;

    // Camera Renderer Setup
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    const fovLerpSpeed = 0.1; // Adjust this for zoom speed
    const customUpVector = new THREE.Vector3(0, 0, 1); // Example: Use the default "up" direction
    camera.up.copy(customUpVector);
    camera.position.set(0, 25, 0);
    camera.rotation.set(-1.5708, 0, 0);
    camera.add(listener);





    export const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
 

   


    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    

 

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
    cube.visible = true;
    cube.add(camera);




    const gridGeometry = new THREE.PlaneGeometry(188, 188, 88, 88);
    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = Math.PI / 2;



    scene.add(grid);
    scene.add(cube);
    



//  Jiggle Sphere
    const userGeometry = new THREE.SphereGeometry(0.2, 3, 3); 
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

    export{ scene, cube, camera, mouse, raycaster, userID, userSphere };


    const lerpFactor = 0.05;


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

    // Move Spheres for each user
    for (const userID in users) {
        const user = users[userID];
        user.sphere.position.lerp(user.targetPosition, 0.05);
    }
    renderer.render(scene, camera);
    setBoundingBox();
    checkSpriteVisibility()
    };


        animate();




// Websocket Error Handling
