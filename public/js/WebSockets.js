//Websockets.js


import { addLog } from './log.js';
import { camera, userID, scene, loadedGLTF, userSphere } from '../scene3.js';
import { spawnBeaconLightAtPosition, spawnPingAtPosition, spawnEntrancePingAtPosition} from './Spawners.js';
import { attachLabelToObjects, createLabelSprite } from './Sprite.js';
import { addUserToList, removeUserFromList } from './Userlist.js';
import { boundingBox, getLoadedGLTF  } from './Loaders';

const users = {}; 
let myUserID = null;
const ws = new WebSocket('wss://metacarta-b8f465580dc6.herokuapp.com/'); 
ws.onmessage = (event) => {
    if (event.data === 'ping') {
        addLog('Received heartbeat!');
        console.log('this ping!');
        ws.send('pong'); // reply to keep connection alive
        return;
    }

    const message = JSON.parse(event.data);

    // Get object by its name or URL
    const getObjectByProperty = (prop, value) => {
        let foundObject = null;
        const GLTF = getLoadedGLTF();
        GLTF.scene.traverse((object) => {
            if (object.userData && object.userData[prop] === value) {
                foundObject = object;
            }
        });
        return foundObject;
    };
    if (message.type === 'assignUserID') {
        myUserID = message.userID;  // Set the client's own user ID
        document.getElementById('username').textContent = myUserID;
        console.log('Assigned UserID:', myUserID);
        addUserToList(myUserID, true);
        userSphere.userData.userID = myUserID;
        return myUserID;
    } else if (message.type === 'color') {
        cube.material.color.set(message.value);
        addLog(`Color updated to ${message.value}`);
    } else if (message.type === 'ping') {
        // Existing ping handler
    } else if (message.type === 'loc' && message.position) {
        const receivedPosition = new THREE.Vector3(
            message.position.x,
            message.position.y,
            message.position.z
        );
        spawnPingAtPosition(receivedPosition);
        
        if (!users[message.userID]) {
            // New user, create a sphere for them
            console.log(message.userID);
            users[message.userID] = createSphereAtPosition(receivedPosition, message.userID);
        } else {
            // Existing user, update their position
            users[message.userID].targetPosition.copy(receivedPosition);
        }
    }
    else if (message.type === 'initUsers'){ 
        for (let incomingUserID in message.users) {
            addUserToList(incomingUserID, incomingUserID === myUserID);
    
            if (message.users[incomingUserID].position) {
                let userPos = new THREE.Vector3(
                    message.users[incomingUserID].position.x,
                    message.users[incomingUserID].position.y,
                    message.users[incomingUserID].position.z
                );
        
                // Check if we've already created a sphere for this user
                if (!users[incomingUserID]) {
                    //users[incomingUserID] = createSphereAtPosition(userPos, incomingUserID);
                }
            } else {
                console.warn(`User ${incomingUserID} has no position data.`);
            }
        }
    }
     else if (message.type === 'userDisconnected') {
        // Remove the sphere of the disconnected user
        removeUserFromList(message.userID);
        let userObject = users[message.userID];
        //console.log(message.userID);
        if (userObject) {
            scene.remove(userObject.sphere);
            delete users[message.userID];
        }
    } else if (message.type === 'userCount') {
        document.getElementById('userCount').textContent = message.value;
        //console.log(users);
        addLog(`Users online: ${message.value}`);
    } else if (message.type === 'beacon') {
        console.log('beacon received');
        let object = getObjectByProperty('URL', message.url);
        if (object) {
            spawnBeaconLightAtPosition(object.position);
            addLog(`Beacon activated at <a href="${object.userData.URL}" target="_blank">${object.userData.Name}</a>`);
        }
    } else if (message.type === 'entrance') {
        console.log('received entrance ping');
        
        let entranceURL = "";
        let foundObjectName = "";
        const tempGLTF = getLoadedGLTF();
        // Traverse the scene to find the object with the matching name to fetch its URL
        console.log("Accessing GLTF in WebSockets.js:", tempGLTF);

        loadedGLTF.scene.traverse((object) => {
            if (object.userData && object.userData.Name === message.objectName) {
                entranceURL = object.userData.URL;
                foundObjectName = object.userData.Name;
            }
        });
    
        if (entranceURL) {
            addLog(`User entered <a href="${entranceURL}" target="_blank">${foundObjectName}</a>`);
        } else {
            addLog(`User entered ${message.objectName}`);
        }
        
        const receivedPosition = new THREE.Vector3(
            message.position.x,
            message.position.y,
            message.position.z
        );
        spawnEntrancePingAtPosition(receivedPosition);
    }
    //console.log( 'ws uid:' + myUserID);
    //myUserID = primaryUserID;
};

export { ws, users };

ws.onerror = (error) => {
    console.error("WebSocket Error: ", error);
};

ws.onclose = (event) => {
    if (event.wasClean) {
        console.log(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
    } else {
        console.error('Connection died');
    }
    // You could try to reconnect here after some delay
    setTimeout(() => {
        initializeWebSocketConnection();
    }, 5000);  // Try to reconnect every 5 seconds
};
        

function createSphereAtPosition(position, userID) {
    const geometry = new THREE.SphereGeometry(0.1, 32, 32);
    const trans = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0 });
    const material = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
    const outerSphere = new THREE.Mesh(geometry, trans);
    const innerSphere = new THREE.Mesh(geometry, material);
    
    outerSphere.position.copy(position);
    scene.add(outerSphere);
    outerSphere.add(innerSphere);
    outerSphere.userData.userID = userID;
    const sprite = attachLabelToObjects(outerSphere, userID);

    return {
        sphere: outerSphere,
        sprite: sprite,
        targetPosition: position
    };
}

export function getMyID(){
    return myUserID;

}

export { myUserID};