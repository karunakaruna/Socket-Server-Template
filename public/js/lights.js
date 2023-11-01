    //Lights


    export class Lights {
        constructor(scene) {
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Use a lower intensity value like 0.2 for a dim light
            directionalLight.position.set(1, 1, 1); // Set the light's position
            scene.add(directionalLight); // Add the light to your scene
        }
    }

    

    