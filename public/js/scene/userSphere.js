//userSphere.js

import { wsc, scene } from "../../scene.js";
import { attachLabelToObjectsAdv } from "../Sprite.js";


export class UserSphere extends THREE.Object3D {

    static LOCALPLAYER = null;

    constructor(user, parent = scene) {
        super();

        this.createDefaultUser = () => {
            return {
                userID: '1010101010110', // Generate a unique ID for the user
                position: new THREE.Vector3(), // Default to the origin
                name: 'defaultName', // Default name
                count: 0, // Default online time
                level: 1, // Default level
                favourites: [], // Default empty array for favourites
                mana: 1, // Default mana
            };
        };
        this.user = user ||  this.createDefaultUser();
        console.log('creating a user for:',this.user);


        this.isLocalPlayer = false;

        this.level = this.user.level || 1; // set the level parameter or use the default value of 1
        this.mana = this.user.mana || 0;
        this.userID = this.user.userID;
        this.userSphere = null;
        this.name = this.user.name;
        this.targetPosition = new THREE.Vector3();
        if (user && user.position) {
            this.targetPosition.copy(user.position);
        }


        this.afk = false;

        //this.circle = null;
        this.color = 0xFFFFFF; // default color
        this.initUserSphere(this.user.position);
        this.addCircle();
        // this.userSphere.add(this.circle);
        this.sprite = attachLabelToObjectsAdv(this.getSphere(), this.name, 0, 1, -0.25);
        this.layers.enable(1);
        this.userSphere.name = 'userSphere';
        
        parent.add(this.userSphere);
        // this.add(this.userSphere);
    }


    updateUserData(newUser) {
        this.user = newUser || this.createDefaultUser();
        this.userID = this.user.userID;
        console.log(this.userID);
        // this.position = this.user.position;
        this.name = this.user.name;
        this.count = this.user.count;
        this.level = this.user.level;
        this.favourites = this.user.favourites;
        this.mana = this.user.mana;
        
        // ... update other properties as needed
    
        // Update position if it's different
        if (!this.targetPosition.equals(newUser.position)) {
            this.targetPosition.copy(newUser.position);
            // If you want to move the sphere to the new position, you could
            // directly set the new position or use a method to animate the transition.
            this.userSphere.position.copy(this.targetPosition);
        }
    
        // Update the level display
        this.setLevel(this.level);
    
        // Similarly, update any other visual elements or properties that depend on user data
        // ...
    }


    setTargetPosition(position) {
        console.log(`setting target position in userSphere ${this.userID} to: `, position);
        this.targetPosition.copy(position);
    }
    
    updatePosition(position) { 
        console.log(`updating position in userSphere ${this.userID} to: `, position);
        this.userSphere.position.set(position);
        
    };




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
        attachLabelToObjectsAdv(this.getSphere(), this.name, 0, 1, -0.25);
        this.removeCircle();    
        this.addCircle();
        return this.level;
    }
    
}


    
