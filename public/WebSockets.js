import { loadedGLTF } from './Loaders';
import { addLog } from './log.js';
import { userID, scene } from './scene3.js';
import { spawnBeaconLightAtPosition, spawnPingAtPosition, spawnEntrancePingAtPosition } from './Spawners.js';
import { createLabelSprite } from './Sprite.js';
import { addUserToList, removeUserFromList } from './Userlist.js';


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
        loadedGLTF.scene.traverse((object) => {
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
        return;
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

        const userPos = new THREE.Vector3(message.position.x, message.position.y, message.position.z);
        
        if (!users[message.userID]) {
            // New user, create a sphere for them
            const geometry = new THREE.SphereGeometry(0.1, 32, 32);
            const trans = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0 });
            const material = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
            const sphere = new THREE.Mesh(geometry, trans);
            const geometrysphere = new THREE.SphereGeometry(0.1, 32, 32);
            const sphere2 = new THREE.Mesh(geometrysphere, material);

            sphere.position.copy(userPos);
            scene.add(sphere);
            sphere.add(sphere2);
            
            // add label sprite
            // const labelSprite = createLabelSprite(incomingUserID);
            // labelSprite.position.y += 0.5;  // Adjust based on your needs
            // sphere.add(labelSprite);

            users[message.userID] = {
                sphere: sphere,
                targetPosition: userPos
            };
        } else {
            // Existing user, update their position
            users[message.userID].targetPosition.copy(userPos);
        }
    } else if (message.type === 'initUsers'){ 
        console.log(message.users);

        // Loop through the received users and create a sphere for each one
        
        for (let incomingUserID in message.users) {
            addUserToList(incomingUserID, incomingUserID === myUserID);
            let userPos = new THREE.Vector3(
                message.users[incomingUserID].position.x,
                message.users[incomingUserID].position.y,
                message.users[incomingUserID].position.z
            )
            ;
            
            // Check if we've already created a sphere for this user
            if (!users[incomingUserID]) {
                
                // New user, create a sphere for them
                const geometry = new THREE.SphereGeometry(0.1, 32, 32);
                const trans = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0 });
                const material = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
                const sphere = new THREE.Mesh(geometry, trans);
                const geometrysphere = new THREE.SphereGeometry(0.1, 32, 32);
                const sphere2 = new THREE.Mesh(geometrysphere, material);
    
                sphere.position.copy(userPos);
                scene.add(sphere);
                sphere.add(sphere2);
    
                const labelSprite = createLabelSprite(incomingUserID);
                labelSprite.position.set(0, 0.5, 0); // Adjust based on your needs
                sphere.add(labelSprite);
                console.log( labelSprite.parent);

                users[incomingUserID] = {
                    sphere: sphere,
                    targetPosition: userPos
                };
            }
            
        };
    } else if (message.type === 'userDisconnected') {
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
        
        // Traverse the scene to find the object with the matching name to fetch its URL
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
        