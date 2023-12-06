//Websockets.js


import { addLog } from './util/log.js';
import { scene, cube, loadedGLTF,  beaconLightModel } from '../scene.js';
import { UserSphere } from './scene/userSphere.js';
import { spawnBeaconLightAtPosition, spawnPingAtPosition, spawnEntrancePingAtPosition, updateUserObjects} from './Spawners.js';
import { attachLabelToObjects, createLabelSprite } from './Sprite.js';
import { addUserToList, removeUserFromList } from './util/Userlist.js';
import { boundingBox, getLoadedGLTF  } from './Loaders';
import { displayOverlayText } from './util/ShowModal.js';
import { fetchUsers } from '../submit-module.js';
import { parentCamera } from './Camera.js';

// import {userSphere} from './userSphere';

export class WebSocketConnection {
    constructor() {

        //User sphere arrays
        this.users = {};

        // The user's ID
        this.myUserID = null;

        // Model stuff
        this.loadedGLTF = null;
        this.scene = scene;
        this.beaconLightModel = null;
        
        //The user's websocket connection
        this.ws = null;
    }


    
    initializeWebSocketConnection() {
        const wsURL = 'wss://metacarta-b8f465580dc6.herokuapp.com/';
        this.ws = new WebSocket(wsURL);
        this.ws.withCredentials = true; // Set withCredentials to true
        this.ws.onopen = () => {
            console.log('WebSocket connection established');
            console.log('Cookies sent: ' + this.ws.withCredentials); // Check if cookies are sent
            this.wsSend({ type: 'init', userID: this.myUserID });
        };





//MSGS
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);



    //🥇 Init
        if (message.type === 'initUsers') {
        console.log('init user data:', message.user);

        for (let incomingUserID in message.users) {
            console.log('incomingUserID:' + incomingUserID);

            // If the User doesn't exist:
                if (!this.users[incomingUserID] ) 
                    {
                    console.log('incomingUserID:' + incomingUserID);

                        //Make a vector3 from the incoming user's position
                            let userPos = new THREE.Vector3(
                                message.users[incomingUserID].position.x,
                                message.users[incomingUserID].position.y,
                                message.users[incomingUserID].position.z
                            );

                        //Initialize the user object
                            const user = {
                                userID: incomingUserID,
                                position: userPos,
                                name: message.users[incomingUserID].name,
                                count: message.users[incomingUserID].online_time,
                                level: message.users[incomingUserID].level,
                                favourites: message.users[incomingUserID].favourites,
                                mana: message.users[incomingUserID].mana,
                            };

                    //Add the user to the user list

                            console.log('adding user ', incomingUserID);
                            this.users[incomingUserID] = this.createSphereAtPosition(user);
                            addUserToList(incomingUserID);


                            
            //User exists but there is not position data?
                } else {
                        console.warn('User exists in users already')
                                    }   
        }
    }

        //Init UserID 🆔
            else if (message.type === 'assignUserID') {
                console.log('assignUserID received');
                this.myUserID = message.userID;
                const user = {
                    userID: message.userID,
                    position: message.user.position,
                    name: message.user.name,
                    count: message.user.online_time,
                    level: message.user.level,
                    favourites: message.user.favourites,
                    mana: message.user.mana,
                };
                console.log('users:', this.users);
                this.users[this.myUserID] = this.createSphereAtPosition(user);
                console.log('adding user camera');
                this.users[this.myUserID].isLocalPlayer = true;
                this.users[this.myUserID].getSphere().add(cube);
                console.log('is it the local player?', this.users[this.myUserID].isLocalPlayer);
                UserSphere.LOCALPLAYER = this.users[this.myUserID];
                console.log('local player:', UserSphere.LOCALPLAYER);   
                
                console.log(`Assigned userID: ${this.myUserID}`);
                document.getElementById('username').textContent = this.myUserID;
                document.getElementById('onlineCount').textContent = message.count;

                addUserToList(this.myUserID, true);
                console.log('received user data:', message.user)

                const me = this.users[this.myUserID];
                console.log('me:', me); 
                me

                // player.updateUserData(message.user);
                // player.userData.userID = this.myUserID;
            


    //User Disconnects
            } else if (message.type === 'userDisconnected') {
                removeUserFromList(message.userID); // Remove from list
                let userObject = this.users[message.userID]; //Get the user

                delete this.users[message.userID]; // Remove from the users's object

                // if a sphere exists remove the sphere and its pointer 
                if (userObject) {
                    this.scene.remove(userObject.getSphere());
                    this.scene.remove(userObject);
                    delete this.users[message.userID];          
                      }


    //🎯 Loc 
            } else if (message.type === 'loc' && message.position) {
            // Handle location message
                const receivedPosition = new THREE.Vector3(
                    message.position.x,
                    message.position.y,
                    message.position.z
                );
            //Ping
                spawnPingAtPosition(receivedPosition);
                const sphere = this.users[message.userID];
                this.users[message.userID].setTargetPosition(receivedPosition);
                sphere.setLevel(message.level);
            }

    //📶 Ping
            else if (message.type === 'ping') {
                addLog('Received heartbeat!');
                this.ws.send('pong'); // reply to keep connection alive
                return;
            }



    //🔼💹 Update This User's level 
            else if (message.type === 'userUpdate') {
                //If player
                if (message.userID === this.myUserID) {
                    // player.setLevel(message.level);
                //If not player
                } else {
                    const sphere = this.users[message.userID];
                    if (sphere) 
                        {
                        sphere.setLevel(message.level);
                        }
                }
            }
    //Update UserID - Received from /account - 

    //Updates the localplayers ID and updates the userlist
            else if (message.type === 'updateUserID') {
                console.log('updateUserID received');
                const oldposition = this.users[this.myUserID].targetPosition;
                const oldID = this.myUserID;
                const newID = message.publicUserID;
                const user = message.user;

                console.log('Updating UserID from ' + oldID + ' to ' + newID)
            
                // Update the myUserID to the new ID
                this.myUserID = newID;

                
                // oldUser.updateUserData(user);
                        
  
                console.log('oldPosition:', oldposition);

                // Transfer old user data to the new user ID
                if (this.users[oldID]) {
                    this.users[newID] = this.createSphereAtPosition(user);
                    this.users[newID].updatePosition(oldposition);
                    this.users[newID].setTargetPosition(oldposition);

                    this.users[newID].getSphere().add(cube);
                    // Remove the old user data
                    this.scene.remove(this.users[oldID].getSphere());
                    this.scene.remove(this.users[oldID]);
                    delete this.users[oldID];
                   

                } else {
                    console.warn(`Old user ID ${oldID} not found. Cannot update to ${newID}.`);
                }
            
                


        



            // Update UI elements
                document.getElementById('username').textContent = newID;
                document.getElementById('onlineCount').textContent = message.onlineTime;
                displayOverlayText(message.overlay, 2000, 24);
                // player.updateUserData(user);
            


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

    //Notify of other user
            else if (message.type === 'notifyUserUpdate') {
                console.log('notifyUserUpdate received');

                console.log('message, ', message);

                const oldUserID = message.oldUserID;
                const newUserID = message.updatedUserID;
                const updatedUserData = message.userData;

                const temppos = this.users[oldUserID].targetPosition;
                    
        

                console.log('temppos:', temppos)

                // Debugging logs
                console.log('wsc.users:', this.users);
                console.log('oldUserID:', oldUserID);
                console.log('newUserID:', newUserID);

                // Remove the old user data
                if (this.users[oldUserID]) {

                    this.users[newUserID] = this.createSphereAtPosition(updatedUserData);
                    this.users[newUserID].updatePosition(temppos);
                    this.users[newUserID].setTargetPosition(temppos);

                    this.scene.remove(this.users[oldUserID].getSphere());
                    this.scene.remove(this.users[oldUserID]);
                    delete this.users[oldUserID];
                
                    removeUserFromList(oldUserID); // Assuming you have a function to remove the user from the list
                    
                }

                // Update or add the new user data
                addUserToList(newUserID); // Add or update the user in the user list


    //🌷 Objects
            } else if (message.type === 'objects') {
                // Handle userConnected message
                console.log(message);
                console.log('objects');
                updateUserObjects(scene, message.value);
            
    //Overlay Message   
            } else if (message.type === 'overlay') {
                console.log('overlay');
                displayOverlayText(message.value , 2000, 24);






// 🔄 Counts      
        // 👥 User Count Updated
                } else if (message.type === 'userCount') {
                    document.getElementById('userCount').textContent = message.value;
                    //console.log(users);
                    addLog(`Users online: ${message.value}`);
                }

        // ⌚ Online Time Count Update
                    else if (message.type === 'count') {
                        // console.log('count received');
                        document.getElementById('onlineCount').textContent = message.value;
                    }


// ⚡ Activities 
        // 🚨 Beacon Received
                else if (message.type === 'beacon') {
                    console.log('beacon received');
                    let object = this.getObjectByProperty('URL', message.url);
                    if (object) {
                        spawnBeaconLightAtPosition(object.position, this.beaconLightModel);
                        addLog(`Beacon activated at <a href="${object.userData.URL}" target="_blank">${object.userData.Name}</a>`);
                    }
                }
        // 🏛 Entrance to Location
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

            };


// ‼ Error Handling
            this.ws.onerror = (error) => {
                console.error("WebSocket Error: ", error);
            };
    // 🚪 Connection Closed
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
    


// 🧮 Methods / Functions
        wsSend(message) {
            this.ws.send(JSON.stringify(message));
        }

        getUsers() {
            return this.users;
        }

        removeUser(userID) {
            const index = this.users.findIndex(user => user.userID === userID);
            if (index !== -1) {
                this.users.splice(index, 1);
                removeUserFromList(userID); // Assuming you have a function to remove the user from the list
            }
        }


        updateUserList() {
            // Remove all users from the list
            this.users.forEach(user => {
                removeUserFromList(user.userID);
            });

            // Add all users back to the list
            this.users.forEach(user => {
                addUserToList(user.userID);
            });
         }

        addUser(userID) {
            const userExists = this.users.some(user => user.userID === userID);
            if (!userExists) {
                this.users.push({ userID }); // Assuming you want to add the user to the list with the userID property
                addUserToList(userID); // Assuming you have a function to add the user to the list
            }
        }

        updateUserID(oldUserID, newUserID) {
            if (this.userSpheres[oldUserID]) {
                const userSphereData = this.userSpheres[oldUserID];

                // Update the userID within the userSphere's data if needed
                // This assumes you have a method in UserSphere to handle the userID change
                userSphereData.sphere.setUserID(newUserID);

                // Reassign the userSphere data to the new userID
                this.userSpheres[newUserID] = userSphereData;
                delete this.userSpheres[oldUserID]; // Remove the old entry
            }
        }


        createSphereAtPosition(user) {
            const userSphere = new UserSphere(user);
            userSphere.layers.enable(1); // Add to the raycaster layer
            this.scene.add(userSphere);
            console.log('sphere created');
            console.log(this.users);
            return userSphere;

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
