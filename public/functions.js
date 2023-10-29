//functions
import { globalState } from "./state";

export function loadModel(scene, url) { 
    if (globalState.cachedGltf) {
        scene.add(cachedGltf.scene);
        return Promise.resolve(globalState.cachedGltf);
    }

    const loader = new THREE.GLTFLoader();
    return new Promise((resolve, reject) => {
        loader.load(url, function(gltf) {
            globalState.cachedModel = gltf.scene;
            scene.add(gltf.scene);
            resolve(gltf);
        }, undefined, reject);
    });
};

export function loadModel2(scene, url) { 
    const loader = new THREE.GLTFLoader();
    loader.load(url, function(gltf) {
    });
};





export function loadBeacon2(scene) { 
    if (globalState.cachedGltf) {
        scene.add(cachedGltf.scene);
        return Promise.resolve(globalState.cachedGltf.scene);
    }

    const loader = new THREE.GLTFLoader();
    return new Promise((resolve, reject) => {
        loader.load('models/beaconlight.glb', function(gltf) {
            globalState.cachedModel = gltf;
            scene.add(gltf.scene);
            resolve(gltf.scene);
        }, undefined, reject);
    });
};

export function loadBeacon3(scene) { 
        loader.load('models/beaconlight.glb', function(gltf) {
            globalState.cachedModel = gltf;
            const object = new THREE.Object3D();
            object.add(gltf.scene);
            // scene.add(object);
            resolve(object);
        }, undefined, reject);
    };


    export function loadGltfObject(scene, url) {
        const loader = new THREE.GLTFLoader();
        return new Promise((resolve, reject) => {
            loader.load(url, function(gltf) {
                const object = new THREE.Object3D();
                object.add(gltf.scene);
                scene.add(object);
                resolve(object);
            }, undefined, reject);
        });
    }



export function printGlobalState() {
    console.log(globalState.mouseCoords.x , globalState.mouseCoords.y);
}