const mysql = require('mysql2');
// create the pool
const pool = mysql.createPool({
    host: 'eu-cdbr-west-01.cleardb.com',
    user: 'bc35cbfa307ff4',
    password: '5954f772',
    database: 'heroku_b4b2aa704af1467',
});
// now get a Promise wrapped instance of that pool
const promisePool = pool.promise();

module.exports = promisePool;
