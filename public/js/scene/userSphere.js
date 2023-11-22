import { wsc } from "../../scene.js";
import { attachLabelToObjectsAdv } from "../Sprite.js";


export class UserSphere extends THREE.Object3D {
    constructor(parent, level, userID) {
        super();
        this.userSphere = null;
        this.userID = userID;
        //this.circle = null;
        this.color = 0xFFFFFF; // default color
        this.level = level || 1; // set the level parameter or use the default value of 1
        this.initUserSphere();
        this.addCircle();
        parent.add(this.userSphere);
        // this.userSphere.add(this.circle);
        attachLabelToObjectsAdv(this.getSphere(), this.level, 0, 1, -0.25);
        this.layers.enable(1);
        this.userSphere.name = 'userSphere';
    }

    initUserSphere() {
        // Jiggle Sphere
        const userGeometry = new THREE.SphereGeometry(0.2, 3, 3);
        const userMaterial = new THREE.MeshBasicMaterial({ color: this.color });
        this.userSphere = new THREE.Mesh(userGeometry, userMaterial);
        this.userSphere.position.set(0, 0.7, 0); // Slightly above the cube's center
        this.userSphere.layers.enable(1); // Add userSphere to specified level

        const tempID = wsc.getMyID();
        //console.log('uid: ' + tempID);
        // this.userSphere.userData.userID = tempID;

        this.add(this.userSphere);

        return this.userSphere;
    }
    
    addCircle() {
        console.log('level: ' + this.level);
    
        // If a circle already exists, remove it first
    
        // Create new circle geometry and material
        const circleGeometry = new THREE.CircleGeometry(.15, this.level + 2);
        const circleMaterial = new THREE.MeshBasicMaterial({ color: 'white', wireframe: true });
    
        // Create new circle mesh
        this.circle = new THREE.Mesh(circleGeometry, circleMaterial);
        this.circle.position.set(0, .5, 0);
        this.circle.layers.enable(0); // Add circle to specified level
    
        // Rotate the circle 90 degrees on the x-axis
        this.circle.rotation.x = Math.PI / -2;
    
        // Add the new circle to the parent
        this.userSphere.add(this.circle);
    
        return this.circle;
    }
    
    removeCircle() {
        console.log(this.userSphere.children);
        
        if (this.circle) {
            this.userSphere.remove(this.circle);
        }
    }



    getLevel() {
        return this.level;
    }

    getSphere() {
        return this.userSphere;
    }   

    setLevel(setto) {
        this.level = setto;
        console.log(this.level);
        attachLabelToObjectsAdv(this.getSphere(), this.getLevel(), 0, 1, -0.25);
        this.removeCircle();    
        this.addCircle();
        return this.level;
    }
    
}


    
