// submit.js

async function submitForm() {
    const form = document.getElementById('loginForm');
    const email = form.email.value;
    const password = form.password.value;

    const data = new URLSearchParams();
    data.append('email', email);
    data.append('password', password);
    try {
        const response = await fetch('/account/login', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            credentials: 'include',
            body: data, 
        });
        const message = await response.json();
        if (message.error) {
            const errorList = document.querySelector('ul');
            errorList.innerHTML = `<li>${message.error}</li>`;
        } else if (message.updateModal) {
            console.log('form submitted');
            console.log(message.updateModal);
            updateModalContent(message.updateModal);
            publicUserID = message.publicUserID;
            previousID = document.getElementById('username').textContent
            document.getElementById('username').textContent = publicUserID;
            console.log('Assigned UserID:',publicUserID);
            removeUserFromList(previousID);
            addUserToList(publicUserID, true);
            prioritizeGreenUser();
        }
    } catch (error) {
        console.error('Error submitting form:', error);
    }
};


async function submitRegisterForm() {
    const form = document.getElementById('registerForm');
    const name = form.name.value;
    const email = form.email.value;
    const password = form.password.value;
    const password2 = form.password2.value;

    const data = { name, email, password, password2 };

    try {
        const response = await fetch('/account/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        const responseData = await response.json();
        if (responseData.errors) {
            const errorList = document.getElementById('errorList');
            errorList.innerHTML = '<ul>';
            responseData.errors.forEach(error => {
                errorList.innerHTML += `<li>${error.message}</li>`;
            });
            errorList.innerHTML += '</ul>';
        } else {
            updateModalContent(responseData.updateModal);

        }
    } catch (error) {
        console.error('Error submitting form:', error);
    }
}



async function logOut() {
    try {
        const response = await fetch('/account/logout', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            credentials: 'include',
        });
        const message = await response.json();
        console.log(message);
        if (message.updateModal) {
            updateModalContent(message.updateModal);
        }
    } catch (error) {
        console.error('Error submitting form:', error);
    }
};


async function submitEmail() {
    const form = document.getElementById('loginForm');
    const email = form.email.value;

    const data = new URLSearchParams();
    data.append('email', email);

    try {
        const response = await fetch('/account/forgot-password', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: data,
            credentials: 'include',
        });
        const message = await response.json();
        setTimeout(function(){ 
            updateModalContent('/modals/login');



        }, 2000);
        if (message.error) {
            document.getElementById('errorList').innerHTML = `<li>${message.error}</li>`;
        } else {
            // handle success, maybe redirect or update the UI
        }
    } catch (error) {
        console.error('Error submitting form:', error);
    }
};


async function updatePassword() {
    const form = document.getElementById('loginForm');
    const password = form.password.value;
    const password2 = form.password2.value;

    const data = new URLSearchParams();
    data.append('password', password);
    data.append('password2', password2);

    console.log(email);
    try {
        const response = await fetch('/account/reset-password', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            credentials: 'include',
            body: data, 
        });
        const message = await response.json();
        console.log(message);
    } catch (error) {
        console.error('Error submitting form:', error);
    }
};
