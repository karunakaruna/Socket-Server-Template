import { wsc } from "../../scene.js";


export function initUserSphere(){


    
//  Jiggle Sphere
const userGeometry = new THREE.SphereGeometry(0.2, 3, 3); 
const userMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF});  // WHITE
const userSphere = new THREE.Mesh(userGeometry, userMaterial);
userSphere.position.set(0, 0.7, 0);  // Slightly above the cube's center
const tempID = wsc.getMyID();
//console.log('uid: ' + tempID);
// userSphere.userData.userID = tempID;
return userSphere;
};
