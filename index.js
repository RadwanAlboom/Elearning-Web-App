require('express-async-errors');
const http = require('http');
const https = require('https');
const error = require('./middleware/error');
var cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const app = express();
const courses = require('./routes/courses');
const auth = require('./routes/auth');
const { v4: uuidv4 } = require('uuid');
const userRequests = require('./routes/userRequests');
const form = require('./routes/form');
const messages = require('./routes/messages');
const profile = require('./routes/profile');
const email = require('./routes/email');
const usersRoutes = require('./routes/users');
const teachers = require('./routes/teachers');
const chatCord = require('./routes/chatCord');
const fs = require('fs');
const { saveMsg, saveChat } = require('./messages');

const key = fs.readFileSync('private.key');
const cert = fs.readFileSync('certificate.crt');

const cred = {key, cert};

const {
    userJoin,
    userLeaveRoom,
    userLeave,
    getRoomUsers,
} = require('./utils/userChat');

const {
    registerLoginNotification,
    registerRequestNotification,
} = require('./notification');

options = {};

const server = http.createServer(app);
const io = require('socket.io')(server, options);

app.use(cors());

let users = [];

const addUser = (userId, socketId) => {
    !users.some((user) => user.userId === userId) &&
        users.push({ userId, socketId });
};

const removeUser = (userId) => {
    users = users.filter((user) => user.userId !== userId);
};

const getUser = (userId) => {
    return users.find((user) => user.userId === userId);
};

io.on('connect', (socket) => {
    // --------------Chat Cord-------------------//
    socket.on('joinRoom', async ({ id, username, room }) => {
        const user = userJoin(id, username, room);

        if (user.exist) {
            io.to(room).emit('roomUsers', {
                room,
                users: getRoomUsers(room),
            });
            return;
        }

        socket.join(user.userChat.room);

        let text = `${username} has joined the chat`;
        let savedChat = await saveChat(room, username, text);

        // Broadcast when a user connects
        io.to(user.userChat.room).emit('message', savedChat);

        // Send users and room info
        io.to(user.userChat.room).emit('roomUsers', {
            room: user.userChat.room,
            users: getRoomUsers(user.userChat.room),
        });
    });

    // Listen for chatMessage
    socket.on('chatMessage', async ({ room, username, msg }) => {
        let savedChat = await saveChat(room, username, msg);
        io.to(room).emit('message', savedChat);
    });

    socket.on('leaveChat', async ({ id, username, room }) => {
        userLeaveRoom(id, room);
        let msg = `${username} has left the chat`;
        let savedChat = await saveChat(room, username, msg);
        io.to(room).emit('message', savedChat);

        // Send users and room info
        io.to(room).emit('roomUsers', {
            room,
            users: getRoomUsers(room),
        });
    });

    // --------------Messenger Chat-------------------//
    socket.on('courses', ({ payload }, callback) => {
        io.emit('courses', payload);
    });

    socket.on('classCourses', ({ payload }, callback) => {
        io.emit('classCourses', payload);
    });

    socket.on('chapters', ({ payload }, callback) => {
        io.emit('chapters', payload);
    });

    socket.on('lessons', ({ payload }, callback) => {
        io.emit('lessons', payload);
    });

    socket.on('exams', ({ payload }, callback) => {
        io.emit('exams', payload);
    });

    socket.on('files', ({ payload }, callback) => {
        io.emit('files', payload);
    });
    socket.on('acceptTeacher', ({ payload }, callback) => {
        io.emit('acceptTeacher', payload);
    });

    socket.on('loginNotifications', ({ payload }) => {
        registerLoginNotification(payload);
    });

    socket.on('insertRequestNotification', ({ payload }) => {
        registerRequestNotification(payload);
        io.emit('insertRequestNotification', payload);
    });

    socket.on('requests', ({ payload }) => {
        io.emit('requests', payload);
    });

    socket.on('students', ({ id }) => {
        io.emit('students', { id });
    });

    socket.on('teachers', ({ id }) => {
        io.emit('teachers', { id });
    });

    socket.on('openNotification', ({ payload }, callback) => {
        io.emit('openNotification', payload);
    });

    socket.on('imageUpdated', ({ payload }, callback) => {
        io.emit('imageUpdated', {});
    });

    socket.on('zoomLink', ({ payload }, callback) => {
        io.emit('zoomLink', payload);
    });

    //send and get message
    socket.on('sendMessage', async ({ sender, receiver }) => {
        const {
            senderId,
            senderName,
            receiverId,
            chatId,
            email,
            image,
            name,
            isModerator,
            text,
        } = receiver;
        let person = {};
        if (isModerator) {
            person = {
                user_id: receiverId,
                teacher_id: senderId,
                sender_id: receiverId,
                senderName: name,
                text,
                date: '',
                name: senderName,
                image,
                email,
                chatId: senderId,
                counter: 1,
            };
        } else {
            person = {
                user_id: senderId,
                teacher_id: receiverId,
                sender_id: receiverId,
                senderName: name,
                text,
                date: '',
                name: senderName,
                image,
                email,
                chatId: senderId,
                counter: 1,
            };
        }

        const recevieUser = getUser(receiverId);
        const senderUser = getUser(senderId);
        let savedMsg = await saveMsg(
            senderId,
            senderName,
            receiverId,
            isModerator,
            text
        );

        if (!senderUser) return;
        io.to(senderUser.socketId).emit('senderMessage', { savedMsg, sender });

        if (!recevieUser) return;
        io.to(recevieUser.socketId).emit('getMessage', {
            savedMsg,
            person,
        });
    });

    //when disconnect
    socket.on('RefreshSocketIds', ({ userId }) => {
        userLeave(userId);
        removeUser(userId);
        addUser(userId, socket.id);
        io.emit('getUsers', users);
    });
});

app.use(express.static(__dirname + '/uploads'));
app.use(express.json());
app.use(helmet());
app.use(compression());

app.use('/api/courses', courses);
app.use('/api/users', usersRoutes);
app.use('/api/teachers', teachers);
app.use('/api/userRequest', userRequests);
app.use('/api/messages', messages);
app.use('/api/chatCord', chatCord);
app.use('/api/profile', profile);
app.use('/api/email', email);
app.use('/api/form', form);
app.use('/api/auth', auth);

app.use(error);
const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Listening on port ${port}...`));

const httpsServer = https.createServer(cred, app);
httpsServer.listen(8443);
