    
    import { listener } from './Audio';
    import { targetRotationX, targetRotationZ, targetPosition, targetFOV} from './Listeners.js'


    let cubePosition = new THREE.Vector3(0, 0, 0);
    //Camera Movement
    const maxMovement = 8;
   
    const deadZoneRadius = 0; // Adjust this for the dead-zone size
    let cubeRotationY = 0; // Initial rotation around Y-axis
    const rotationSpeed = 0.1; // Adjust this for rotation speed
    let cameraFOV = 60;
    

    export function initCamera(scene){
            // Initialize cube position, target position, and rotation


            // Camera Renderer Setup
            const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
            // Adjust this for zoom speed
            const customUpVector = new THREE.Vector3(0, 0, 1); // Example: Use the default "up" direction
            camera.up.copy(customUpVector);
            camera.position.set(0, 25, 0);
            camera.rotation.set(-1.5708, 0, 0);
            camera.add(listener);

            const renderer = new THREE.WebGLRenderer();
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(renderer.domElement);
            
           
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
            return { camera, renderer, cube }
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