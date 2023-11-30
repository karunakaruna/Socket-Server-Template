//Websockets.js


import { addLog } from './util/log.js';
import { scene, loadedGLTF,  beaconLightModel, userSphere } from '../scene.js';
import { UserSphere } from './scene/userSphere.js';
import { spawnBeaconLightAtPosition, spawnPingAtPosition, spawnEntrancePingAtPosition, updateUserObjects} from './Spawners.js';
import { attachLabelToObjects, createLabelSprite } from './Sprite.js';
import { addUserToList, removeUserFromList } from './util/Userlist.js';
import { boundingBox, getLoadedGLTF  } from './Loaders';
import { displayOverlayText } from './util/ShowModal.js';
import { fetchUsers } from '../submit-module.js';

// import {userSphere} from './userSphere';

export class WebSocketConnection {
    constructor() {
        this.users = {};
        this.userSpheres = [];
        this.myUserID = null;
        this.loadedGLTF = null;
        this.scene = scene;
        this.beaconLightModel = null;
        this.ws = null;
    }


    
    initializeWebSocketConnection() {
        // const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        // const wsURL = `${wsProtocol}//${location.host}/ws`;
        const wsURL = 'wss://metacarta-b8f465580dc6.herokuapp.com/';
        this.ws = new WebSocket(wsURL);

        this.ws.withCredentials = true; // Set withCredentials to true

        this.ws.onopen = () => {
            console.log('WebSocket connection established');
            console.log('Cookies sent: ' + this.ws.withCredentials); // Check if cookies are sent
            this.wsSend({ type: 'init', userID: this.myUserID });
        };
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'loc' && message.position) {
                // Handle location message
                const receivedPosition = new THREE.Vector3(
                    message.position.x,
                    message.position.y,
                    message.position.z
                );
                //Who's the location from?
                console.log(message.userID);
                console.log('Message Level:' + message.level)
                spawnPingAtPosition(receivedPosition);

                //Does the user already exist?
                if (!this.users[message.userID]) {
                    // New user, create a sphere for them
                    console.log('checking the user list for the userID:'+ message.userID);
                    console.log('user does not exist');
                    // this.users[message.userID] = this.createSphereAtPosition(receivedPosition, message.userID, message.level);
                } else {
                    console.log('user exists');
                    // Existing user, update their position and level
                    this.userSpheres[message.userID].targetPosition.copy(receivedPosition);

                    const sphere = this.userSpheres.find(user => user.userID === message.userID);
                    if (sphere) {
                        sphere.setLevel(message.level);
                    }
                }
            }

            else if (message.type === 'ping') {
                addLog('Received heartbeat!');
                console.log('this ping!');
                this.ws.send('pong'); // reply to keep connection alive
                return;
            }

            else if (message.type === 'initUsers') {
                console.log('initUsers');
                fetchUsers();

                //initUsers sends a bunch of useful information:
                // JSON.stringify({
                //     type: "initUsers",
                //     userID: userID,
                //     user: users[userID],
                //     users: users,
                // }),

                //iterate through the user list
                for (let incomingUserID in message.users) {

                        // Check if the user already exists in this.users array
                        if (!this.users[incomingUserID]) {
                                //Identify the users - this is all users including the current user
                                console.log('incomingUserID:' + incomingUserID);

                                //Make a vector3 from the incoming user's position
                                let userPos = new THREE.Vector3(
                                    message.users[incomingUserID].position.x,
                                    message.users[incomingUserID].position.y,
                                    message.users[incomingUserID].position.z
                                );

                                //Add the user to the users object
                                this.users[incomingUserID] = {
                                    userID: incomingUserID,
                                    position: message.users[incomingUserID].position,
                                    name: message.users[incomingUserID].name,
                                    count: message.users[incomingUserID].online_time,
                                    level: message.users[incomingUserID].level,
                                    favourites: message.users[incomingUserID].favourites,
                                    mana: message.users[incomingUserID].mana,
                                };


                                if (incomingUserID !== this.myUserID && !this.userSpheres[incomingUserID]) {
                                    addUserToList(incomingUserID, false);
                                    this.userSpheres[incomingUserID] = this.createSphereAtPosition(userPos, incomingUserID, message.users[incomingUserID].level);
                                }
                            }
                        else {
                            console.warn(`User ${incomingUserID} has no position data.`);
                            }

                    
                }
            } else if (message.type === 'userUpdate') {
                console.log('userUpdate');
                if (message.userID === this.myUserID) {
                    userSphere.setLevel(message.level);
                    
                } else {
                    const sphere = this.userSpheres.find(user => user.userID === message.userID);

                    if (sphere) {
                        sphere.setLevel(message.level);
                        console.log('sphere found');
                    }
                }
                // for users in user, use the setLevel method to update the user's level
                // for users in user, use the setLevel method to update the user's level





            } else if (message.type === 'assignUserID') {
                this.myUserID = message.userID;
                console.log(`Assigned userID: ${this.myUserID}`);
                document.getElementById('username').textContent = this.myUserID;
                console.log('Assigned UserID:',this. myUserID);
                document.getElementById('onlineCount').textContent = message.count;

                addUserToList(this.myUserID, true);
                userSphere.userData.userID = this.myUserID;
            }

            else if (message.type === 'updateUserID') {
                console.log('updateUserID received');
                console.log(message);
                const oldID = this.myUserID;
                const newID = message.publicUserID;
                const user = message.user;
            
                // Update the myUserID to the new ID
                this.myUserID = newID;
            
                // Transfer old user data to the new user ID
                if (this.users[oldID]) {
                    this.users[newID] = {
                        ...this.users[oldID], // Copy all existing user data
                        ...user, // Overwrite with any new data sent with the message
                        userID: newID // Ensure the userID is updated
                    };
                    
                    // Remove the old user data
                    delete this.users[oldID];
                } else {
                    console.warn(`Old user ID ${oldID} not found. Cannot update to ${newID}.`);
                }
            
                // Update or recreate the sphere associated with the user
                if (this.userSpheres[oldID]) {
                    // Remove the old sphere from the scene
                    this.scene.remove(this.userSpheres[oldID].sphere);
            
                    // Create a new sphere for the new userID
                    let newPosition = new THREE.Vector3(
                        user.position.x,
                        user.position.y,
                        user.position.z
                    );
                    this.userSpheres[newID] = this.createSphereAtPosition(newPosition, newID, user.level);
            
                    // Remove the old sphere reference
                    delete this.userSpheres[oldID];
                }
            
                // Update UI elements
                document.getElementById('username').textContent = newID;
                document.getElementById('onlineCount').textContent = message.onlineTime;
                displayOverlayText(message.overlay, 2000, 24);
            
                // Update the user list
                removeUserFromList(oldID);
                addUserToList(newID, true);
            
                // Send a message to the server if necessary to confirm the update
                this.wsSend({
                    type: 'confirmUpdateUserID',
                    oldID: oldID,
                    newID: newID
                });
            }

            // ... inside the ws.onmessage handler ...

                else if (message.type === 'notifyUserUpdate') {
                    console.log('notifyUserUpdate received');
                    const oldUserID = message.oldUserID;
                    const newUserID = message.updatedUserID;
                    const updatedUserData = message.userData;

                    // Remove the old user data
                    if (this.users[oldUserID]) {
                        delete this.users[oldUserID];
                        removeUserFromList(oldUserID); // Assuming you have a function to remove the user from the list
                        // Optionally, handle any UI updates or cleanup related to the old user
                    }

                    // Update or add the new user data
                    this.users[newUserID] = updatedUserData;
                    addUserToList(newUserID); // Assuming you have a function to add the user to the list

                    // Update the user's visual representation if it exists
                    if (this.userSpheres[oldUserID]) {
                        delete this.userSpheres[oldUserID];
                        this.userSpheres[newUserID] = this.createSphereAtPosition(updatedUserData.position, newUserID, updatedUserData.level);
                        // If you need to handle the sphere update differently, you can do it here.
                        // For instance, you might want to move the sphere to a new position or update its level.
                    }

                    // Update the user list UI
                    // updateUIWithUserList(this.users); // Assuming this is your method to update the user list on the UI
                }





            else if (message.type === 'objects') {
                // Handle userConnected message
                console.log(message);
                console.log('objects');
                updateUserObjects(scene, message.value);
            
            
            }
            else if (message.type === 'overlay') {
                console.log('overlay');
                displayOverlayText(message.value , 2000, 24);

            }
            else if (message.type === 'userDisconnected') {
                // Remove the sphere of the disconnected user
                console.log('removing user:' + message.userID);
                removeUserFromList(message.userID);
                let userObject = this.userSpheres[message.userID];
                //console.log(message.userID);
                if (userObject) {
                    this.scene.remove(userObject.sphere);
                    delete this.users[message.userID];
                }
            }

            else if (message.type === 'userCount') {
                document.getElementById('userCount').textContent = message.value;
                //console.log(users);
                addLog(`Users online: ${message.value}`);
            }

            else if (message.type === 'beacon') {
                console.log('beacon received');
                let object = this.getObjectByProperty('URL', message.url);
                if (object) {
                    spawnBeaconLightAtPosition(object.position, this.beaconLightModel);
                    addLog(`Beacon activated at <a href="${object.userData.URL}" target="_blank">${object.userData.Name}</a>`);
                }
            }

            else if (message.type === 'count') {
                // console.log('count received');
                document.getElementById('onlineCount').textContent = message.value;
            }


            else if (message.type === 'entrance') {
                console.log('received entrance ping');

                let entranceURL = "";
                let foundObjectName = "";
                const tempGLTF = getLoadedGLTF();
                // Traverse the scene to find the object with the matching name to fetch its URL
                console.log("Accessing GLTF in WebSockets.js:", tempGLTF);

                tempGLTF.scene.traverse((object) => {
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

        this.ws.onerror = (error) => {
            console.error("WebSocket Error: ", error);
        };

        this.ws.onclose = (event) => {
            if (event.wasClean) {
                console.log(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
            } else {
                console.error('Connection died');
            }
            // You could try to reconnect here after some delay
            setTimeout(() => {
                this.initializeWebSocketConnection();
            }, 5000);  // Try to reconnect every 5 seconds
        };
    }

    wsSend(message) {
        this.ws.send(JSON.stringify(message));
    }

    getUsers() {
        return this.users;
    }

    getUsersWithUserSpheres() {
        const usersWithSpheres = this.userSpheres.map(userSphere => userSphere.userID);
        console.log(usersWithSpheres);
        return usersWithSpheres;
    }
    removeUser(userID) {
        const index = this.users.findIndex(user => user.userID === userID);
        if (index !== -1) {
            this.users.splice(index, 1);
            removeUserFromList(userID); // Assuming you have a function to remove the user from the list
        }
    }

    addUser(userID) {
        const userExists = this.users.some(user => user.userID === userID);
        if (!userExists) {
            this.users.push({ userID }); // Assuming you want to add the user to the list with the userID property
            addUserToList(userID); // Assuming you have a function to add the user to the list
        }
    }


    createSphereAtPosition(position, userID, level) {
        const geometry = new THREE.SphereGeometry(0.1, 32, 32);
        const trans = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: false, opacity: 1 });
        const material = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
        const outerSphere = new THREE.Mesh(geometry, trans);
        const innerSphere = new UserSphere(outerSphere, level, userID);
        outerSphere.layers.enable(1); // Add to the raycaster layer
        innerSphere.layers.enable(1); // Add to the raycaster layer
        outerSphere.position.copy(position);
        this.scene.add(outerSphere);
        outerSphere.add(innerSphere);
        outerSphere.userData.userID = userID;
        const sprite = attachLabelToObjects(outerSphere, userID);
        console.log('sphere created');
        this.userSpheres.push(innerSphere);
        return {
            sphere: outerSphere,
            sprite: sprite,
            targetPosition: position
        };
    };




    
    getObjectByProperty = (prop, value) => {
        let foundObject = null;
        const GLTF = getLoadedGLTF();
        GLTF.scene.traverse((object) => {
            if (object.userData && object.userData[prop] === value) {
                foundObject = object;
            }
        });
        return foundObject;};

    getMyID() {
        return this.myUserID;
    }
}

export default WebSocketConnection;
