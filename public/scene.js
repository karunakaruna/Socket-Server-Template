//Scene3.js

let userID = null;
const scene = new THREE.Scene();


import {WebSocketConnection} from './js/WebSockets.js';
export const wsc= new WebSocketConnection();
wsc.initializeWebSocketConnection();

import { loadAllWorlds, loadPingModel, loadBeaconLightModel, setBoundingBox, checkSpriteVisibility, loadedGLTF, pingModel, beaconLightModel     } from './js/Loaders';
import { addMouseMovementListener, addScrollWheelListener, addClickListener, addRightClickListener } from './js/Listeners.js';
import { DOM } from './js/util/DOM';
import { initCamera, updateCamera, calculateFocusDistance } from './js/Camera';
import { activeMixers } from './js/Spawners.js';
import { UserSphere } from './js/scene/userSphere';
import { initGrid } from './js/scene/grid';
import { Lights, TextureSpot } from './js/scene/lights';
import { Resizer } from './js/util/Resizer';
import { submitForm, submitRegisterForm, logOut, submitEmail, updatePassword } from './submit-module.js';
import { attachLabelToObjectsAdv } from './js/Sprite.js';


DOM();
const { camera, renderer, cube, composer, bokehPass } = initCamera(scene);
console.log('my user ID', wsc.myUserID);
console.log('my user object', wsc.users[wsc.myUserID]);
const vec = new THREE.Vector3(0,0,0);


// const player = new UserSphere(null, cube);
// scene.add(player);
// const playerlevel = player.getLevel();
// player.layers.enable(1); // Add userSphere to specified level
// console.log('userSphereLevel: ' + playerlevel);


const grid = initGrid();
// cube.add(usercircle);
scene.add(grid);
grid.layers.enable(1); // Add to the raycaster layer

new Lights(scene);
// new TextureSpot(scene);
new Resizer(camera, renderer, composer);


loadAllWorlds(scene);
loadPingModel(scene);
// loadGrid(scene);
loadBeaconLightModel(scene).then(() => {
    console.log("Beacon Light Model loaded and ready for use.");
    // Now safe to clone and use beaconLightModel
}).catch((error) => {
    console.error("An error occurred loading the beacon light GLB:", error);
});
addMouseMovementListener(scene);
addScrollWheelListener();
addClickListener(scene);
addRightClickListener(scene);


export function getBeaconLightModel() {
    if (!beaconLightModel) {
        throw new Error("BeaconLightModel is not loaded yet.");
    }
    return beaconLightModel;
}


export {loadedGLTF, pingModel, beaconLightModel, scene, cube, camera, userID, renderer};

//Animation Update Loop
const animate = () => {
    requestAnimationFrame(animate);
    
    activeMixers.forEach(mixer => mixer.update(0.01));

    // Use lerp to smoothly change FOV
    updateCamera(camera,cube);
    TWEEN.update();

    // Move Spheres for each user
    for (const userID in wsc.users) {
        const userSphere = wsc.users[userID];
        if (userSphere && userSphere.getSphere()) {
            const targetPosition = userSphere.targetPosition;  // Assuming you have a targetPosition property
            userSphere.getSphere().position.lerp(targetPosition, 0.05);
        }
    }

    const focusDistance = calculateFocusDistance(camera, cube);
    bokehPass.uniforms["focus"].value = focusDistance;
    // renderer.render(scene, camera);
    
    composer.render();
    setBoundingBox();
    checkSpriteVisibility()
    };

animate();
// Websocket Error Handling

