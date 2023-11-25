import { wsc } from "../../scene.js";
import { selectedObject} from "../Listeners.js";

export function bookmark() {
    // Create a JSON message with the user's ID and a dummy URL
    const userData = selectedObject.userData;
    const message = {
        type: "bookmark",
        userID: wsc.myUserID,
        name: userData.name,
        URL: userData.URL
    };

    console.log('Bookmark sent:', message);
    // Send the message to the server via WebSocket
    wsc.wsSend(message);
}



