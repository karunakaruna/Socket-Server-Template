import { wsc } from "../../scene.js";

export class UserSphere extends THREE.Object3D {
    constructor(parent, level) {
        super();
        this.userSphere = null;
        this.circle = null;
        this.color = 0xFFFFFF; // default color
        this.level = level || 1; // set the level parameter or use the default value of 1
        this.initUserSphere();
        this.addCircle();
        parent.add(this.userSphere);
        parent.add(this.circle);
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
        const circleGeometry = new THREE.CircleGeometry(.15, this.level);
    
        const circleMaterial = new THREE.MeshBasicMaterial({ color: 'white', wireframe: true });
        this.circle = new THREE.Mesh(circleGeometry, circleMaterial);
        this.circle.position.set(0, .5, 0);
        this.circle.layers.enable(0); // Add circle to specified level

        // Rotate the circle 90 degrees on the x-axis
        this.circle.rotation.x = Math.PI / -2;

        this.add(this.circle);
        return this.circle;
    }
}


    
