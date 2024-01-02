const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/:id', auth, async (req, res) => {
    let sqlGetChats = 'SELECT * FROM chatcord WHERE classcourse_id = ?';
    const [chats] = await db.query(sqlGetChats, [req.params.id]);
    res.status(200).send(chats);
});

module.exports = router;
