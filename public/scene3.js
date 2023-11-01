//Scene3.js

let userID = null;
const scene = new THREE.Scene();

import { loadAllWorlds, loadPingModel, loadBeaconLightModel, gltfScene, setBoundingBox, checkSpriteVisibility, loadedGLTF, pingModel, beaconLightModel     } from './js/Loaders';
import { addMouseMovementListener, addScrollWheelListener, addClickListener, addRightClickListener } from './js/Listeners.js';
import { spawnBeaconLightAtPosition, spawnPingAtPosition, spawnEntrancePingAtPosition } from './js/Spawners.js';
import { myUserID, getMyID, users, ws } from './js/WebSockets.js'; 
import { addLog } from './js/log.js';

import { bookmark } from './js/Bookmark.js';
import {onWindowResize} from './js/Resizer.js';
import { playSpatialAudio } from './js/Audio';
import { showModal } from './js/ShowModal';
import { listener } from './js/Audio';
import { DOM } from './js/DOM';
import { initCamera, updateCamera } from './js/Camera';






// Modal
DOM();
const { camera, renderer, cube } = initCamera(scene);
export const activeMixers = [];


    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();


    
    






    const gridGeometry = new THREE.PlaneGeometry(188, 188, 88, 88);
    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
    



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

    export{ scene, cube, camera, mouse, raycaster, userID, userSphere, renderer };


    


loadAllWorlds(scene);
loadPingModel(scene);
loadBeaconLightModel(scene); 
export const {targetRotationX, targetRotationZ } = addMouseMovementListener(scene);
addScrollWheelListener();
export const targetPosition = addClickListener(scene);
addRightClickListener(scene,userSphere);
export {loadedGLTF, pingModel, beaconLightModel};


const gui = new dat.GUI();
const mouseCoords = { x: targetRotationX, y: targetRotationZ};
gui.add(mouseCoords, 'x').listen();
gui.add(mouseCoords, 'y').listen();



//Animation Update Loop
const animate = () => {
    requestAnimationFrame(animate);
    // activeMixers.forEach(mixer => mixer.update(0.01));

    // Use lerp to smoothly change FOV


    // 
    updateCamera(camera, cube, targetRotationX, targetRotationZ);
    // TWEEN.update();

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
