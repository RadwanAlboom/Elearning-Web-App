const mysql = require('mysql2');
// create the pool
const pool = mysql.createPool({
    host: 'student-database.cpcu66omk4jt.eu-central-1.rds.amazonaws.com',
    user: 'radwan',
    password: 'aboalrood123$',
    database: 'app_student_db',
});
// now get a Promise wrapped instance of that pool
const promisePool = pool.promise();

module.exports = promisePool;
