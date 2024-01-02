const bcrypt = require('bcrypt');
const Joi = require('joi');
const express = require('express');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const mysql = require('mysql2/promise');

// Get all user requests
router.get('/', [auth, admin], async (req, res) => {
    let sql = 'SELECT * FROM userrequests';
    const [rows] = await db.query(sql);
    res.status(200).send(rows);
});

//user sign up and wait for the permetion of the admin
router.post('/', async (req, res) => {
    const { error } = validateUserRequest(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let sql = `SELECT * FROM userrequests WHERE email = ?`;
    const [rows] = await db.query(sql, [req.body.email]);

    if (rows.length > 0)
        return res.status(400).send('User already registered.');

    let sql2 = `SELECT * FROM teachers WHERE email = ?`;
    const [rows2] = await db.query(sql2, [req.body.email]);

    if (rows2.length > 0)
        return res.status(400).send('User already registered.');

    let sql3 = `SELECT * FROM users WHERE email = ?`;
    const [rows3] = await db.query(sql3, [req.body.email]);

    if (rows3.length > 0)
        return res.status(400).send('User already registered.');

    const salt = await bcrypt.genSalt(10);
    req.body.password = await bcrypt.hash(req.body.password, salt);

    let sql4 = `INSERT INTO userrequests (name, email, password, isModerator, majorId) VALUES (?, ?, ?, ?, ?)`;
    await db.query(sql4, [
        req.body.name,
        req.body.email,
        req.body.password,
        req.body.isModerator,
        req.body.majorId,
    ]);

    res.status(200).send('ok');
});

//admin Delete a request
router.delete('/:id', [auth, admin], async (req, res) => {
    let sql = `DELETE FROM userrequests WHERE id = ?`;
    await db.query(sql, [req.params.id]);
    res.status(200).send({ id: req.params.id });
});

//admin accept request
router.put('/:id', [auth, admin], async (req, res) => {
    let sql = `SELECT * FROM userrequests WHERE id = ?`;
    const [row] = await db.query(sql, [req.params.id]);
    let userRequest = row[0];

    const id = uuidv4();

    const databaseConfigs = {
        host: 'eu-cdbr-west-01.cleardb.com',
        user: 'bc35cbfa307ff4',
        password: '5954f772',
        database: 'heroku_b4b2aa704af1467',
    };
    const connection = await mysql.createConnection(databaseConfigs);

    if (userRequest && userRequest.isModerator) {
        let sql1 = `DELETE FROM userrequests WHERE id = ?`;
        let sql2 = `INSERT INTO teachers (course_id, name, email, password, isModerator, loginId) VALUES (?, ?, ?, ?, ?, ?)`;
        try {
            await connection.beginTransaction();
            await connection.query(sql1, [req.params.id]);
            await connection.query(sql2, [
                userRequest.majorId,
                userRequest.name,
                userRequest.email,
                userRequest.password,
                userRequest.isModerator,
                id,
            ]);
            await connection.commit();
            await connection.end();
            return res.status(200).send('ok');
        } catch (err) {
            await connection.rollback();
            await connection.end();
            return res
                .status(500)
                .send('Something goes wrong!, try again later');
        }
    } else {
        let sql1 = `DELETE FROM userrequests WHERE id = ?`;
        let sql2 = `INSERT INTO users (name, email, password, isModerator, loginId) VALUES (?, ?, ?, ?, ?)`;
        try {
            await connection.beginTransaction();
            await connection.query(sql1, [req.params.id]);
            await connection.query(sql2, [
                userRequest.name,
                userRequest.email,
                userRequest.password,
                userRequest.isModerator,
                id,
            ]);
            await connection.commit();
            await connection.end();
            return res.status(200).send('ok');
        } catch (err) {
            await connection.rollback();
            await connection.end();
            return res
                .status(500)
                .send('Something goes wrong!, try again later');
        }
    }
});

//user (admin, simple user, moderator) notifications
router.get('/:id/notifications', auth, async (req, res) => {
    const { isModerator } = req.user;
    let sqlGetNotifications = '';
    if (isModerator) {
        sqlGetNotifications =
            'SELECT * FROM usernotifications WHERE teacher_id = ? ORDER BY date DESC';
    } else {
        sqlGetNotifications =
            'SELECT * FROM usernotifications WHERE user_id = ? ORDER BY date DESC';
    }

    const [userNotifications] = await db.query(sqlGetNotifications, [
        req.params.id,
    ]);

    res.status(200).send(userNotifications);
});

// make a notfication open
router.patch('/notifications/:id', auth, async (req, res) => {
    const sqlUpdateNotify =
        'UPDATE usernotifications SET open = ? WHERE id = ?';
    await db.query(sqlUpdateNotify, [1, req.params.id]);

    res.status(200).send({ id: req.params.id });
});

function validateUserRequest(user) {
    const schema = {
        name: Joi.string().min(5).max(50).required(),
        email: Joi.string().min(5).max(255).required().email(),
        password: Joi.string().min(5).max(255).required(),
        isModerator: Joi.boolean().required(),
        majorId: Joi.number().integer().allow(null),
    };

    return Joi.validate(user, schema);
}

module.exports = router;
