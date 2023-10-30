class cuboid extends THREE.Object3D {
    constructor(name = 'cuboid', x = 0, y = 0, z = 0, color = 'white') {
        super();
        
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshPhongMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        
        this.name = name;
        this.position.set(x, y, z);
        this.add(mesh); // Add the mesh as a child of the Object3D
        this.mesh = mesh; // Keep a reference to the mesh if needed
    }
    
    // ... Other methods ...
    
    setColor(color) {
        console.log("Changing color to", color);
        this.mesh.material.color.set(color);
        this.mesh.material.needsUpdate = true; 
     // Force a render to see the change immediately

    }
}




// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add orbit controls to the camera
const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Add a plane to the scene
const geometry = new THREE.PlaneGeometry(10, 10);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const plane = new THREE.Mesh(geometry, material);
scene.add(plane);
const jared = new cuboid('jared')
scene.add(jared  );

// Position the camera and plane
camera.position.z = 5;
plane.rotation.x = Math.PI / 2;
// Create a point light and add it to the scene
const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);


// Create an Object3D
const object = new THREE.Object3D();

// Create a cube mesh
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
object.position.y += 1; // Move the cube up 1 unit

// Add the cube mesh to the Object3D
object.add(cubeMesh);

// Add the Object3D to the scene
scene.add(object);




const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        // Create a new cuboid at the intersection point
        const intersection = intersects[0];
        const bob = new cuboid('cuboid', intersection.point.x, intersection.point.y, intersection.point.z, 'white');
        scene.add(bob);

        // Add a right-click listener to change the color of the cuboid

    }
}

document.addEventListener('click', onMouseClick, false);

document.addEventListener('contextmenu', onRightClick, false);

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        console.log('thanks!');
        // Change the material color of the objects to green
        // material.color.set(0x00ff00);
        cubeMaterial.color.set(0x00ff00);
        jared.setColor('blue')
    }
});

function onRightClick(event) {
    console.log('right click');
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        
        // Check if the intersected object is an instance of cuboid
        const intersectedObject = intersects[0].object;
        console.log(intersectedObject);
        if (intersectedObject.parent instanceof cuboid) {
            console.log('right click on cuboid');
            // Change the color of the cuboid to red
            intersectedObject.parent.setColor('red');
        }
    }
}

// Render the scene
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}





animate();
