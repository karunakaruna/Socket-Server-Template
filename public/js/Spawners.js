//Spawners.js

import { scene, activeMixers, pingModel, beaconLightModel } from '../scene3.js';
import { playSpatialAudio } from './Audio.js';
import { loadAllWorlds, loadPingModel, loadBeaconLightModel, gltfScene,  setBoundingBox, checkSpriteVisibility } from './Loaders.js';



// PING 
try {
    console.log("pingModel", pingModel);

}catch{
    console.log("pingModel not found");

}

// PING 
try {
    console.log("beaconLight", beaconLightModel);

}catch{
    console.log("beaconlightModel not found");

}


function spawnPingAtPosition(position) {

    const pingInstance = pingModel.clone();
    pingInstance.position.copy(position).add(new THREE.Vector3(0, 1, 0));
    pingInstance.animations = pingModel.animations;
    pingInstance.visible = true;
    scene.add(pingInstance);
    // Play spatial audio at the given position
    playSpatialAudio('beep', position, 1);

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

// BEACONLIGHT <<<<<<<<<<<<
function spawnBeaconLightAtPosition(position, model) {
    const beaconLightInstance = model.clone();
    beaconLightInstance.position.copy(position).add(new THREE.Vector3(0, 0, 0));
    beaconLightInstance.visible = true;

    // Set the initial material opacity
    beaconLightInstance.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.transparent = true; // Required to allow fading
            child.material.opacity = 1;
        }
    });

    scene.add(beaconLightInstance);

    // Play spatial audio at the given position
    playSpatialAudio('beacon', position);

    // Fade out using Tween.js
    const fadeOut = { opacity: 1 };
    new TWEEN.Tween(fadeOut)
        .to({ opacity: 0 }, 60000)  // 60 seconds
        .onUpdate(() => {
            beaconLightInstance.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.opacity = fadeOut.opacity;
                }
            });
        })
        .onComplete(() => {
            scene.remove(beaconLightInstance);
        })
        .start();
    }

// ENTRANCE PING
export function spawnEntrancePingAtPosition(position) {
    const pingInstance = pingModel.clone();
    pingInstance.position.copy(position).add(new THREE.Vector3(0, 2, 0)); // Higher position for distinction
    pingInstance.scale.set(6, 6, 6); // Make it larger
    pingInstance.animations = pingModel.animations;
    pingInstance.visible = true;
    scene.add(pingInstance);

    // Play spatial audio at the given position
    playSpatialAudio('chime', position, 1);

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

    export{spawnPingAtPosition, spawnBeaconLightAtPosition};