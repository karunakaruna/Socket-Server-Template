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
                const receivedPosition = new THREE.Vector3(
                    message.position.x,
                    message.position.y,
                    message.position.z
                );
                console.log(message.userID);
                console.log('Message Level:' + message.level)
                spawnPingAtPosition(receivedPosition);

                if (!this.users[message.userID]) {
                    // New user, create a sphere for them
                    console.log(message.userID);
                    this.users[message.userID] = this.createSphereAtPosition(receivedPosition, message.userID, message.level);
                } else {
                    // Existing user, update their position and level
                    this.users[message.userID].targetPosition.copy(receivedPosition);

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
                for (let incomingUserID in message.users) {
                    addUserToList(incomingUserID, incomingUserID === this.myUserID);

                    if (message.users[incomingUserID].position) {
                        let userPos = new THREE.Vector3(
                            message.users[incomingUserID].position.x,
                            message.users[incomingUserID].position.y,
                            message.users[incomingUserID].position.z
                        );

                        // Check if we've already created a sphere for this user
                        if (!this.users[incomingUserID]) {
                            //this.users[incomingUserID] = this.createSphereAtPosition(userPos, incomingUserID);
                        }
                    } else {
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
                console.log('updateUserID received')
                console.log(message);
                const publicUserID = message.publicUserID;
                const onlineTime = message.onlineTime;

                const oldID = this.myUserID;
                console.log('oldID:' + oldID);
                this.myUserID = publicUserID;
                console.log('newID:' + this.myUserID);
                displayOverlayText(message.overlay , 2000, 24);

                removeUserFromList(oldID);
                addUserToList(publicUserID, publicUserID === this.myUserID);
                prioritizeGreenUser();
                document.getElementById('username').textContent = publicUserID;
                document.getElementById('onlineCount').textContent = onlineTime;
                
                this.wsSend({
                     type: 'remove',
                     value: oldID,
                     new: publicUserID
                     });
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
                removeUserFromList(message.userID);
                let userObject = this.users[message.userID];
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

    createSphereAtPositionbackup(position, userID) {
        const geometry = new THREE.SphereGeometry(0.1, 32, 32);
        const trans = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0 });
        const material = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
        const outerSphere = new THREE.Mesh(geometry, trans);
        const innerSphere = new THREE.Mesh(geometry, material);
        outerSphere.layers.enable(1); // Add to the raycaster layer
        outerSphere.position.copy(position);
        this.scene.add(outerSphere);
        outerSphere.add(innerSphere);
        outerSphere.userData.userID = userID;
        const sprite = attachLabelToObjects(outerSphere, userID);
        console.log('sphere created');
        return {
            sphere: outerSphere,
            sprite: sprite,
            targetPosition: position
        };
    };

    createSphereAtPosition2(position, userID) {
        // const geometry = new THREE.SphereGeometry(0.1, 32, 32);
        // const trans = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0 });
        // const outerSphere = new THREE.Mesh(geometry, trans);


        const outerSphere = new UserSphere(scene, 1);
        // this.scene.add(outerSphere);
        outerSphere.layers.enable(1); // Add to the raycaster layer
        outerSphere.position.copy(position);
        outerSphere.userData.userID = userID;
        const sprite = attachLabelToObjects(outerSphere, userID);
        console.log('sphere created');
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
