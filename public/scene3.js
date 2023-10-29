import { loadModel, printGlobalState } from "./functions";
import { globalState} from "./state";
import { addListener, addRightListener, mouseCoords } from "./clicks";
import {cuboid} from "./classes";


// Create a scene
const scene = new THREE.Scene();

// Create a camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Create a renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add mouse listener to update mouse coordinates in GUI


// Create a cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
const cube = new THREE.Mesh(geometry, material);
cube.position.y += 1; // Move the cube up 1 unit
cube.name = "Cube";
scene.add(cube);

// Create a light
const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(0, 0, 10);
scene.add(light);

// Create a directional light
const directionalLight = new THREE.DirectionalLight(0x0000ff, 1);
directionalLight.position.set(0, 1, 0);
scene.add(directionalLight);

// Create a plane
const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.name = "Plane";
scene.add(plane);

// Add OrbitControls
const controls = new THREE.OrbitControls(camera, renderer.domElement);


scene.add(new cuboid('cuboid')   );




// Load in a GLTF model
let gBeacon = null;

const beacon = loadModel(scene,'./models/beaconLight.glb');

console.log('beacon:', gBeacon);

globalState.camera = camera;
globalState.scene = scene;
globalState.renderer = renderer;

// Create a GUI element to display mouse coordinates
const gui = new dat.GUI();

gui.add(mouseCoords, "x").name("Mouse X").listen();
gui.add(mouseCoords, "y").name("Mouse Y").listen();


// Render the scene
function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update(); // Update the controls in the animation loop
    globalState.mouseCoords = { x: mouseCoords.x, y: mouseCoords.y };
    // printGlobalState();
}
render();

// Create a div element to hold the list
const listDiv = document.createElement('div');
listDiv.id = 'list';
listDiv.style.position = 'absolute';
listDiv.style.top = '0';
listDiv.style.left = '0';
listDiv.style.width = '200px';
listDiv.style.height = '100%';
listDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
listDiv.style.overflowY = 'scroll';
document.body.appendChild(listDiv);


// Scale the three.js scene when you change the window size.
function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize, false);

function traverseSceneGraph(object, indent) {
    
    console.log(indent + object.name);
    const listItem = document.createElement('li');
    listItem.textContent = indent + object.name;
    document.getElementById('list').appendChild(listItem);
    if (object.children.length > 0) {
        for (let i = 0; i < object.children.length; i++) {
            traverseSceneGraph(object.children[i], indent + "> ");
        }
    }
}




// Traverse the scene graph and add elements to the list
// traverseSceneGraph(scene, "");

// Add event listener for space bar
window.addEventListener("keydown", function(event) {
    if (event.code === "Space") {
        // Clear the list div
        document.getElementById('list').innerHTML = '';
        traverseSceneGraph(scene, "");
    }
});

addListener();
addRightListener();



// Add event listener for space bar
window.addEventListener("keydown", function(event) {
    if (event.code === "Space") {
        document.getElementById('list').innerHTML = '';
        traverseSceneGraph(scene, "");
    }
});



addListener();
addRightListener();
