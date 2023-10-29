export class cuboid extends THREE.Object3D {
    constructor(name = 'cuboid', x = 0, y = 0, z = 0, color = 0x00ffff) {
        super();
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshPhongMaterial({ color: color });
        
        // Instead of using 'super', we create a new Mesh and assign it to a property
        this.mesh = new THREE.Mesh(geometry, material);
        
        this.mesh.name = name;
        this.mesh.position.set(x, y, z);
        this.add(this.mesh);
    }

    // You can also add methods to interact with the mesh, e.g.:
    addToScene(scene) {
        scene.add(this);
    }

    // Another example: change color
    setColor(color) {
        console.log("Changing color to", color);
        console.log(this.mesh.material.color);
        this.mesh.material.color.set(color);
    }
    
}
