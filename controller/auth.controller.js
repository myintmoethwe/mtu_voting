exports.renderAdminLogin = (req, res) => {
    res.render("admin-login", { error: null });
};

exports.adminLogin = (req, res) => {
    const { username, password } = req.body;

    const validUser = process.env.ADMIN_USER;
    const validPass = process.env.ADMIN_PASS;

    if (!validUser || !validPass) {
        console.error("ADMIN_USER or ADMIN_PASS environment variables are not set.");
        return res.status(500).render("admin-login", {
            error: "Server configuration error. Please try again later.",
        });
    }

    if (username === validUser && password === validPass) {
        // Regenerate session to prevent session fixation attacks
        return req.session.regenerate((err) => {
            if (err) {
                return res.status(500).send("Session error");
            }

            // Set admin flag inside session
            req.session.user = {
                name: "System Admin",
                isAdmin: true,
            };

            // Save session before redirecting
            req.session.save((err) => {
                if (err) {
                    return res.status(500).send("Session save error");
                }
                res.redirect("/admin");
            });
        });
    }

    res.render("admin-login", {
        error: "Invalid Admin Username or Password",
    });
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
        }
        res.clearCookie('connect.sid');
        res.redirect("/");
    });
};