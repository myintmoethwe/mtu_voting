const isAdmin = (req, res, next) => {
  // If user is logged in as admin, let them proceed
  if (req.session && req.session.user && req.session.user.isAdmin === true) {
    return next();
  }
  return res.redirect("/auth/login");
};

module.exports = isAdmin;

//user authentication

function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        return next(); 
    }
    res.redirect('/login'); 
}