const _ = require('lodash');
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

//get all private msgs betweeen user and teacher

router.get('/:id1/:id2', auth, async (req, res) => {
    if (req.user.isModerator) {
        let sqlGetMsgs =
            'SELECT * FROM messages WHERE user_id = ? AND teacher_id = ?';
        const [msgs] = await db.query(sqlGetMsgs, [
            req.params.id2,
            req.params.id1,
        ]);
        res.status(200).send(msgs);
    } else {
        let sqlGetMsgs =
            'SELECT * FROM messages WHERE user_id = ? AND teacher_id = ?';
        const [msgs] = await db.query(sqlGetMsgs, [
            req.params.id1,
            req.params.id2,
        ]);
        res.status(200).send(msgs);
    }
});

router.post('/msgNotfications/:id', auth, async (req, res) => {
    let uniqueMessages = [];
    if (req.user.isModerator) {
        let sqlGetMsgs =
            'SELECT * FROM messages WHERE teacher_id = ? AND receiver_id = ? ORDER BY date DESC';
        const [msgs] = await db.query(sqlGetMsgs, [
            req.params.id,
            req.params.id,
        ]);

        const uniqueMsgs = _.uniqBy(msgs, 'user_id');

        for (var msg of uniqueMsgs) {
            let sqlGetRecevierInfo = 'SELECT * FROM users WHERE id = ?';
            const [info] = await db.query(sqlGetRecevierInfo, [msg.user_id]);
            msg.name = info[0].name;
            msg.image = info[0].image;
            msg.email = info[0].email;
            msg.chatId = msg.user_id;
            uniqueMessages.push(msg);
        }
    } else {
        let sqlGetMsgs =
            'SELECT * FROM messages WHERE user_id = ? AND receiver_id = ? ORDER BY date DESC';
        const [msgs] = await db.query(sqlGetMsgs, [
            req.params.id,
            req.params.id,
        ]);
        const uniqueMsgs = _.uniqBy(msgs, 'teacher_id');

        for (var msg of uniqueMsgs) {
            let sqlGetRecevierInfo = 'SELECT * FROM teachers WHERE id = ?';
            const [info] = await db.query(sqlGetRecevierInfo, [msg.teacher_id]);
            msg.name = info[0].name;
            msg.image = info[0].image;
            msg.email = info[0].email;
            msg.chatId = msg.teacher_id;
            uniqueMessages.push(msg);
        }
    }

    res.status(200).send(uniqueMessages);
});

router.put('/openMessage/:id1/:id2', auth, async (req, res) => {
    if (req.user.isModerator) {
        let sqlResetCounter =
            'UPDATE messages SET counter = ? WHERE teacher_id = ? AND sender_id = ?';
        await db.query(sqlResetCounter, [0, req.params.id1, req.params.id2]);
        res.status(200).send('ok');
    } else {
        let sqlResetCounter =
            'UPDATE messages SET counter = ? WHERE user_id = ? AND sender_id = ?';
        await db.query(sqlResetCounter, [0, req.params.id1, req.params.id2]);
        res.status(200).send('ok');
    }
});

module.exports = router;
