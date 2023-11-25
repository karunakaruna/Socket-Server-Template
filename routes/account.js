//account.js

const express = require('express');
const router = express.Router();
const limiter = require('../util/utils').limiter;  
const {sendMail} = require('../util/sendmail');
const {pool} = require('../util/dbConfig');
const bcrypt = require('bcrypt');
const passport = require('passport');
const jwt = require('jsonwebtoken');
require("dotenv").config();
const jwtSecret =  process.env.JWT_SECRET; 
const { v4: uuidv4 } = require('uuid');

const { getOnlineTime,updateOnlineTime } = require('../util/db-actions.js');


// const { users, getUsers } = require('../users.js');


router.post('/login', limiter, function(req, res, next) {
    passport.authenticate('local', function(err, account, info) {
        console.log('Account ID:', account.id);

        if (err) {
            return res.status(500).json({error: 'Internal server error'});
        }
        if (!account) {
            return res.status(401).json({error: 'Incorrect email or password'});
        }
        req.logIn(account, async function(err) {
            if (err) {
                return res.status(500).json({error: 'Could not log in user'});
            }

            try {
                // Fetch publicUserID from the database
                const publicUserID = await getPublicUserID(account.id);
                // Include publicUserID in the session or send it in the response
                req.session.publicUserID = publicUserID;

                console.log('>>>>>>>>> User publicUserID:', publicUserID); // Add this line to log the publicUserID

           
                //Get The Users + Websocket
                const users = req.app.get('users');
                const wss = req.app.get('wss');


                console.log('users length:', Object.keys(users).length); // Log the length of users
                console.log('users:', users);


                const onlineTime = await getOnlineTime(publicUserID);
                console.log('Stored onlineTime:', onlineTime);
                if (users[publicUserID]) {
                    console.log('User already logged in');
                    users[publicUserID].count = onlineTime || 0;
                }

                const jsonMsg = JSON.stringify({ 
                    message: 'thanks', 
                    updateModal: '/users/dashboard',
                    publicUserID: publicUserID // Send publicUserID to the client
                });

                users[publicUserID] = {
                    position: { x: 0, y: 0, z: 0 }, // default position
                    count: onlineTime || 0, // Initialize count with the last online time from the database
                    level: 1,
                };

                wss.clients.forEach((client) => {
                    // console.log('client:', client);
                    const userID = client.userID; // Assuming each client has a userId property
                    console.log('userID:', userID);
                    const reinit = {
                        type: 'updateUserID',
                        overlay: 'Logged In',
                        publicUserID: publicUserID,
                        onlineTime: onlineTime
                    };
                    client.send(JSON.stringify(reinit));
                });




                return res.send(jsonMsg);
            } catch (error) {
                console.error("Error fetching publicUserID:", error);
                return res.status(500).json({error: 'Failed to retrieve public user ID'});
            }
        });
    })(req, res, next);
});

async function getPublicUserID(userID) {
    console.log('Fetching publicUserID for user ID:', userID);
    const query = `SELECT publicid FROM users WHERE id = $1`; // Ensure this matches the column name case in your DB
    const values = [userID];

    try {
        const result = await pool.query(query, values);
        console.log('Database query result:', result.rows);
        if (result.rows.length > 0) {
            // Access the column name in the correct case, as returned by the query
            return result.rows[0].publicid; // Use the correct case as per your DB schema
        } else {
            throw new Error("User not found");
        }
    } catch (err) {
        console.error('Database query error:', err.message);
        throw err;
    }
}





//Register
router.post('/register', limiter, async (req, res) => {
    let {name, email, password, password2} = req.body;

    let errors = [];
    if(!name || !email || !password || !password2){
        errors.push({message: "Please enter all fields"});
    }
    if(password.length < 6){
        errors.push({message: "Password should be at least 6 characters"});
    }
    if(password != password2){
        errors.push({message: "Passwords do not match"});
    }
    if(errors.length > 0){
        res.json({ errors });  // Send errors as JSON
    } else {
        //Form validation has passed
        let publicID = uuidv4();
        let hashedPassword = await bcrypt.hash(password, 10);

        pool.query(
            `SELECT * FROM users
            WHERE email = $1`,
            [email],
             (err, results) => 
                {
                if(err){
                    throw err;
                }

                 if(results.rows.length > 0){
                   errors.push({message: "Email already registered"});
                   res.json({ errors });  // Send errors as JSON
                 }else{
                    pool.query(
                        `INSERT INTO users (name, email, password, publicID)
                        VALUES ($1, $2, $3, $4)
                        RETURNING id, publicID`,
                       [name, email, hashedPassword, publicID],(err, results) => {
                            if(err){
                                throw err;
                            }
                            req.flash('success_msg', "You are now registered. Please log in");
                            try {
                                const jsonMsg = JSON.stringify({ message: 'thanks' , updateModal: '/modals/login'});
                                res.send(jsonMsg);
                                req.flash('success_msg', "You are now registered. Please log in");
                                console.log('User Registered');
                            } catch (error) {
                                console.error("Error rendering EJS:", error);
                                res.status(500).send('Server Error');
                            }
                        }
                    )
                }
            }


            
        );

    }
});


//Logout
router.get("/logout", function(req, res, next){
    req.logout(function(err) {
        const publicUserID = req.session.publicUserID; // Get the publicID from the session
        if (err) { return next(err); }
        const users = req.app.get('users');
        console.log('users:', users);
        if (users[publicUserID]) {
            updateOnlineTime(publicUserID, users[publicUserID].count);
            delete users[publicUserID];
        } else {
            console.log('User not logged in');
        }
        res.json({ message: 'Logged out successfully', updateModal: '/modals/home' });
        
    });
    res.redirect('/');
});


//Forgot Password Request
router.post('/forgot-password', limiter, (req, res) => {
    const { email } = req.body;
    console.log(email);


    pool.query(
        `SELECT * FROM users
        WHERE email = $1`,
        [email],
        (err, results) => {
            if (err) {
                throw err;
            }
            //console.log(results.rows);

            if (results.rows.length > 0) {
                console.log('email exists in db to update');
                const tempsecret = jwtSecret + results.rows[0].password;
                const payload = {
                    email: results.rows[0].email,
                    id: results.rows[0].id
                };

                const token = jwt.sign(payload, tempsecret, { expiresIn: '15m' });
                const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
                const link = `${BASE_URL}/account/reset-password/${results.rows[0].id}/${token}`;
                //const link = `http://localhost:3000/account/reset-password/${results.rows[0].id}/${token}`;
                const email = results.rows[0].email;
                console.log(link);
                sendMail( email, link ).then((result) => console.log('Email sent...',result)).catch((error) => console.log(error.message));
                res.send({error : 'Email sent.'}  );


            } else {
                console.log('no user exists in db to update');
                res.send({error : 'User does not exist'});
                //res.status(404).send('User not found');
            }
        }
    );
});

//Reset Password Request
router.get('/reset-password/:id/:token', limiter, (req, res) => {
    const { id, token } = req.params;   
    pool.query(
        `SELECT * FROM users
        WHERE id = $1`,
        [id],
         (err, results) => 
            {
            if(err){
                throw err;
            }
      

             if(results.rows.length > 0){
                console.log('user exits in db to update');
                const tempsecret2 = jwtSecret + results.rows[0].password;

                try {
                    const payload = jwt.verify(token, tempsecret2);
                    res.render('modal-content-login-resetpassword', {email: results.rows[0].email});
                } catch (error) {
                    console.log(error.message);
                    res.send('error');
                }
             }else{
                console.log('no user exists in db to update');

            }
        }

    );
});

//Reset Password Page
router.post('/reset-password/:id/:token', limiter, (req, res) => {
    const { id, token } = req.params;

    pool.query(
        `SELECT * FROM users WHERE id = $1`,
        [id],
        (err, results) => {
            if (err) {
                throw err;
            }

            if (results.rows.length > 0) {
                const tempsecret = jwtSecret + results.rows[0].password;
                try {
                    const payload = jwt.verify(token, tempsecret);
                    const { password, password2 } = req.body;
                    if (password === password2) {
                        bcrypt.hash(password, 10).then((hash) => {
                            pool.query(
                                `UPDATE users SET password = $1 WHERE id = $2`,
                                [hash, id],
                                (err, results) => {
                                    if (err) {
                                        throw err;
                                    }
                                    res.redirect('/');  // Redirect to homepage after successful password update
                                }
                            );
                        });
                    } else {
                        res.send('passwords do not match');
                    }
                } catch (error) {
                    console.log(error.message);
                    res.send('error');
                }
            } else {
                console.log('no user exists in db to update');
            }
        }
    );
});

module.exports = router;


