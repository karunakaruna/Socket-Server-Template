const rateLimit = require("express-rate-limit");

//Rate Limiting
const limiter = rateLimit({
    windowMs: 1 * 300 * 1000, // 5 minutes
    max: 50000000000, // 5 requests
    message: 'Too many requests from this IP, please try again in 5 min!'  
  });
    

  module.exports = {limiter};