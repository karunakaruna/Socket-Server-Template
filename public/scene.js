//Scene3.js

let userID = null;
const scene = new THREE.Scene();

import {WebSocketConnection} from './js/WebSockets.js';
export const wsc= new WebSocketConnection();
wsc.initializeWebSocketConnection();

import { loadAllWorlds, loadPingModel, loadBeaconLightModel, setBoundingBox, checkSpriteVisibility, loadedGLTF, pingModel, beaconLightModel     } from './js/Loaders';
import { addMouseMovementListener, addScrollWheelListener, addClickListener, addRightClickListener } from './js/Listeners.js';
import { DOM } from './js/util/DOM';
import { initCamera, updateCamera } from './js/Camera';
import { activeMixers } from './js/Spawners.js';
import { initUserSphere } from './js/scene/userSphere';
import { initGrid } from './js/scene/grid';
import { Lights } from './js/scene/lights';
import { Resizer } from './js/util/Resizer';


DOM();
const { camera, renderer, cube } = initCamera(scene);
const userSphere = initUserSphere();
const grid = initGrid();
cube.add(userSphere);  // Attach to the cube
scene.add(grid);
grid.layers.enable(1); // Add to the raycaster layer

new Lights(scene);
new Resizer(camera, renderer);


loadAllWorlds(scene);
loadPingModel(scene);
loadBeaconLightModel(scene); 
addMouseMovementListener(scene);
addScrollWheelListener();
addClickListener(scene);
addRightClickListener(scene,userSphere);

export {loadedGLTF, pingModel, beaconLightModel, scene, cube, camera, userID, renderer, userSphere};

//Animation Update Loop
const animate = () => {
    requestAnimationFrame(animate);
    
    activeMixers.forEach(mixer => mixer.update(0.01));

    // Use lerp to smoothly change FOV
    updateCamera(camera, cube);
    TWEEN.update();

    // Move Spheres for each user
    for (const userID in wsc.users) {
        const user = wsc.users[userID];
        user.sphere.position.lerp(user.targetPosition, 0.05);
    }
    renderer.render(scene, camera);
    setBoundingBox();
    checkSpriteVisibility()
    };

animate();
// Websocket Error Handling

