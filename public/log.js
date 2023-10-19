//Log.js

// Function to add new log
export function addLog(message) {
    const logList = document.getElementById('log-list');
    
    // Create new log item
    const newItem = document.createElement('li');
    
    newItem.innerHTML = new Date().toLocaleTimeString() + ": " + message;

    // Append new item to the end of the list
    logList.appendChild(newItem);

    // Start fading out after appending
    setTimeout(() => {
        newItem.classList.add('fade');
    }, 1000);  // start the fade out 1 second after appending
}

