const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/', [auth, admin], async (req, res) => {
    let sqlGetUsers = `SELECT id, name, email, isModerator  FROM users WHERE isAdmin IS NULL`;
    const [users] = await db.query(sqlGetUsers);
    res.status(200).send(users);
});

router.put('/:id', [auth, admin], async (req, res) => {
    let { name, email, password } = req.body;
    if (name) {
        let sqlUpdateStudentName = 'UPDATE users SET name = ? WHERE id = ?';
        await db.query(sqlUpdateStudentName, [name, req.params.id]);
    }

    if (email) {
        let sqlUpdateStudentName = 'UPDATE users SET email = ? WHERE id = ?';
        await db.query(sqlUpdateStudentName, [email, req.params.id]);
    }

    if (password) {
        let sqlUpdateStudentName = 'UPDATE users SET password = ? WHERE id = ?';
        const salt = await bcrypt.genSalt(10);
        password = await bcrypt.hash(password, salt);
        await db.query(sqlUpdateStudentName, [password, req.params.id]);
    }

    let sqlGetUpdatedStudent =
        'SELECT id, name, email, isModerator  FROM users WHERE id = ?';
    const [student] = await db.query(sqlGetUpdatedStudent, [req.params.id]);

    res.status(200).send({
        id: req.params.id,
        newStudent: student[0],
    });
});

router.delete('/:id', [auth, admin], async (req, res) => {
    let sqlDeleteUser = 'DELETE FROM USERS WHERE id = ? ';
    await db.query(sqlDeleteUser, [req.params.id]);
    res.status(200).send({ id: req.params.id });
});

module.exports = router;
