

module.exports = {
    checkAuthenticated: function(req, res, next){
        if(req.isAuthenticated()){
                return res.redirect('/users/dashboard');
        }
        next();
    },

    checkNotAuthenticated: function(req, res, next){
        if(req.isAuthenticated()){
                return next();
        }
        res.redirect('/');
    }
};
