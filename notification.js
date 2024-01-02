const db = require('./db');
const registerLoginNotification = async (user) => {
    let sqlInsertLoginNotification = '';
    if (user.role === 'moderator') {
        sqlInsertLoginNotification =
            'INSERT INTO usernotifications (teacher_id, name, description, type) VALUES (?, ?, ?, ?)';
    } else {
        sqlInsertLoginNotification =
            'INSERT INTO usernotifications (user_id, name, description, type) VALUES (?, ?, ?, ?)';
    }

    try {
        await db.query(sqlInsertLoginNotification, [
            user.id,
            `${user.name} logged in`,
            'You logged again, Welcome back.',
            user.type,
        ]);
    } catch (err) {
        console.log(err);
    }
};

const registerRequestNotification = async ({ name, email, type }) => {
    sqlGetId = 'SELECT * FROM users WHERE isAdmin = ?';
    const [getID] = await db.query(sqlGetId, 1);

    let sqlInsertLoginNotification =
        'INSERT INTO usernotifications (user_id, name, description, type) VALUES (?, ?, ?, ?)';

    try {
        await db.query(sqlInsertLoginNotification, [
            getID[0].id,
            `${name} request to join`,
            `${name} with this email ( ${email} ) sent a join request`,
            type,
        ]);
    } catch (err) {
        console.log(err);
    }
};

module.exports = { registerLoginNotification, registerRequestNotification };
