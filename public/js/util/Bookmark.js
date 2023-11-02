import { wsc } from "../../scene.js";

export function bookmark() {
    // Create a JSON message with the user's ID and a dummy URL
    const message = {
        type: "bookmark",
        userID: wsc.myUserID,
        url: "http://dummy-url.com"
    };
    console.log('Bookmark sent:', message);
    // Send the message to the server via WebSocket
    wsc.wsSend(message);
}