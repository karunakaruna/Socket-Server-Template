//import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r124/three.min.js';

//import { GLTFLoader } from 'https://unpkg.com/three@0.126.0/examples/js/loaders/GLTFLoader.js';
import {cube,camera} from './scene3.js';

//All World Loader//
let gltfScene;
let loadedGLTF;
//let sprites;
let pingModel;
const sprites = [];
const boundingBox = new THREE.Box3();

export function setBoundingBox(){
    const cubePosition = cube.position;
    const size = 60;
    boundingBox.setFromCenterAndSize(cubePosition, new THREE.Vector3(size, size, size));
};

export function checkSpriteVisibility() {
    const scaleFactor = camera.fov / 75;
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

export function loadAllWorlds(scene) {
    const loader = new THREE.GLTFLoader();
    loader.load('models/all_worlds.glb', function (gltf) {
    loadedGLTF = gltf;
    gltfScene = gltf.scene;
    scene.add(gltfScene);

    gltfScene.traverse(function (child) {
        if (child.userData && child.userData.Name) {
            const canvas = document.createElement('canvas');
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
    
            const sprite = new THREE.Sprite(spriteMaterial);
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
export { pingModel };
export { gltfScene };
export { loadedGLTF };
export { sprites };
// Beaconlight Loader ///
export function loadBeaconLightModel(scene) {
        const beaconLightLoader = new THREE.GLTFLoader();
        let beaconLightModel; // Store the loaded beacon light model
        beaconLightLoader.load('models/beaconlight.glb', (gltf) => {
            beaconLightModel = gltf.scene; // Store the loaded model
            beaconLightModel.animations = gltf.animations; // Store animations

            beaconLightModel.scale.set(2, 2, 2);
            beaconLightModel.position.set(0, 1, 0);
            const materialRed = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            beaconLightModel.traverse((child) => {
                if (child.isMesh) {
                    child.material = materialRed;
                }
            });
            
            beaconLightModel.visible = false;
            scene.add(beaconLightModel);
            
            // If you end up adding animations for the beacon light later, you can initialize its animation mixer here:
            // beaconLightMixer = new THREE.AnimationMixer(beaconLightModel);

        }, undefined, (error) => {
            console.error('An error occurred loading the beacon light GLB:', error);
        });
}

