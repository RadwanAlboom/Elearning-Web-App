let users = [];

// Join user to chat
function userJoin(id, username, room) {
    const user = { id, username, room };
    let isExist = users.some(
        (user) => user.id + '' === id + '' && user.room + '' === room + ''
    );

    if (!isExist) {
        users.push(user);
        return {
            exist: false,
            userChat: user,
        };
    } else {
        return {
            exist: true,
        };
    }
}

// Get current user
function getCurrentUser(id) {
    return users.find((user) => user.id + '' === id + '');
}

// User leaves chat
function userLeave(id) {
    users = users.filter((user) => user.id + '' !== id + '');
}

// User leaves a room
function userLeaveRoom(id, room) {
    users = users.filter((user) => {
        return user.id + '' !== id + '' && user.room + '' === room + '';
    });
}

// Get room users
function getRoomUsers(room) {
    return users.filter((user) => user.room + '' === room + '' + '');
}

module.exports = {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers,
    userLeaveRoom,
};
