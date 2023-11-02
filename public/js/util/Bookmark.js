export function bookmark() {
    // Create a JSON message with the user's ID and a dummy URL
    const message = {
        type: "bookmark",
        userID: myUserID,
        url: "http://dummy-url.com"
    };
    console.log('Bookmark sent:', message);
    // Send the message to the server via WebSocket
    ws.send(JSON.stringify(message));
}