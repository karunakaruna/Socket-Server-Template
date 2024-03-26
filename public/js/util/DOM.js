import { bookmark } from "./Bookmark.js";
import { wsc } from "../../scene.js";
import { intersectionPoint, screenPoint } from "../Listeners.js";
import { displayOverlayText } from "./ShowModal.js";
import { attachLabelToObjectsAdv } from "../Sprite.js";


export class Modal {
    constructor(name, ejsPath, showInitially = true) {
        this.name = name;
        this.modalId = `${name}-modal`;
        this.createModal();
        this.updateModalContent(ejsPath);
        if (showInitially) {
            this.show();
        }
    }

    createModal() {
        // Create the modal structure
        const modalHTML = `
            <div class="dyn-modal-container" id="${this.modalId}" style="z-index: 1000; display: none;">
                <div class="custom-login-modal">
                    <div class="modal-header">
                        <span class="close-button" id="${this.modalId}-close">&times;</span>
                    </div>
                    <div class="custom-modal-content" id="${this.modalId}-content">
                        <!-- EJS content will be inserted here -->
                    </div>
                </div>
            </div>
        `;

        // Append the modal to the body with id=container
        const mapElement = document.getElementById('container');
        mapElement.appendChild(document.createRange().createContextualFragment(modalHTML));

        // Add close event listener
        document.getElementById(`${this.modalId}-close`).addEventListener('click', () => {
            this.hide();
        });

        // Make the modal draggable
        $(`#${this.modalId}`).draggable();
    }

    updateModalContent(url) {
        // Fetch new modal content based on provided URL using a POST request
        const thisUser = wsc.myUserID; // Ensure thisUser is the correct user ID
        const requestData = { user: thisUser };

        fetch(url, {
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify(requestData),
                        headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.text())
        .then(html => {
            document.getElementById(`${this.modalId}-content`).innerHTML = html;
        })
        .catch(error => console.error('Error:', error));
    }

    updateModalContentWithData(data) {
        // Method to update modal content with fetched data
        // You need to implement how you want to display this data in your modal
        const contentElement = document.getElementById(`${this.modalId}-content`);
        contentElement.innerHTML = data;
    }

    show() {
        const modalElement = document.getElementById(this.modalId);
        modalElement.style.display = 'block';

        // Ensure that the modal can be positioned using 'left' and 'top'
        modalElement.style.position = 'fixed'; // or 'absolute', depending on your layout

        // Use the global screenPoint variable for positioning
        modalElement.style.left = `${screenPoint.x}px`;
        modalElement.style.top = `${screenPoint.y}px`;
    }

    hide() {
        document.getElementById(this.modalId).style.display = 'none';
    }

    createCustomModalContent(intersectionPoint) {
        // // Custom content for the modal
        // const customHTML = `
        //     <div>
        //         <label for="textInput">${objectName}: </label>
        //         <textarea id="textInput" name="textInput" rows="4" cols="50"></textarea>
        //         <button id="${this.modalId}-submit">Submit</button>
        //     </div>
        // `;

        // // Replace or append to the modal content
        // const contentElement = document.getElementById(`${this.modalId}-content`);
        // contentElement.innerHTML = customHTML;

        // Add event listener for the submit button
        document.getElementById(`landmark-submit`).addEventListener('click', () => {
            this.handleSubmit(textInput, intersectionPoint);
        });
    }

    handleSubmit(intersectionPoint) {
        const textInput = document.getElementById("textInput").value;

        // Construct the payload with text input and coordinates
        const payload = {
            type: 'customType', // Specify the type as needed
            text: textInput,
            position: {
                x: intersectionPoint.x,
                y: intersectionPoint.y,
                z: intersectionPoint.z
            }
        };

        // Send the payload via WebSocket
        wsc.wsSend(payload);
        console.log('Payload sent:', payload);

        // Optionally close the modal after sending
        this.hide();
    }


}




export function DOM(){
    const contextMenu = document.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    // const bookmarkButton = document.querySelector("#urlMenu > button:nth-child(2)").addEventListener("click", bookmark);

    const urlModal = document.getElementById('urlModal');
    const confirmButton = document.getElementById('confirmButton');
    const modalText = document.getElementById('modalText');
    const imageElem = document.getElementById('imageDisplay');




// URL Menu
    const examineButton = document.querySelector("#examineButton").addEventListener("click", () => {
        console.log("Examine");
        closeContextMenu();
    });

    const saveFavouriteButton = document.querySelector("#saveFavouriteButton").addEventListener("click", () => {
        console.log("Save Favourite");
        bookmark();
        closeContextMenu();
    });

    const inviteFriendButton = document.querySelector("#inviteFriendButton").addEventListener("click", () => {
        console.log("Invite Friend");
        closeContextMenu();
    });


    


// Player Menu
    const goAFKButton = document.querySelector("#goAFKButton").addEventListener("click", () => {
        console.log("Go AFK");
        closeContextMenu();
    });

    const playerSettingsButton = document.querySelector("#playerSettingsButton").addEventListener("click", () => {
        console.log("Player Settings");
        closeContextMenu();
    });

    const inventoryButton = document.querySelector("#inventoryButton").addEventListener("click", () => {
        console.log("Inventory");
        closeContextMenu();
    });

// User Menu
    const trustButton = document.querySelector("#trustButton").addEventListener("click", () => {
        console.log("Trust");
        closeContextMenu();
    });

    const addFriendButton = document.querySelector("#addFriendButton").addEventListener("click", () => {
        console.log("Add Friend");
        closeContextMenu();
    });

    const viewProfileButton = document.querySelector("#viewProfileButton").addEventListener("click", () => {
        console.log("View Profile");
        closeContextMenu();
    });


    //Default Menu
    const createButton = document.querySelector("#createButton").addEventListener("click", () => {
        console.log("Create");
        
        //closeContextMenu();
    });


    //Default Menu

    let landmarkModal = null;

    //❌Removed to test non modal version
    // const landmarkButton = document.querySelector("#landmarkButton").addEventListener("click", () => {
    //     console.log("LandMARK");
    //     if (!landmarkModal) {
    //         landmarkModal = new Modal('landmark', '/modals/submit');
    //     } else {
    //         landmarkModal.show();
    //     }
    //     closeContextMenu();
    // });



    function sendIntersectionPoint(intersectionPoint, text) {
        const message = {
            type: 'create',
            point: intersectionPoint,
            userID: wsc.myUserID,
            text: text
        };
        wsc.wsSend(message);
    }

    function sendLandmark(intersectionPoint, text) {
        const message = {
            type: 'landmark',
            point: intersectionPoint,
            userID: wsc.myUserID,
            text: text
        };
        wsc.wsSend(message);
    }






    let listuserModal = null;
    const listUserButton = document.querySelector("#listUsersButton").addEventListener("click", () => {
        console.log("Add");
        if (!listuserModal) {
            listuserModal = new Modal('userlist', '/modals/list-users');
        } else {
            listuserModal.show();
        }
        closeContextMenu();
    });





    let userInfoModal = null;







    const levelButton = document.querySelector("#levelUpButton").addEventListener("click", () => {
        console.log("Level");
        // player.setLevel(player.getLevel()+1);
        
        displayOverlayText('Level Up!', 3000, 24);
        closeContextMenu();
    });



    //❌Remove button from list

        // const addButton = document.querySelector("#addButton").addEventListener("click", () => {
        //     console.log("Add");
        //     if (!userInfoModal) {
                
        //         userInfoModal = new Modal('userpage', '/modals/user-info');
        //     } else {
        //         userInfoModal.show();
        //         userInfoModal.updateModalContent('/modals/user-info');
        //     }
        //     closeContextMenu();
        // });

    //❌Remove button from list
        // const wsclist = document.querySelector("#wsclist").addEventListener("click", () => {
        //     console.log('wsc.users list:' );
        //     console.log(wsc.getUsers());
        //     closeContextMenu();
        // });

    //❌Remove button from list
        // const wscspherelist = document.querySelector("#wscspherelist").addEventListener("click", () => {
        //     console.log('wsc.userSpheres list:' );
        //     console.log(wsc.userSpheres);
        //     closeContextMenu();
        // });




    const demoButtonA = document.querySelector("#demoButtonA").addEventListener("click", () => {
        console.log("Demo Button A clicked");
        sendIntersectionPoint(intersectionPoint, '🌷');
        closeContextMenu();
    });

    const demoButtonB = document.querySelector("#demoButtonB").addEventListener("click", () => {
        console.log("Demo Button B clicked");
        sendIntersectionPoint(intersectionPoint, '🌟');
        closeContextMenu();
    });

    const demoButtonC = document.querySelector("#demoButtonC").addEventListener("click", () => {
        console.log("Demo Button C clicked");
        sendIntersectionPoint(intersectionPoint, '♥');
        closeContextMenu();
    });


    const demoButtonD = document.querySelector("#demoButtonD").addEventListener("click", () => {
        console.log("Demo Button D clicked");
        sendIntersectionPoint(intersectionPoint, '🍀');
        closeContextMenu();
    });

    const demoButtonE = document.querySelector("#demoButtonE").addEventListener("click", () => {
        console.log("Demo Button E clicked");
        sendIntersectionPoint(intersectionPoint, '🌿');
        closeContextMenu();
    });

    const demoButtonF = document.querySelector("#demoButtonF").addEventListener("click", () => {
        console.log("Demo Button F clicked");
        sendIntersectionPoint(intersectionPoint, '🗝');
        closeContextMenu();
    });

    const demoButtonG = document.querySelector("#demoButtonG").addEventListener("click", () => {
        console.log("Demo Button G clicked");
        sendIntersectionPoint(intersectionPoint, '💎');
        closeContextMenu();
    });





    // Landmark Submission Button
    const submitarea = document.querySelector("#submitbutton").addEventListener("click", () => {
        console.log("Submit Button Clicked");
        const textarea = document.getElementById('textarea2');
        const content = textarea.value;
        sendIntersectionPoint(intersectionPoint, content);

        console.log(content);
        closeContextMenu();
    });




// Submit Related Events


function attachSubmitButtonListener() {
    console.log('Attaching submit button listener')
    const submitButton = document.getElementById('loginbutton').addEventListener("click", () => {
        submitForm();
    });
}





// Usage example





    //Close Context Menu
    function closeContextMenu() {
        const contextMenus = document.querySelectorAll('.contextMenu');
        Array.prototype.forEach.call(contextMenus, (menu) => {
            menu.style.display = "none";
        });
    }










};


    