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



module.exports = router;