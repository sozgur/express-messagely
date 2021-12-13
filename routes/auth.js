const express = require("express");
const router = new express.Router();
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const ExpressError = require("../expressError");

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/

router.post("/login", async function (req, res, next) {
    try {
        const { username, password } = req.body;
        const auth = await User.authenticate(username, password);
        if (auth) {
            let token = jwt.sign({ username }, SECRET_KEY);
            await User.updateLoginTimestamp(username);
            return res.json({ token });
        }
        throw new ExpressError("Invalid user/password", 400);
    } catch (err) {
        return next(err);
    }
});

/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */

router.post("/register", async function (req, res, next) {
    try {
        const { username } = req.body;

        const user = await User.register(req.body);

        if (user) {
            let token = jwt.sign({ username }, SECRET_KEY);
            await User.updateLoginTimestamp(username);
            return res.json({ token });
        }
    } catch (err) {
        if (err.code === "23505") {
            return next(
                new ExpressError("Username taken. Please pick another!", 400)
            );
        }
        return next(err);
    }
});

module.exports = router;
