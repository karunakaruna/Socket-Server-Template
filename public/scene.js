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
import { UserSphere } from './js/scene/userSphere';
import { initGrid } from './js/scene/grid';
import { Lights } from './js/scene/lights';
import { Resizer } from './js/util/Resizer';
import { submitForm, submitRegisterForm, logOut, submitEmail, updatePassword } from './submit-module.js';
import { attachLabelToObjectsAdv } from './js/Sprite.js';


DOM();
const { camera, renderer, cube } = initCamera(scene);
console.log('my user ID', wsc.myUserID);
console.log('my user object', wsc.users[wsc.myUserID]);
const vec = new THREE.Vector3(0,0,0);
const player = new UserSphere(null, cube);
scene.add(player);
const playerlevel = player.getLevel();
player.layers.enable(1); // Add userSphere to specified level
console.log('userSphereLevel: ' + playerlevel);


const grid = initGrid();
// cube.add(usercircle);
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
addRightClickListener(scene,player.getSphere());

export {loadedGLTF, pingModel, beaconLightModel, scene, cube, camera, userID, renderer, player};

//Animation Update Loop
const animate = () => {
    requestAnimationFrame(animate);
    
    activeMixers.forEach(mixer => mixer.update(0.01));

    // Use lerp to smoothly change FOV
    updateCamera(camera, cube);
    TWEEN.update();

    // Move Spheres for each user
    for (const userID in wsc.users) {
        const userSphere = wsc.users[userID];
        if (userSphere && userSphere.getSphere()) {
            const targetPosition = userSphere.targetPosition;  // Assuming you have a targetPosition property
            userSphere.getSphere().position.lerp(targetPosition, 0.05);
        }
    }
    renderer.render(scene, camera);
    setBoundingBox();
    checkSpriteVisibility()
    };

animate();
// Websocket Error Handling

