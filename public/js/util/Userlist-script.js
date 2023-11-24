function addUserToList(userID, isSelf = false) {
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

function removeUserFromList(userID) {
    const userItem = document.getElementById('user-' + userID);
    if (userItem) {
        userItem.parentNode.removeChild(userItem);
    }
}

function prioritizeGreenUser() {
    const userListUl = document.getElementById('user-list-ul');
    const userItems = Array.from(userListUl.children);

    // Sort user items based on color
    userItems.sort((a, b) => {
        const isAGreen = a.style.color === 'green';
        const isBGreen = b.style.color === 'green';

        if (isAGreen && !isBGreen) {
            return -1; // a is green, b is not green, a should come before b
        } else if (!isAGreen && isBGreen) {
            return 1; // b is green, a is not green, b should come before a
        } else {
            return 0; // both a and b are green or both are not green, maintain the order
        }
    });

    // Reorder user items in the DOM
    userItems.forEach(userItem => userListUl.appendChild(userItem));
}
