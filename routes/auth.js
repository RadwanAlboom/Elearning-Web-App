const Joi = require('joi');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

router.post('/', async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    if (req.body.isModerator) {
        let sql = `SELECT * FROM teachers WHERE email = ?`;
        const [rows] = await db.query(sql, [req.body.email]);
        let teacher = null;
        if (!rows.length)
            return res
                .status(400)
                .send('Invalid email or password or incorrect major.');

        teacher = rows[0];

        const validPassword = await bcrypt.compare(
            req.body.password,
            teacher.password
        );
        if (!validPassword)
            return res
                .status(400)
                .send('Invalid email or password or incorrect major.');

        if (teacher.course_id !== req.body.majorId)
            return res
                .status(400)
                .send('Invalid email or password or incorrect major.');

        const id = uuidv4();
        teacher.loginId = id;

        let sql2 = `UPDATE teachers SET loginId = ? WHERE id = ?`;
        await db.query(sql2, [id, teacher.id]);

        const token = teacherGenerateAuthToken(teacher);
        res.send({
            jwt: token,
        });
    } else {
        let sql = `SELECT * FROM users WHERE email = ?`;
        const [rows] = await db.query(sql, [req.body.email]);
        let user = null;
        if (!rows.length)
            return res.status(400).send('Invalid email or password.');

        user = rows[0];

        const validPassword = await bcrypt.compare(
            req.body.password,
            user.password
        );
        if (!validPassword)
            return res.status(400).send('Invalid email or password.');

        const id = uuidv4();
        user.loginId = id;

        let sql2 = `UPDATE users SET loginId = ? WHERE id = ?`;
        await db.query(sql2, [id, user.id]);

        const token = userGenerateAuthToken(user);
        res.send({
            jwt: token,
        });
    }
});

function validate(req) {
    const schema = {
        email: Joi.string().min(5).max(255).required().email(),
        password: Joi.string().min(5).max(255).required(),
        isModerator: Joi.boolean().required(),
        majorId: Joi.number().integer().allow(null),
    };

    return Joi.validate(req, schema);
}

function teacherGenerateAuthToken(teacher) {
    const token = jwt.sign(
        {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            isModerator: teacher.isModerator,
            majorId: teacher.course_id,
            loginId: teacher.loginId,
        },
        'mySecretKey'
    );
    return token;
}

function userGenerateAuthToken(user) {
    const token = jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            isModerator: user.isModerator,
            loginId: user.loginId,
        },
        'mySecretKey'
    );
    return token;
}
module.exports = router;
