import { bookmark } from "./Bookmark.js";
import { wsc, userSphere } from "../../scene.js";
import { intersectionPoint } from "../Listeners.js";
import { displayOverlayText } from "./ShowModal.js";
import { attachLabelToObjectsAdv } from "../Sprite.js";






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


        function sendIntersectionPoint(intersectionPoint, text) {
            const message = {
                type: 'create',
                point: intersectionPoint,
                userID: wsc.myUserID,
                text: text
            };
            wsc.wsSend(message);
        }

    

    const listUsersButton = document.querySelector("#listUsersButton").addEventListener("click", () => {
        console.log("List Users");
        closeContextMenu();
    });

    const addButton = document.querySelector("#addButton").addEventListener("click", () => {
        console.log("Add");
        displayOverlayText('Hello, World!', 3000, 24);
        closeContextMenu();
    });


    const levelButton = document.querySelector("#levelUpButton").addEventListener("click", () => {
        console.log("Level");
        userSphere.setLevel(userSphere.getLevel()+1);
        
        displayOverlayText('Level Up!', 3000, 24);
        closeContextMenu();
    });




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







// Submit Related Events


function attachSubmitButtonListener() {
    console.log('Attaching submit button listener')
    const submitButton = document.getElementById('loginbutton').addEventListener("click", () => {
        submitForm();
    });
}


async function submitForm() {
    const form = document.getElementById('loginForm');
    const email = form.email.value;
    const password = form.password.value;

    const data = new URLSearchParams();
    data.append('email', email);
    data.append('password', password);

    try {
        const response = await fetch('/account/login', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            credentials: 'include',
            body: data, 
        });
        const message = await response.json();
        if (message.error) {
            const errorList = document.querySelector('ul');
            errorList.innerHTML = `<li>${message.error}</li>`;
        } else if (message.updateModal) {
            console.log('form submitted');
            console.log(message.updateModal);
            updateModalContent(message.updateModal);
            publicUserID = message.publicUserID;
            previousID = document.getElementById('username').textContent
            document.getElementById('username').textContent = publicUserID;
            console.log('Assigned UserID:',publicUserID);
            removeUserFromList(previousID);
            addUserToList(publicUserID, true);
            prioritizeGreenUser();
        }
    } catch (error) {
        console.error('Error submitting form:', error);
    }
};




async function submitRegisterForm() {
    const form = document.getElementById('registerForm');
    const name = form.name.value;
    const email = form.email.value;
    const password = form.password.value;
    const password2 = form.password2.value;

    const data = { name, email, password, password2 };

    try {
        const response = await fetch('/account/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        const responseData = await response.json();
        if (responseData.errors) {
            const errorList = document.getElementById('errorList');
            errorList.innerHTML = '<ul>';
            responseData.errors.forEach(error => {
                errorList.innerHTML += `<li>${error.message}</li>`;
            });
            errorList.innerHTML += '</ul>';
        } else {
            updateModalContent(responseData.updateModal);

        }
    } catch (error) {
        console.error('Error submitting form:', error);
    }
}



async function logOut() {
    try {
        const response = await fetch('/account/logout', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            credentials: 'include',
        });
        const message = await response.json();
        console.log(message);
        if (message.updateModal) {
            updateModalContent(message.updateModal);
        }
    } catch (error) {
        console.error('Error submitting form:', error);
    }
};


async function submitEmail() {
    const form = document.getElementById('loginForm');
    const email = form.email.value;

    const data = new URLSearchParams();
    data.append('email', email);

    try {
        const response = await fetch('/account/forgot-password', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: data,
            credentials: 'include',
        });
        const message = await response.json();
        setTimeout(function(){ 
            updateModalContent('/modals/login');



        }, 2000);
        if (message.error) {
            document.getElementById('errorList').innerHTML = `<li>${message.error}</li>`;
        } else {
            // handle success, maybe redirect or update the UI
        }
    } catch (error) {
        console.error('Error submitting form:', error);
    }
};


async function updatePassword() {
    const form = document.getElementById('loginForm');
    const password = form.password.value;
    const password2 = form.password2.value;

    const data = new URLSearchParams();
    data.append('password', password);
    data.append('password2', password2);

    console.log(email);
    try {
        const response = await fetch('/account/reset-password', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            credentials: 'include',
            body: data, 
        });
        const message = await response.json();
        console.log(message);
    } catch (error) {
        console.error('Error submitting form:', error);
    }
};

async function updatePassword() {
    const form = document.getElementById('loginForm');
    const password = form.password.value;
    const password2 = form.password2.value;

    const data = new URLSearchParams();
    data.append('password', password);
    data.append('password2', password2);

    try {
        const response = await fetch('', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: data, 
        });

        // Check if the response is a redirect
        if (response.redirected) {
            // Follow the redirect
            window.location.href = response.url;
        } else {
            // Handle other types of responses (e.g., errors)
            const message = await response.json();
            console.log(message);
        }
    } catch (error) {
        console.error('Error submitting form:', error);
    }
};





























    //Close Context Menu
    function closeContextMenu() {
        const contextMenus = document.querySelectorAll('.contextMenu');
        Array.prototype.forEach.call(contextMenus, (menu) => {
            menu.style.display = "none";
        });
    }










};


    