///clicks.js

import { globalState } from "./state.js";
import { cuboid } from "./classes.js";
// import { beacon } from "./scene4.js";

// Create a raycaster
const raycaster = new THREE.Raycaster();

// Create a mouse vector
const mouse = new THREE.Vector2();


// Add event listener for mouse click

export function addListener() {
    // console.log(beacon);
    window.addEventListener("click", function(event) {
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, globalState.camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(globalState.scene.children, true);

    if (intersects.length > 0) {
        // Create a new cuboid at the intersection point
       
        const intersection = intersects[0];
        const bob = new cuboid('cuboid', intersection.point.x, intersection.point.y, intersection.point.z, 'white');
        // bc.position.x = intersection.point.x;
       
        globalState.scene.add(bob);
        // globalState.scene.add(beacon)

        // Add a right-click listener to change the color of the cuboid

    }
    });
};           



export function addRightListener() {
    window.addEventListener("contextmenu", function(event) { // Change event listener to right click
        console.log('right click');
        // Calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
        // Update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, globalState.camera);
    
        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(globalState.scene.children, true);
    
        if (intersects.length > 0) {
            
            // Check if the intersected object is an instance of cuboid
            const intersectedObject = intersects[0].object;
            console.log(intersectedObject);
            if (intersectedObject.parent instanceof cuboid) {
                console.log('right click on cuboid');
                console.log(intersectedObject.parent.mesh.material.color);
                // Change the color of the cuboid to red
                intersectedObject.parent.setColor('red');
            }
        }
    });
};           




export const mouseCoords = { x: 0, y: 0 };
window.addEventListener("mousemove", function(event) {
    // Update the mouse coordinates in the GUI
    mouseCoords.x = event.clientX;
    mouseCoords.y = event.clientY;
});