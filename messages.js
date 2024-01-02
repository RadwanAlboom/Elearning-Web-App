const db = require('./db');

const saveMsg = async (senderId, senderName, receiverId, isModerator, text) => {
    let sqlInsertMsg = '';
    if (isModerator) {
        sqlInsertMsg =
            'INSERT INTO messages (teacher_id, user_id, sender_id,receiver_id, senderName, text) VALUES (?, ?, ?, ?, ?, ?)';
    } else {
        sqlInsertMsg =
            'INSERT INTO messages (user_id, teacher_id, sender_id,receiver_id, senderName, text) VALUES (?, ?, ?, ?, ?, ?)';
    }
    try {
        let newMsg = await db.query(sqlInsertMsg, [
            senderId,
            receiverId,
            senderId,
            receiverId,
            senderName,
            text,
        ]);

        let sqlGetNewMsg = 'SELECT * FROM messages WHERE id = ?';
        let [fetchedNewMsg] = await db.query(sqlGetNewMsg, [
            newMsg[0].insertId,
        ]);

        return fetchedNewMsg[0];
    } catch (error) {
        console.log(error);
    }
};

const saveChat = async (classcourse_id, name, text) => {
    try {
        let sqlSaveChat =
            'INSERT into chatcord (classcourse_id, name, text) VALUES (?, ?, ?)';
        let newChat = await db.query(sqlSaveChat, [classcourse_id, name, text]);

        let sqlGetChat = 'SELECT * FROM chatcord WHERE id = ?';
        let [fetchedNewChat] = await db.query(sqlGetChat, [
            newChat[0].insertId,
        ]);

        return fetchedNewChat[0];
    } catch (error) {
        console.log(error);
    }
};

module.exports = { saveMsg, saveChat };
