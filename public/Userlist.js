export function addUserToList(userID, isSelf = false) {
    const userListUl = document.getElementById('user-list-ul');

    // Check if user is already in the list
    if (document.getElementById('user-' + userID)) {
        return;  // User is already in the list, do not add again
    }

    const userItem = document.createElement('li');
    userItem.id = 'user-' + userID; 
    userItem.innerHTML = userID;

    if (isSelf) {
        userItem.style.color = 'green';
    }

    userListUl.appendChild(userItem);
}



export function removeUserFromList(userID) {
    const userItem = document.getElementById('user-' + userID);
    if (userItem) {
        userItem.parentNode.removeChild(userItem);
    }
}

