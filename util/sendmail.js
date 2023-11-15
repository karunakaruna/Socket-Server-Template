const nodemailer = require('nodemailer');
const { google } = require("googleapis");
require("dotenv").config();
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const USER = process.env.USER;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })

async function sendMail(email, link){
    try{
        const accessToken = await oAuth2Client.getAccessToken()
        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: USER,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken,
            }
        })

        const mailOptions = {
            from: 'Metacarta 🌐 <jonnyostrem@gmail.com>',
            to: email,
            subject: 'Reset Password',
            text: link,
            html: '<h1>Reset Password</h1> <p>Click the link below to reset your password.</p> <a href="' + link + '">Reset Password</a>'
        }

        const result = await transport.sendMail(mailOptions)
        return result


    }catch(error){
        console.log(error);

        return error;
    }

};

module.exports = {sendMail};