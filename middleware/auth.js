const jwt = require('jsonwebtoken');
const db = require('../db');

module.exports = async function (req, res, next) {
    let token = req.header('Authorization');
    if (token === 'null') token = null;

    if (!token) {
        return res.status(401).send('Access denied. No token provided.');
    }

    try {
        const decoded = jwt.verify(token, 'mySecretKey');

        if (decoded.isModerator) {
            let sql = `SELECT * FROM teachers WHERE id = ?`;
            const [rows] = await db.query(sql, [decoded.id]);
            let teacher = null;
            if (!rows.length) return res.status(400).send('Teacher not found.');

            teacher = rows[0];

            if (teacher.loginId !== decoded.loginId)
                return res.status(401).send('Invalid token.');
        } else {
            let sql = `SELECT * FROM users WHERE id = ?`;
            const [rows] = await db.query(sql, [decoded.id]);
            let user = null;
            if (!rows.length) return res.status(400).send('User not found.');

            user = rows[0];

            if (user.loginId !== decoded.loginId)
                return res.status(401).send('Invalid token.');
        }

        //add a new property called user to req
        //pass extra information to the next middleware
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).send('Invalid token.');
    }
};
