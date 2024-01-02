const express = require('express');
const AWS = require('aws-sdk');
const stream = require('stream');
const bcrypt = require('bcrypt');
const router = express.Router();
const multer = require('multer');
const db = require('../db');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);
const auth = require('../middleware/auth');
const config = require('../config.json');

const upload = multer();

router.get('/:id', auth, async (req, res) => {
    if (req.user.isModerator) {
        let sqlGetProfile = 'SELECT * FROM teachers WHERE id= ?';
        let sqlGetMajor = 'SELECT * FROM courses WHERE id = ?';

        const [profile] = await db.query(sqlGetProfile, [req.params.id]);
        const [course] = await db.query(sqlGetMajor, [profile[0].course_id]);
        profile[0].major = course[0].name;
        res.status(200).send(profile[0]);
    } else {
        let sqlGetProfile = 'SELECT * FROM users WHERE id= ?';
        const [profile] = await db.query(sqlGetProfile, [req.params.id]);
        res.status(200).send(profile[0]);
    }
});
router.get('/recevier/:id', auth, async (req, res) => {
    if (req.user.isModerator) {
        let sqlGetProfile = 'SELECT * FROM users WHERE id= ?';
        const [profile] = await db.query(sqlGetProfile, [req.params.id]);
        res.status(200).send(profile[0]);
    } else {
        let sqlGetProfile = 'SELECT * FROM teachers WHERE id= ?';
        let sqlGetMajor = 'SELECT * FROM courses WHERE id = ?';

        const [profile] = await db.query(sqlGetProfile, [req.params.id]);
        const [course] = await db.query(sqlGetMajor, [profile[0].course_id]);
        profile[0].major = course[0].name;
        res.status(200).send(profile[0]);
    }
});

router.get('/teacher/:id', auth, async (req, res) => {
    let sqlGetProfile = 'SELECT * FROM teachers WHERE id= ?';
    let sqlGetMajor = 'SELECT * FROM courses WHERE id = ?';

    const [profile] = await db.query(sqlGetProfile, [req.params.id]);
    const [course] = await db.query(sqlGetMajor, [profile[0].course_id]);
    profile[0].major = course[0].name;
    res.status(200).send(profile[0]);
});

router.put('/:id', auth, upload.single('file'), async (req, res) => {
    const { file } = req;

    if (file.detectedFileExtension != '.jpg')
        return res.status(400).send('Inavlid image file');

    const fileName = Date.now() + path.extname(file.originalName);

    var configAWS = {
        accessKeyId: 'AKIAYHJKS6SJ6ANOYY7S',
        secretAccessKey: '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',
    };

    AWS.config.update(configAWS);

    let s3 = new AWS.S3();

    //save image to DB
    async function saveImgToDB(url) {
        //if teacher
        if (req.user.isModerator) {
            let sqlGetProfile = 'SELECT * FROM teachers WHERE id= ?';
            const [profile] = await db.query(sqlGetProfile, [req.params.id]);
            let prevoiusImgId = profile[0].imageId;

            if (prevoiusImgId) {
                let sqlUpdateImage = `UPDATE teachers SET image = ?, imageId = ?  WHERE id = ?`;
                await db.query(sqlUpdateImage, [url, fileName, req.params.id]);

                var params = {
                    Bucket: 'videos-storing',
                    Key: `profile/${prevoiusImgId}`,
                };

                s3.deleteObject(params, function (err, data) {
                    if (err) res.status(500).send('Try again later!');
                    else res.status(200).send({ newImg: url });
                });
            } else {
                let sqlUpdateImage = `UPDATE teachers SET image = ?, imageId = ?  WHERE id = ?`;
                await db.query(sqlUpdateImage, [url, fileName, req.params.id]);
                res.status(200).send({ newImg: url });
            }

            // if user
        } else {
            let sqlGetProfile = 'SELECT * FROM users WHERE id= ?';
            const [profile] = await db.query(sqlGetProfile, [req.params.id]);
            let prevoiusImgId = profile[0].imageId;

            if (prevoiusImgId) {
                let sqlUpdateImage = `UPDATE users SET image = ?, imageId = ?  WHERE id = ?`;
                await db.query(sqlUpdateImage, [url, fileName, req.params.id]);

                var params = {
                    Bucket: 'videos-storing',
                    Key: `profile/${prevoiusImgId}`,
                };

                s3.deleteObject(params, function (err, data) {
                    if (err) res.status(500).send('Try again later!');
                    else res.status(200).send({ newImg: url });
                });
            } else {
                let sqlUpdateImage = `UPDATE users SET image = ?, imageId = ?  WHERE id = ?`;
                await db.query(sqlUpdateImage, [url, fileName, req.params.id]);
                res.status(200).send({ newImg: url });
            }
        }
    }
    //upload image to aws s3
    async function uploadReadableStream(stream) {
        var params = {
            Bucket: 'videos-storing',
            Key: `profile/${fileName}`,
            Body: stream,
            ACL: 'public-read-write',
        };
        var options = { partSize: 10 * 1024 * 1024, queueSize: 1 };
        s3.upload(params, options, function (err, data) {
            if (err) res.status(500).send('Try again later!');
            else {
                saveImgToDB(data.Location);
            }
        }).on('httpUploadProgress', (progress) => {});
    }

    async function upload() {
        const readable = fs.createReadStream(file.path);
        const results = await uploadReadableStream(readable);
    }

    upload();
});

router.put('/password/:id', auth, async (req, res) => {
    const salt = await bcrypt.genSalt(10);
    req.body.password = await bcrypt.hash(req.body.password, salt);
    if (req.user.isModerator) {
        let sqlUpdatePass = `UPDATE teachers SET password = ? WHERE id = ?`;
        await db.query(sqlUpdatePass, [req.body.password, req.params.id]);
    } else {
        let sqlUpdatePass = `UPDATE users SET password = ? WHERE id = ?`;
        await db.query(sqlUpdatePass, [req.body.password, req.params.id]);
    }
    res.status(200).send('ok');
});

// function removeFile(filePath) {
//     fs.unlink(filePath, function (err) {
//         let error = null;
//         if (err && err.code == 'ENOENT') {
//             // file doens't exist
//             console.info("File doesn't exist, won't remove it.");
//             error = err;
//         } else if (err) {
//             // other errors, e.g. maybe we don't have enough permission
//             console.error('Error occurred while trying to remove file');
//             error = err;
//         }

//         return error;
//     });
// }

module.exports = router;
