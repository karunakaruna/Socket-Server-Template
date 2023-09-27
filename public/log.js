// Function to add new log
function addLog(message) {
    const logList = document.getElementById('log-list');
    
    // Create new log item
    const newItem = document.createElement('li');
    
    // Convert URLs to clickable links
    message = message.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    
    newItem.innerHTML = new Date().toLocaleTimeString() + ": " + message;

    // Append new item to the end of the list
    logList.appendChild(newItem);

    // Start fading out after appending
    setTimeout(() => {
        newItem.classList.add('fade');
    }, 1000);  // start the fade out 1 second after appending
}
