module.exports = function (err, req, res, next) {
    console.log(err);
    res.status(500).send('An unexpected error occurred. Try again later!');
};
