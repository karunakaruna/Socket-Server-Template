    
    import { listener } from './Audio';
    import { targetRotationX, targetRotationZ, targetPosition, targetFOV} from './Listeners.js'
    import { EffectComposer } from 'https://cdn.skypack.dev/three@0.124.0/examples/jsm/postprocessing/EffectComposer.js';
    import { RenderPass } from 'https://cdn.skypack.dev/three@0.124.0/examples/jsm/postprocessing/RenderPass.js';
    import { BloomPass } from 'https://cdn.skypack.dev/three@0.124.0/examples/jsm/postprocessing/BloomPass.js';
    import { UnrealBloomPass } from 'https://cdn.skypack.dev/three@0.124.0/examples/jsm/postprocessing/UnrealBloomPass.js';
    import { BokehPass } from 'https://cdn.skypack.dev/three@0.124.0/examples/jsm/postprocessing/BokehPass.js';
    import {focusDistance} from './Listeners.js';   

    let cubePosition = new THREE.Vector3(0, 0, 0);
    //Camera Movement
    const maxMovement = 8;
   
    const deadZoneRadius = 0; // Adjust this for the dead-zone size
    let cubeRotationY = 0; // Initial rotation around Y-axis
    const rotationSpeed = 0.1; // Adjust this for rotation speed
    let cameraFOV = 60;
    
    export function calculateFocusDistance(camera, object) {
        return camera.position.distanceTo(object.position);
    }
    
 



    export function initCamera(scene){
            // Initialize cube position, target position, and rotation


            // Camera Renderer Setup
            const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
            // Adjust this for zoom speed
            const customUpVector = new THREE.Vector3(0, 0, 1); // Example: Use the default "up" direction
            camera.up.copy(customUpVector);
            camera.position.set(0, 25, 0);
            camera.rotation.set(-1.5708, 0, 0);
            camera.add(listener); //👂

            //Renderer
            const renderer = new THREE.WebGLRenderer({     
                powerPreference: "high-performance",
                antialias: false,
                stencil: false,
                depth: false});
                
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setClearColor(0x000000, 1); // Set a background color, if necessary
            renderer.setClearAlpha(1); // Ensure alpha is set to 1
            document.body.appendChild(renderer.domElement);

            // Setup EffectComposer for post-processing
                const composer = new EffectComposer(renderer);
                composer.addPass(new RenderPass(scene, camera));

                // Add BloomPass for glow effect
                const bloomPass = new UnrealBloomPass(
                    new THREE.Vector2(window.innerWidth, window.innerHeight),
                    .5, // strength5
                    .001,  // kernel size
                    .1   // sigma ?
                );
                const bokehPass = new BokehPass(scene, camera, {
                    focus: 10,
                    aperture: 0.000525,
                    maxblur: 0.005,
                
                    width: window.innerWidth,
                    height: window.innerHeight
                });
                composer.addPass(bloomPass);
                composer.addPass(bokehPass);


           
            //Setup Basis Geometry (used for camera testing)
            const geometry = new THREE.BoxGeometry(0.1,0.1,0.1);
            const material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0 });
            const cube = new THREE.Mesh(geometry, material);
            const geometry2 = new THREE.BoxGeometry();
            const material2 = new THREE.MeshBasicMaterial({ color: 0x0000ff });
            const cube2 = new THREE.Mesh(geometry2, material2);
            cube.name = "cube"; 
            cube.scale.set(1,1,1);
            cube2.scale.set(.1,.1,.1);
            cube2.position.set(0,0,0);
            cube.add(cube2);
            cube.visible = true;
            cube.add(camera);
            scene.add(cube);
            return { camera, renderer, cube, composer, bokehPass }
            };
    export function parentCamera(camera, user){
        user.add(camera);
    };


    export function updateCamera(camera, cube){
        const fovLerpSpeed = 0.1;
        const lerpFactor = 0.05;
        const damping = 0.04; // Damping factor to control lerping speed

        camera.fov += (targetFOV - camera.fov) * fovLerpSpeed;
        camera.updateProjectionMatrix();
    
        // Use lerp to smoothly move the cube towards the target position
        cubePosition.lerp(targetPosition, damping);
        cube.position.copy(cubePosition);
    
        // Lerp the cube's rotation to the target
        cube.rotation.x += (targetRotationX - cube.rotation.x) * lerpFactor;
        cube.rotation.z += (targetRotationZ - cube.rotation.z) * lerpFactor;
        return {targetRotationX, targetRotationZ}
    }

    // export {camera, renderer}