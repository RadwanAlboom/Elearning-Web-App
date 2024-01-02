const express = require('express');
const router = express.Router();
const db = require('../db');
const mysql = require('mysql2/promise');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const moderatorAdmin = require('../middleware/moderatorAdmin');

//Get Random Courses
router.get('/getRandom', async (req, res) => {
    let sqlGetRandom = `SELECT * FROM courses ORDER BY RAND() LIMIT 3`;
    const [randomCourses] = await db.query(sqlGetRandom);
    res.status(200).send(randomCourses);
});

// Get all majors
router.get('/majors', async (req, res) => {
    let sqlGetMajors = 'SELECT * FROM courses';
    const [majors] = await db.query(sqlGetMajors);
    res.status(200).send(majors);
});

// Get all courses
router.get('/', auth, async (req, res) => {
    let sql = 'SELECT * FROM courses';
    const [rows] = await db.query(sql);
    res.status(200).send(rows);
});

//admin add a new course
router.post('/', [auth, admin], async (req, res, next) => {
    const {
        body: { coursename, description, url },
    } = req;

    let sql = `INSERT INTO courses (name, description, image) VALUES (?, ?, ?)`;
    let newCourse = await db.query(sql, [coursename, description, url]);

    let course = {
        id: newCourse[0].insertId,
        name: coursename,
        description: description,
        image: url,
    };

    res.status(200).send(course);
});

//admin update a course

router.put('/:id', [auth, admin], async (req, res, next) => {
    const {
        body: { coursename, description, url },
    } = req;

    let sql1 = `SELECT * FROM courses WHERE id = ?`;
    const [row] = await db.query(sql1, [req.params.id]);
    const oldCourse = row[0];

    if (coursename !== '') {
        oldCourse.name = coursename;
        let sql = `UPDATE courses SET name = ? WHERE id = ?`;
        await db.query(sql, [coursename, req.params.id]);
    }

    if (description !== '') {
        oldCourse.description = description;
        let sql = `UPDATE courses SET description = ? WHERE id = ?`;
        await db.query(sql, [description, req.params.id]);
    }

    if (url !== '') {
        let sql2 = `UPDATE courses SET image = ? WHERE id = ?`;
        await db.query(sql2, [url, req.params.id]);
        oldCourse.image = url;
    }

    res.status(200).send({ id: req.params.id, newCourse: oldCourse });
});

//admin delete a course

router.delete('/:id', [auth, admin], async (req, res) => {
    let sql2 = `DELETE FROM courses WHERE id = ?`;
    await db.query(sql2, [req.params.id]);

    res.status(200).send({ id: req.params.id });
});

//Get specific major
router.get('/majors/:id', [auth, admin], async (req, res) => {
    let sql = `SELECT * FROM courses WHERE id = ?`;
    const [row] = await db.query(sql, [req.params.id]);
    res.status(200).send(row);
});

//get all teachers

router.get('/teachers', auth, async (req, res) => {
    sqlGetTeachers = 'SELECT * FROM teachers';
    const [teachers] = await db.query(sqlGetTeachers);
    res.status(200).send(teachers);
});

// get all class courses of a specific teacher
router.get('/teachers/classCourses', auth, async (req, res) => {
    let sqlGetClassCourses = 'SELECT * FROM classcourses';
    const [classCourses] = await db.query(sqlGetClassCourses);
    res.status(200).send(classCourses);
});

//admin or moderator add a new class course
router.post(
    '/:id1/teachers/:id2/classCourses',
    [auth, moderatorAdmin],
    async (req, res, next) => {
        const {
            body: { coursename, description, url },
        } = req;

        let sql = `INSERT INTO classcourses (course_id, teacher_id, name, description, image) VALUES (?, ?, ?, ?, ?)`;
        let sqlInserActiveClassCourse =
            'INSERT INTO active (classcourse_id) VALUES (?)';

        const databaseConfigs = {
            host: 'eu-cdbr-west-01.cleardb.com',
            user: 'bc35cbfa307ff4',
            password: '5954f772',
            database: 'heroku_b4b2aa704af1467',
        };
        const connection = await mysql.createConnection(databaseConfigs);

        try {
            await connection.beginTransaction();
            let newClassCourse = await connection.query(sql, [
                req.params.id1,
                req.params.id2,
                coursename,
                description,
                url,
            ]);

            await connection.query(sqlInserActiveClassCourse, [
                newClassCourse[0].insertId,
            ]);

            let classCourse = {
                id: newClassCourse[0].insertId,
                course_id: req.params.id1,
                teacher_id: req.params.id2,
                name: coursename,
                description: description,
                image: url,
            };

            await connection.commit();
            await connection.end();
            res.status(200).send(classCourse);
        } catch (error) {
            console.log(err);
            await connection.rollback();
            await connection.end();
            return res
                .status(500)
                .send('Something goes wrong!, try again later');
        }
    }
);

//admin or moderator update a class course

router.put(
    '/classCourses/:id',
    [auth, moderatorAdmin],
    async (req, res, next) => {
        const {
            body: { coursename, description, url },
        } = req;

        let sql1 = `SELECT * FROM classcourses WHERE id = ?`;
        const [row] = await db.query(sql1, [req.params.id]);
        const oldClassCourse = row[0];

        if (coursename !== '') {
            oldClassCourse.name = coursename;
            let sql = `UPDATE classcourses SET name = ? WHERE id = ?`;
            await db.query(sql, [coursename, req.params.id]);
        }

        if (description !== '') {
            oldClassCourse.description = description;
            let sql = `UPDATE classcourses SET description = ? WHERE id = ?`;
            await db.query(sql, [description, req.params.id]);
        }

        if (url !== '') {
            let sql2 = `UPDATE classcourses SET image = ? WHERE id = ?`;
            await db.query(sql2, [url, req.params.id]);
            oldClassCourse.image = url;
        }

        res.status(200).send({
            id: req.params.id,
            newClassCourse: oldClassCourse,
        });
    }
);

//admin or moderator delete a class course

router.delete('/classCourses/:id', [auth, moderatorAdmin], async (req, res) => {
    let sql2 = `DELETE FROM classcourses WHERE id = ?`;
    await db.query(sql2, [req.params.id]);

    res.status(200).send({ id: req.params.id });
});

// get all chapters
router.get('/units', auth, async (req, res) => {
    let sqlGetUnits = 'SELECT * FROM chapters';
    let [units] = await db.query(sqlGetUnits);
    res.status(200).send(units);
});

// get specific chapters of a specific class course
router.get('/units/:id1/users/:id2', auth, async (req, res) => {
    let sql = 'SELECT * FROM chapters WHERE classcourse_id = ?';
    const [getChapters] = await db.query(sql, [req.params.id1]);

    let sqlGetCounters =
        'SELECT * FROM counters WHERE classcourse_id = ? AND user_id = ?';
    const [counters] = await db.query(sqlGetCounters, [
        req.params.id1,
        req.params.id2,
    ]);

    let sqlGetActive = 'SELECT * FROM active WHERE classcourse_id = ?';
    const [getActive] = await db.query(sqlGetActive, [req.params.id1]);

    if (!getActive[0].isActive) {
        res.status(200).send(getChapters);
    } else {
        if (counters.length === 0) {
            let sqlSetCounter =
                'INSERT INTO counters (classcourse_id, user_id) VALUES (?, ?)';
            await db.query(sqlSetCounter, [req.params.id1, req.params.id2]);
            var slicedChapters = getChapters.slice(0, 1);
            res.status(200).send(slicedChapters);
        } else {
            var slicedChapters = getChapters.slice(0, counters[0].counter);
            res.status(200).send(slicedChapters);
        }
    }
});

//admin or moderator add a new chapter to a specific class course
router.post('/units/:id', [auth, moderatorAdmin], async (req, res, next) => {
    let sql = `INSERT INTO chapters (classcourse_id, name) VALUES (?, ?)`;
    let newChapter = await db.query(sql, [req.params.id, req.body.name]);

    let chapter = {
        id: newChapter[0].insertId,
        name: req.body.name,
        classcourse_id: req.params.id,
    };
    res.status(200).send(chapter);
});

//admin or moderator update a  chapter of a specific class course
router.put('/units/:id', [auth, moderatorAdmin], async (req, res, next) => {
    let { name } = req.body;
    let sql1 = `SELECT * FROM chapters WHERE id = ?`;
    const [row] = await db.query(sql1, [req.params.id]);
    const oldUnit = row[0];

    if (name !== '') {
        oldUnit.name = name;
        let sql = `UPDATE chapters SET name = ? WHERE id = ?`;
        await db.query(sql, [name, req.params.id]);
    }
    res.status(200).send({ id: req.params.id, newUnit: oldUnit });
});

//admin or moderator delete a  chapter of a specific class course

router.delete('/units/:id', [auth, moderatorAdmin], async (req, res) => {
    let sql = `DELETE FROM chapters WHERE id = ?`;
    await db.query(sql, [req.params.id]);
    res.status(200).send({ id: req.params.id });
});

// get all lessons of a specific chapter
router.get('/lessons', auth, async (req, res) => {
    let sqlGetLessons = 'SELECT * FROM lessons';
    const [lessons] = await db.query(sqlGetLessons, [req.params.id]);
    res.status(200).send(lessons);
});

// get all exams of a specific chapter
router.get('/exams', auth, async (req, res) => {
    let sqlGetExams = 'SELECT * FROM exams';
    const [exams] = await db.query(sqlGetExams);
    res.status(200).send(exams);
});

//admin or moderator add a new lesson to a specific chapter
router.post('/lessons/:id', [auth, moderatorAdmin], async (req, res, next) => {
    let sql = `INSERT INTO lessons (chapter_id, name, link) VALUES (?, ?, ?)`;
    let newLesson = await db.query(sql, [
        req.params.id,
        req.body.name,
        req.body.link,
    ]);

    let lesson = {
        id: newLesson[0].insertId,
        name: req.body.name,
        link: req.body.link,
        chapter_id: req.params.id,
    };
    res.status(200).send(lesson);
});

//admin or moderator update a  lesson of a specific chapter
router.put('/lessons/:id', [auth, moderatorAdmin], async (req, res, next) => {
    let { name, link } = req.body;
    let sql1 = `SELECT * FROM lessons WHERE id = ?`;
    const [row] = await db.query(sql1, [req.params.id]);
    const oldLesson = row[0];

    if (name !== '') {
        oldLesson.name = name;
        let sql = `UPDATE lessons SET name = ? WHERE id = ?`;
        await db.query(sql, [name, req.params.id]);
    }

    if (link !== '') {
        oldLesson.link = link;
        let sql = `UPDATE lessons SET link = ? WHERE id = ?`;
        await db.query(sql, [link, req.params.id]);
    }
    res.status(200).send({ id: req.params.id, newLesson: oldLesson });
});

//admin or moderator delete a  lesson of a specific chapter
router.delete('/lessons/:id', [auth, moderatorAdmin], async (req, res) => {
    let sql = `DELETE FROM lessons WHERE id = ?`;
    await db.query(sql, [req.params.id]);
    res.status(200).send({ id: req.params.id });
});

//getting pdf files
router.get('/files', auth, async (req, res) => {
    let sqlGetFiles = 'SELECT * FROM files';
    const [files] = await db.query(sqlGetFiles);
    res.status(200).send(files);
});

//admin or moderator add a new file
router.post('/files/:id', [auth, moderatorAdmin], async (req, res, next) => {
    const {
        body: { name, url },
    } = req;

    let sql = `INSERT INTO files (chapter_id ,name, link) VALUES (?, ?, ?)`;
    let newFile = await db.query(sql, [req.params.id, name, url]);

    let newInsertedFile = {
        id: newFile[0].insertId,
        name: name,
        link: url,
    };

    res.status(200).send(newInsertedFile);
});

//admin or moderator update a file

router.put('/files/:id', [auth, moderatorAdmin], async (req, res, next) => {
    const {
        body: { name, url },
    } = req;

    let sql1 = `SELECT * FROM files WHERE id = ?`;
    const [row] = await db.query(sql1, [req.params.id]);
    const oldFile = row[0];

    if (name !== '') {
        oldFile.name = name;
        let sql = `UPDATE files SET name = ? WHERE id = ?`;
        await db.query(sql, [name, req.params.id]);
    }

    if (url !== '') {
        let sql2 = `UPDATE files SET link = ? WHERE id = ?`;
        await db.query(sql2, [url, req.params.id]);
        oldFile.link = url;
    }

    res.status(200).send({ id: req.params.id, newFile: oldFile });
});

//admin  or moderator delete a file

router.delete('/files/:id', [auth, moderatorAdmin], async (req, res) => {
    let sql2 = `DELETE FROM files WHERE id = ?`;
    await db.query(sql2, [req.params.id]);

    res.status(200).send({ id: req.params.id });
});

// user get course curriculum
router.get('/classCurriculum/:id', auth, async (req, res) => {
    let sqlGetChapters = 'SELECT * FROM chapters WHERE classcourse_id = ?';
    const [chapters] = await db.query(sqlGetChapters, [req.params.id]);
    res.status(200).send(chapters);
});

// user get lessons for course curriculum
router.get('/classCurriculum/chapters/:id', auth, async (req, res) => {
    let sqlGetLessons = 'SELECT * FROM lessons WHERE chapter_id = ?';
    const [lessons] = await db.query(sqlGetLessons, [req.params.id]);
    res.status(200).send(lessons);
});

//User gets Zoom Links
router.get('/classCourses/links/:id', auth, async (req, res) => {
    let sqlGetLinks = 'SELECT * FROM zoomlinks WHERE classcourse_id = ?';
    const [links] = await db.query(sqlGetLinks, [req.params.id]);
    res.status(200).send(links);
});

//admin and teacher add new Zoom Links
router.post(
    '/classCourses/links/:id',
    [auth, moderatorAdmin],
    async (req, res) => {
        let sqlInsertLinks =
            'INSERT INTO zoomlinks (classcourse_id, subject, link) VALUES (?, ?, ?)';
        let sqlGetLink = 'SELECT * FROM zoomlinks WHERE id= ?';
        const newLink = await db.query(sqlInsertLinks, [
            req.params.id,
            req.body.subject,
            req.body.link,
        ]);
        const [getLink] = await db.query(sqlGetLink, [newLink[0].insertId]);
        res.status(200).send(getLink[0]);
    }
);

//admin and teacher update Zoom Links
router.put(
    '/classCourses/links/:id',
    [auth, moderatorAdmin],
    async (req, res) => {
        let { subject, link } = req.body;

        let sql1 = `SELECT * FROM zoomlinks WHERE id = ?`;
        const [row] = await db.query(sql1, [req.params.id]);
        const oldLink = row[0];

        if (subject !== '') {
            oldLink.subject = subject;
            let sql = `UPDATE zoomlinks SET subject = ? WHERE id = ?`;
            await db.query(sql, [subject, req.params.id]);
        }

        if (link !== '') {
            oldLink.link = link;
            let sql = `UPDATE zoomlinks SET link = ? WHERE id = ?`;
            await db.query(sql, [link, req.params.id]);
        }

        oldLink.date = new Date().toISOString().slice(0, 19);
        res.status(200).send({ id: req.params.id, newLink: oldLink });
    }
);

//admin or moderator delete a  zoom link of a specific class course
router.delete(
    '/classCourses/links/:id',
    [auth, moderatorAdmin],
    async (req, res) => {
        let sql = `DELETE FROM zoomlinks WHERE id = ?`;
        await db.query(sql, [req.params.id]);
        res.status(200).send({ id: req.params.id });
    }
);

//admin or moderator get active status of a class course
router.get(
    '/classCourses/active/:id',
    [auth, moderatorAdmin],
    async (req, res) => {
        let sqlGetActive = 'SELECT * FROM active WHERE classcourse_id = ?';
        const [getActive] = await db.query(sqlGetActive, [req.params.id]);
        res.status(200).send({ value: getActive[0].isActive });
    }
);

//admin or moderator active or deactive exam feature
router.put(
    '/classCourses/active/:id',
    [auth, moderatorAdmin],
    async (req, res) => {
        let sqlSetActive =
            'UPDATE active SET isActive = ? WHERE classcourse_id = ?';
        await db.query(sqlSetActive, [req.body.value, req.params.id]);
        res.status(200).send('ok');
    }
);

module.exports = router;
