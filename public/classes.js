import { globalState } from "./state.js";

export class cuboid extends THREE.Object3D {
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
        globalState.renderer.render(globalState.scene, globalState.camera); // Force a render to see the change immediately

    }
}
