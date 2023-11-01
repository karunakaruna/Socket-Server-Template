import { ws } from "./WebSockets";

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
        
        ws.send(JSON.stringify(payload));
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