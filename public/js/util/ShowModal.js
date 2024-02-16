// import { wsSend, ws } from "../WebSockets";
import { loadedGLTF } from "../Loaders";
import { addLog } from "./log";
import { spawnEntrancePingAtPosition } from "../Spawners";
import {wsc} from '../../scene.js';

export function showModal(objectName, url, intersectionPoint) {
    modalText.innerText = `Enter ${objectName}`;
    urlModal.style.display = 'block';

    // Close the modal if clicked outside the content
    urlModal.onclick = (e) => {
        if (e.target === urlModal) {
            urlModal.style.display = 'none';
        }
    };

    // When confirm is clicked, open the URL
    confirmButton.onclick = () => {
        urlModal.style.display = 'none';
    
        // Handle the entrance ping on URL confirmation
            
        const payload = {
            type: 'entrance',
            objectName: objectName,
            position: {
                x: intersectionPoint.x,
                y: intersectionPoint.y,
                z: intersectionPoint.z
            }
        };
        
        // wsSend(payload);
        wsc.wsSend(payload);
        console.log('Payload sent:', payload);

        if (loadedGLTF && loadedGLTF.scene) {
            loadedGLTF.scene.traverse((object) => {
                if (object.userData && object.userData.Name === objectName) {
                    if (object.userData.URL) {
                        addLog(`You entered <a href="${object.userData.URL}" target="_blank">${object.userData.Name}</a>`);
                    } else {
                        addLog(`You entered ${objectName}`);
                    }
                }
            });
        }




        // Delay the opening of the URL by 1 second
        spawnEntrancePingAtPosition(intersectionPoint);

        setTimeout(() => {
            window.open(url, "_blank");
        }, 1000);
    };
    
}




export function createLandmark(objectName, url, intersectionPoint) {
    modalText.innerText = `Enter ${objectName}`;
    urlModal.style.display = 'block';

    // Close the modal if clicked outside the content
    urlModal.onclick = (e) => {
        if (e.target === urlModal) {
            urlModal.style.display = 'none';
        }
    };

    // When confirm is clicked, open the URL
    confirmButton.onclick = () => {
        urlModal.style.display = 'none';
    
        // Handle the entrance ping on URL confirmation
            
        const payload = {
            type: 'entrance',
            objectName: objectName,
            position: {
                x: intersectionPoint.x,
                y: intersectionPoint.y,
                z: intersectionPoint.z
            }
        };
        
        // wsSend(payload);
        wsc.wsSend(payload);
        console.log('Payload sent:', payload);

        if (loadedGLTF && loadedGLTF.scene) {
            loadedGLTF.scene.traverse((object) => {
                if (object.userData && object.userData.Name === objectName) {
                    if (object.userData.URL) {
                        addLog(`You entered <a href="${object.userData.URL}" target="_blank">${object.userData.Name}</a>`);
                    } else {
                        addLog(`You entered ${objectName}`);
                    }
                }
            });
        }




        // Delay the opening of the URL by 1 second
        spawnEntrancePingAtPosition(intersectionPoint);

        setTimeout(() => {
            window.open(url, "_blank");
        }, 1000);
    };
    
}





// Function to display overlay text
export function displayOverlayText(text, time, textSize) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '45%'; // Move the overlay 20% up
    overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, -50%)';
    overlay.style.fontSize = `${textSize}px`;
    overlay.style.opacity = '0';
    overlay.innerText = text;
    document.body.appendChild(overlay);

    // Fade in the overlay text
    setTimeout(() => {
        overlay.style.transition = 'opacity 0.5s';
        overlay.style.opacity = '1';
    }, 0);

    // Display the overlay text for the specified time
    setTimeout(() => {
        // Fade out the overlay text
        overlay.style.transition = 'opacity 0.5s';
        overlay.style.opacity = '0';

        // Remove the overlay element from the DOM after fading out
        setTimeout(() => {
            document.body.removeChild(overlay);
        }, 500);
    }, time);
}

// Example usage of the displayOverlayText function


