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
router.post('/user-info', (req, res) => {
    try {
        // Get the publicUserID from the session
        let publicUserID = req.session.publicUserID;
        if (!publicUserID) {
            // If no publicUserID is found in the session, use the user from the request body
            publicUserID = req.body.user;
        }

        console.log('publicUserID:', publicUserID);

        // Retrieve users from the application context
        const users = req.app.get('users');
        console.log('Users:', users);

        // Function to retrieve user information based on publicUserID
        function getUserInfo(publicUserID) {
            return users.find(user => user.publicUserID === publicUserID);
        }

        // Retrieve the user information
        const userInfo = getUserInfo(publicUserID);
        if (!userInfo) {
            // Handle case where user info is not found
            return res.status(404).send('User information not found');
        }

        // Send the user information as JSON response
        res.json(userInfo);
  
    } catch (error) {
        console.error("Error retrieving user information:", error);
        res.status(500).send('Server Error');
    }
});





module.exports = router;