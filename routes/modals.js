//Modals
const express = require('express');
const router = express.Router();
const limiter = require('../util/utils').limiter;  


router.get('/login', (req, res) => {
    try {
        const data = {
            title: 'Modal Title',
            content: 'Content for the modal'
        };
        res.render('modal-content-login.ejs', data);
    } catch (error) {
        console.error("Error rendering EJS:", error);
        res.status(500).send('Server Error');
    }
});

router.get('/register', (req, res) => {
    try {
        const data = {
            title: 'Modal Title',
            content: 'Content for the modal'
        };
        res.render('modal-content-register.ejs', data);
    } catch (error) {
        console.error("Error rendering EJS:", error);
        res.status(500).send('Server Error');
    }
});


router.get('/forgotpassword', limiter, (req, res) => {
    try {
        const data = {
            title: 'Modal Title',
            content: 'Content for the modal'
        };
        res.render('modal-content-login-forgotpassword.ejs', data);
    } catch (error) {
        console.error("Error rendering EJS:", error);
        res.status(500).send('Server Error');
    }
});



// router.get('/home', (req, res) => {
//     try {
//         const data = {
//             title: 'Modal Title',
//             content: 'Content for the modal'
//         };
//         res.render('modal-content-home.ejs', data);
//     } catch (error) {
//         console.error("Error rendering EJS:", error);
//         res.status(500).send('Server Error');
//     }
// });

router.get('/home', (req, res) => {
    try {
        const data = {
            title: 'Modal Title',
            content: 'Content for the modal',
            isAuthenticated: req.isAuthenticated() // true if the user is logged in
        };
        res.render('modal-content-home.ejs', data);
    } catch (error) {
        console.error("Error rendering EJS:", error);
        res.status(500).send('Server Error');
    }
});


// Add this route to your existing routes in main.js

// Endpoint to get the current users array
router.get('/list-users', (req, res) => {
    // Ensure that the requester is authenticated if necessary
    // if (!req.isAuthenticated || !req.isAuthenticated()) {
    //     // If the user is not authenticated, you might want to send a 401 Unauthorized status
    //     return res.status(401).json({ error: 'Unauthorized' });
    // }

    // Send the users array as a JSON response
    // res.json({ users: req.app.get('users') });
    // Render the EJS template and pass the users object
    const data = { 
        users: req.app.get('users') 
    };
    res.render('userlist.ejs', data );
});



// Endpoint to get information about the current user
router.get('/user-info', (req, res) => {
    try {
        // Get the publicUserID from the session
        let publicUserID = req.session.publicUserID;
        const wss = req.app.get('wss');
        // Check if publicUserID exists
        if (!publicUserID) {
            publicUserID = wss.myUserID;
            return res.send('Please login to access user data');
        }

        // Retrieve the user information based on the publicUserID
        const userInfo = getUserInfo(publicUserID); // Replace with your logic to retrieve user information

        // Return the user information as a JSON response
        res.json(userInfo);
    } catch (error) {
        console.error("Error retrieving user information:", error);
        res.status(500).send('Server Error');
    }
});


// Function to retrieve user information based on publicUserID
function getUserInfo(publicUserID) {
    // Replace with your logic to retrieve user information based on publicUserID
    // Example implementation:
    const users = req.app.get('users');
    const userInfo = users.find(user => user.publicUserID === publicUserID);
    return userInfo;
}




module.exports = router;