const express = require("express");
const router = new express.Router();
const Message = require("../models/message");
const { ensureLoggedIn, ensureCorrectUser } = require("../middleware/auth");
const ExpressError = require("../expressError");

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/

router.get("/:id", ensureLoggedIn, async function (req, res, next) {
    try {
        const { id } = req.params;
        const message = await Message.get(id);
        console.log(
            req.user.username,
            message.from_user.username,
            message.to_user.username
        );

        if (
            req.user.username !== message.from_user.username &&
            req.user.username !== message.to_user.username
        ) {
            throw new ExpressError("Unauthorized", 400);
        }

        return res.json({ message });
    } catch (err) {
        return next(err);
    }
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/

router.post("/", ensureLoggedIn, async function (req, res, next) {
    try {
        const from_username = req.user.username;
        const { to_username, body } = req.body;
        const message = await Message.create({
            from_username,
            to_username,
            body,
        });
        res.json({ message });
    } catch (err) {
        return next(err);
    }
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/

router.post("/:id/read", ensureLoggedIn, async function (req, res, next) {
    try {
        const { id } = req.params;
        const message = await Message.get(id);

        if (req.user.username !== message.to_user.username) {
            throw new ExpressError("Unauthorized", 400);
        }

        const result = await Message.markRead(id);
        res.json({ message: result });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;
