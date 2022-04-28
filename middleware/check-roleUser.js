module.exports = (req, res, next) => {
    if(req.session.user.role==='user'){
        return res.redirect('/');
    }  
    next();
}

