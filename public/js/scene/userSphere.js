import { wsc, scene } from "../../scene.js";
import { attachLabelToObjectsAdv } from "../Sprite.js";


export class UserSphere extends THREE.Object3D {
    constructor(position, level, userID, parent = scene) {
        super();
        this.level = level || 1; // set the level parameter or use the default value of 1
        this.userID = userID;
        this.userSphere = null;
        this.targetPosition = THREE.Vector3();
        //this.circle = null;
        this.color = 0xFFFFFF; // default color
        this.initUserSphere(position);
        this.addCircle();
        // this.userSphere.add(this.circle);
        this.sprite = attachLabelToObjectsAdv(this.getSphere(), this.level, 0, 1, -0.25);
        this.layers.enable(1);
        this.userSphere.name = 'userSphere';
        parent.add(this.userSphere);
    }

    initUserSphere(position) {
        // Jiggle Sphere
        const userGeometry = new THREE.SphereGeometry(0.2, 3, 3);
        const userMaterial = new THREE.MeshBasicMaterial({ color: this.color });
        this.userSphere = new THREE.Mesh(userGeometry, userMaterial);
        this.userSphere.position.set(0, 0.7, 0); // Slightly above the cube's center
        this.userSphere.layers.enable(1); // Add userSphere to specified level
        this.userSphere.position.copy(position);
        const tempID = wsc.getMyID();
        //console.log('uid: ' + tempID);
        // this.userSphere.userData.userID = tempID;

        this.add(this.userSphere);

        return this.userSphere;
    }
    
    addCircle() {
        // console.log('level: ' + this.level);
    
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
        // console.log(this.userSphere.children);
        
        if (this.circle) {
            this.userSphere.remove(this.circle);
        }
    }

    updateSprite(text){
        console.log('updating sprite text to: ' + text);
        updateLabelSpriteText(this.sprite, text)

    };

    getLevel() {
        return this.level;
    }

    getSphere() {
        return this.userSphere;
    }   

    setUserID(userID){
        this.userID = userID;

    }

    setLevel(setto) {
        this.level = setto;
        // console.log(this.level);
        attachLabelToObjectsAdv(this.getSphere(), this.getLevel(), 0, 1, -0.25);
        this.removeCircle();    
        this.addCircle();
        return this.level;
    }
    
}


    
