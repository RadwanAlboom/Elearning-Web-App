const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/', [auth, admin], async (req, res) => {
    let sqlGetTeachers = `SELECT id, name, email, isModerator  FROM teachers`;
    const [teachers] = await db.query(sqlGetTeachers);
    res.status(200).send(teachers);
});

router.put('/:id', [auth, admin], async (req, res) => {
    let { name, email, password } = req.body;
    if (name) {
        let sqlUpdateTeacherName = 'UPDATE teachers SET name = ? WHERE id = ?';
        await db.query(sqlUpdateTeacherName, [name, req.params.id]);
    }

    if (email) {
        let sqlUpdateTeacherEmail =
            'UPDATE teachers SET email = ? WHERE id = ?';
        await db.query(sqlUpdateTeacherEmail, [email, req.params.id]);
    }

    if (password) {
        let sqlUpdateTeacherPass =
            'UPDATE teachers SET password = ? WHERE id = ?';
        const salt = await bcrypt.genSalt(10);
        password = await bcrypt.hash(password, salt);
        await db.query(sqlUpdateTeacherPass, [password, req.params.id]);
    }

    let sqlGetUpdatedTeacher =
        'SELECT id, name, email, isModerator  FROM teachers WHERE id = ?';
    const [teacher] = await db.query(sqlGetUpdatedTeacher, [req.params.id]);

    res.status(200).send({
        id: req.params.id,
        newTeacher: teacher[0],
    });
});

router.delete('/:id', [auth, admin], async (req, res) => {
    let sqlDeleteTeacher = 'DELETE FROM teachers WHERE id = ? ';
    await db.query(sqlDeleteTeacher, [req.params.id]);
    res.status(200).send({ id: req.params.id });
});

module.exports = router;
