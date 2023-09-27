// Function to append logs
function addLog(text) {
    const logList = document.getElementById('log-list');
    const newLog = document.createElement('li');
    
    // Convert URLs to clickable links
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');

    newLog.innerHTML = text;
    
    // Append new log to the end of the list
    logList.appendChild(newLog);

    // Start fading out after appending
    setTimeout(() => {
        newLog.classList.add('fade');
    }, 1000);  // start the fade out 1 second after appending
}


// Simulate beacon signal received every 5 seconds
setInterval(function() {
    addLog('Received beacon signal');
}, 5000);
