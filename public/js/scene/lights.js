    //Lights


    export class Lights {
        constructor(scene) {
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Use a lower intensity value like 0.2 for a dim light
            directionalLight.position.set(1, 1, 1); // Set the light's position
            scene.add(directionalLight); // Add the light to your scene
        }
    }



    

    export class TextureSpot {
        constructor(scene) {
            const textureLoader = new THREE.TextureLoader();
            const spotLightMap = textureLoader.load('./textures/Caspar.jpg');
            const spotLight = new THREE.SpotLight(0xffffff);
            spotLight.intensity = 1.5; // Set the intensity value
            spotLight.angle = Math.PI / 5;
            spotLight.penumbra = 0.3;
            spotLight.position.set(0, 10, 0);
            spotLight.castShadow = true;
            spotLight.shadow.camera.near = 10;
            spotLight.shadow.camera.far = 100;
            spotLight.shadow.mapSize.width = 1024;
            spotLight.shadow.mapSize.height = 1024;
            spotLight.shadow.focus = 1;

            spotLight.map = spotLightMap;
            spotLight.target.position.set(0, 0, 0);
            spotLight.target.updateMatrixWorld();
            spotLight.shadow.camera.fov = 30;
            scene.add(spotLight.target);
            scene.add(spotLight);
            console.log('SPOTLIGHT CREATED!!');
        }
    }
