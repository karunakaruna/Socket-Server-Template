//Loaders.js

import {cube,camera} from '../scene.js';
import { UserSphere } from './scene/userSphere.js';
// import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.150.0/examples/jsm/loaders/GLTFLoader.js';

//All World Loader//
let gltfScene;
let loadedGLTF;
//let sprites;
let pingModel;
let beaconLightModel;
const sprites = [];
const boundingBox = new THREE.Box3();

export function setBoundingBox(){
    if (UserSphere.LOCALPLAYER && UserSphere.LOCALPLAYER.getSphere()) {
        const cubePosition = UserSphere.LOCALPLAYER.getSphere().position;
        const size = 60;
        boundingBox.setFromCenterAndSize(cubePosition, new THREE.Vector3(size, size, size));
    } else {
        // Value doesn't exist, just relax or perform other actions
    }
};


export function checkSpriteVisibility() {
    const camerapositiony = camera.position.y;
    const scaleFactor = (camera.fov + (camerapositiony/4))/ 75;
    for (const sprite of sprites) {
        if (sprite.isStar) {
            sprite.visible = boundingBox.containsPoint(sprite.position);
            sprite.material.opacity = 1; // Always fully visible for Star sprites
        } else if (camera.fov < 40) {
            sprite.visible = boundingBox.containsPoint(sprite.position);
            sprite.material.opacity = 1;
        } else if (camera.fov >= 40 && camera.fov <= 50) {
            sprite.visible = boundingBox.containsPoint(sprite.position);
            
            // Linearly interpolate opacity between 1 at 40 FOV and 0 at 50 FOV.
            sprite.material.opacity = THREE.MathUtils.lerp(1, 0, (camera.fov - 40) / 10);
            
            // This ensures that the changes in opacity are taken into account
            sprite.material.needsUpdate = true;
        } else {
            sprite.visible = false;
        }

        if (sprite.visible) {
            const desiredScale = sprite.initialScale.clone().multiplyScalar(scaleFactor);
            sprite.scale.copy(desiredScale);
        }
    }
};



// export function loadGrid(scene) {
//     // Load grid
//     const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
//     const gridLoader = new THREE.GLTFLoader();
//     gridLoader.load('models/grid.glb', function (gltf) {
//         const grid = gltf.scene;
//         grid.traverse(function (child) {
//             if (child.isMesh) {
//                 child.material = gridMaterial;
//             }
//         });
//         scene.add(grid);
//     });
// }




export function loadAllWorlds(scene) {
    const loader = new THREE.GLTFLoader();
    loader.load('models/kernel_worlds.glb', function (gltf) {
    loadedGLTF = gltf;
    console.log("GLTF loaded:", loadedGLTF);
    gltfScene = gltf.scene;
    scene.add(gltfScene);
    gltfScene.traverse(function (child) {
        if (child.userData && child.userData.name) {
            if (child.userData.name.includes("Plane")) {
                console.log(child.userData.name);
            }


            console.log()
            const canvas = document.createElement('canvas');
            child.layers.enable(1);
            const context = canvas.getContext('2d');
            context.font = '20px Arial';
            const textMetrics = context.measureText(child.userData.Name);

            canvas.width = textMetrics.width + 10;
            canvas.height = 40;
            context.font = '20px Arial';
            context.fillStyle = 'white';
            context.fillText(child.userData.Name, 5, 15);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });

            //Raycaster Layer
            const spriteLayer = new THREE.Layers();
            spriteLayer.set(1); // Set to an arbitrary number different from the default layer (which is 0)
            

            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.layers.enable(10);

            sprite.position.copy(child.position);
            sprite.position.y += 0.5;

            const uniformScale = canvas.width / 35;
            sprite.scale.set(uniformScale, uniformScale * (canvas.height / canvas.width), 1);
            sprite.initialScale = sprite.scale.clone();

            sprite.center.set(0.5, 0.5);

            // Check for the 'Star' userData
            if (child.userData.Star) {
                sprite.isStar = true;
            } else {
                sprite.isStar = false;
            }

            scene.add(sprite);
            sprites.push(sprite);
        }
    });

    setBoundingBox();
    checkSpriteVisibility();
    

}, undefined, function (error) {
    console.error('An error occurred loading the GLTF:', error);
});
}


export function loadPingModel(scene) {
// Ping  //
        const pingloader = new THREE.GLTFLoader();
       // let pingModel; // Store the loaded model
        pingloader.load('models/ping.glb', (gltf) => {
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
            const pingmixer = new THREE.AnimationMixer(pingModel);
            const pingclips = pingModel.animations;
            const pingclip = THREE.AnimationClip.findByName(pingclips, 'CircleAction'); // Fetch the first animation
            const pingaction = pingmixer.clipAction(pingclip);
            pingaction.play();

        }, undefined, (error) => {
            console.error('An error occurred loading the GLB:', error);
        });
    }

    export function loadBeaconLightModel(scene) {
        return new Promise((resolve, reject) => {
            const beaconLightLoader = new THREE.GLTFLoader();
            beaconLightLoader.load('models/beaconlight.glb', (gltf) => {
                beaconLightModel = gltf.scene;
                beaconLightModel.animations = gltf.animations;
                beaconLightModel.scale.set(2, 2, 2);
                beaconLightModel.position.set(0, 1, 0);
                beaconLightModel.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
                    }
                });
                beaconLightModel.visible = false;
                scene.add(beaconLightModel);
                resolve(beaconLightModel);
            }, undefined, reject);
        });
    }
export { beaconLightModel };
export { pingModel };
export { gltfScene };
export { loadedGLTF };
export { sprites, boundingBox };
// Beaconlight Loader ///

// export {beaconLightModel};  

export function getLoadedGLTF() {
    return loadedGLTF;
}
