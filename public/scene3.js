//Scene3.js

let userID = null;
const scene = new THREE.Scene();

import { loadAllWorlds, loadPingModel, loadBeaconLightModel, setBoundingBox, checkSpriteVisibility, loadedGLTF, pingModel, beaconLightModel     } from './js/Loaders';
import { addMouseMovementListener, addScrollWheelListener, addClickListener, addRightClickListener } from './js/Listeners.js';
import { myUserID, getMyID, users, ws } from './js/WebSockets.js'; 
import { DOM } from './js/DOM';
import { initCamera, updateCamera } from './js/Camera';
import { activeMixers } from './js/Spawners.js';
import { initUserSphere } from './js/userSphere';
import { initGrid } from './js/grid';
import { Lights } from './js/lights';
import { Resizer } from './js/Resizer';


DOM();
const { camera, renderer, cube } = initCamera(scene);
const userSphere = initUserSphere();
const grid = initGrid();
cube.add(userSphere);  // Attach to the cube
scene.add(grid);

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
