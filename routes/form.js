const express = require('express');
const _ = require('lodash');
const router = express.Router();
const mysql = require('mysql2/promise');
const db = require('../db');
const moderatorAdmin = require('../middleware/moderatorAdmin');
const admin = require('../middleware/admin');
const auth = require('../middleware/auth');

//user get exam previews to know exam status

router.get('/user/exampreviews/:id', auth, async (req, res) => {
    let sql1 = 'SELECT * FROM exampreviews WHERE user_id = ?';
    let [row1] = await db.query(sql1, [req.params.id]);
    res.status(200).send(row1);
});

//user get exam preview
router.get('/exam/review/:id', auth, async (req, res) => {
    let sql1 = 'SELECT * FROM exampreviews WHERE id = ?';
    let sql2 = 'SELECT * FROM questionspreview WHERE previewexam_id = ?';
    let sql3 = 'SELECT * FROM optionspreview WHERE questionpreview_id = ?';

    let [row1] = await db.query(sql1, [req.params.id]);
    let [row2] = await db.query(sql2, [req.params.id]);

    for (var question of row2) {
        let [row3] = await db.query(sql3, [question.id]);
        question.options = row3;
    }

    res.status(200).send({
        name: row1[0].name,
        successRate: row1[0].successRate,
        actualSuccessRate: row1[0].actualSuccessRate,
        grade: row1[0].grade,
        actualGrade: row1[0].actualGrade,
        description: row1[0].description,
        questions: row2,
    });
});

//user get
router.get('/exams/:id/user/:id2', auth, async (req, res) => {
    let sqlCheckStatus =
        'SELECT * FROM exampreviews WHERE exam_id = ? AND user_id = ? AND status = ?';
    let [checkStatus] = await db.query(sqlCheckStatus, [
        req.params.id,
        req.params.id2,
        true,
    ]);
    if (checkStatus.length > 0) {
        return res.status(400).send('You already pass the exam');
    }

    let sql1 = 'SELECT * FROM exams WHERE id = ?';
    let sql2 = 'SELECT * FROM questions WHERE exam_id = ?';
    let sql3 = 'SELECT * FROM options WHERE question_id = ?';

    let [row1] = await db.query(sql1, [req.params.id]);
    let [row2] = await db.query(sql2, [req.params.id]);

    let newQuestions = [];

    for (var question of row2) {
        let [row3] = await db.query(sql3, [question.id]);
        question.options = row3;
        let newQuestion = _.pick(question, [
            'questionText',
            'questionType',
            'points',
            'options',
        ]);
        newQuestions.push(newQuestion);
    }

    res.status(200).send({
        name: row1[0].name,
        successRate: row1[0].successRate,
        description: row1[0].description,
        questions: newQuestions,
    });
});

//user submit the exam
router.put(
    '/users/:id1/classCourses/:id2/exams/:id3/submit',
    auth,
    async (req, res) => {
        const databaseConfigs = {
            host: 'eu-cdbr-west-01.cleardb.com',
            user: 'bc35cbfa307ff4',
            password: '5954f772',
            database: 'heroku_b4b2aa704af1467',
        };

        let sql1 = 'SELECT * FROM exams WHERE id = ?';
        let sql2 = 'SELECT * FROM questions WHERE exam_id = ?';
        let sql3 = 'SELECT * FROM options WHERE question_id = ?';

        let [row1] = await db.query(sql1, [req.params.id3]);
        let [row2] = await db.query(sql2, [req.params.id3]);

        for (var question of row2) {
            let [row3] = await db.query(sql3, [question.id]);
            question.options = row3;
        }

        let grade = 0;
        let totalPoints = 0;
        const userAnswers = req.body.questions;
        const realAnswers = row2;

        for (var i = 0; i < realAnswers.length; i++) {
            if (!userAnswers[i].answerKey) userAnswers[i].answerKey = '';
            totalPoints += realAnswers[i].points;
            if (realAnswers[i].answerKey === userAnswers[i].answerKey) {
                grade += realAnswers[i].points;
                userAnswers[i].actualPoints = realAnswers[i].points;
            } else {
                userAnswers[i].actualPoints = 0;
            }
        }

        let gradePercent = (grade / totalPoints) * 100;

        let sqlGetCounter =
            'SELECT * FROM counters WHERE user_id = ? AND classcourse_id = ?';
        let [counter] = await db.query(sqlGetCounter, [
            req.params.id1,
            req.params.id2,
        ]);

        if (counter.length === 0) {
            let sqlPutCounter =
                'INSERT INTO counters (user_id, classcourse_id) VALUES (?, ?)';

            await db.query(sqlPutCounter, [req.params.id1, req.params.id2]);
        }

        if (gradePercent >= row1[0].successRate) {
            //Increment counter &
            let sqlIncCounter = 'UPDATE counters SET counter = ? WHERE id = ?';

            //Store exam preview
            let sqlExamPreview =
                'INSERT INTO exampreviews (user_id, teacher_id, exam_id, name, studentName, description, successRate, actualSuccessRate, grade, actualGrade, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

            let sqlQuestionPreview =
                'INSERT INTO questionspreview (previewexam_id, questionText, answerKey, actualAnswerKey, questionType, points, actualPoints, feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

            let sqlOptionPreview =
                'INSERT INTO optionspreview (questionpreview_id, optionText) VALUES (?, ?)';

            let sqlInsertNotification =
                'INSERT INTO usernotifications (user_id, exam_id, name, description) VALUES (?, ?, ?, ?)';
            let sqlGetNotification =
                'SELECT * FROM usernotifications where id = ?';

            const connection = await mysql.createConnection(databaseConfigs);
            try {
                //Increment Counter
                await connection.beginTransaction();
                let [rowCounter] = await connection.query(sqlGetCounter, [
                    req.params.id1,
                    req.params.id2,
                ]);

                await connection.query(sqlIncCounter, [
                    rowCounter[0].counter + 1,
                    rowCounter[0].id,
                ]);

                //Store Exam Preview

                const newExamPreview = await connection.query(sqlExamPreview, [
                    req.params.id1,
                    req.body.teacherId,
                    req.params.id3,
                    row1[0].name,
                    req.body.studentName,
                    row1[0].description,
                    gradePercent,
                    row1[0].successRate,
                    grade,
                    totalPoints,
                    true,
                ]);
                for (var i = 0; i < realAnswers.length; i++) {
                    const newQuestion = await connection.query(
                        sqlQuestionPreview,
                        [
                            newExamPreview[0].insertId,
                            realAnswers[i].questionText,
                            userAnswers[i].answerKey,
                            realAnswers[i].answerKey,
                            realAnswers[i].questionType,
                            userAnswers[i].actualPoints,
                            realAnswers[i].points,
                            `The correct answer: ${realAnswers[i].answerKey}`,
                        ]
                    );

                    for (var option of realAnswers[i].options) {
                        await connection.query(sqlOptionPreview, [
                            newQuestion[0].insertId,
                            option.optionText,
                        ]);
                    }
                }
                await connection.commit();
                await connection.end();
            } catch (err) {
                console.log(err);
                await connection.rollback();
                await connection.end();
                return res
                    .status(500)
                    .send('Something goes wrong!, try again later');
            }

            let newNotification = await db.query(sqlInsertNotification, [
                req.params.id1,
                req.params.id3,
                row1[0].name,
                'Congratulations, you passed the exam, the next chapter has been opened',
            ]);

            let getNewNotification = await db.query(sqlGetNotification, [
                newNotification[0].insertId,
            ]);

            res.status(200).send(getNewNotification[0]);
        } else {
            //Store exam preview
            let sqlExamPreview =
                'INSERT INTO exampreviews (user_id, teacher_id, exam_id, name, studentName, description, successRate, actualSuccessRate, grade, actualGrade, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            let sqlQuestionPreview =
                'INSERT INTO questionspreview (previewexam_id, questionText, answerKey, actualAnswerKey, questionType, points, actualPoints, feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

            let sqlOptionPreview =
                'INSERT INTO optionspreview (questionpreview_id, optionText) VALUES (?, ?)';
            let sqlInsertNotification =
                'INSERT INTO usernotifications (user_id, exam_id, name, description) VALUES (?, ?, ?, ?)';

            let sqlGetNotification =
                'SELECT * FROM usernotifications where id = ?';

            //Store Exam Preview //////////////////
            const connection = await mysql.createConnection(databaseConfigs);
            try {
                //Store Exam Preview without increment counter

                const newExamPreview = await connection.query(sqlExamPreview, [
                    req.params.id1,
                    req.body.teacherId,
                    req.params.id3,
                    row1[0].name,
                    req.body.studentName,
                    row1[0].description,
                    gradePercent,
                    row1[0].successRate,
                    grade,
                    totalPoints,
                    false,
                ]);
                for (var i = 0; i < realAnswers.length; i++) {
                    const newQuestion = await connection.query(
                        sqlQuestionPreview,
                        [
                            newExamPreview[0].insertId,
                            realAnswers[i].questionText,
                            userAnswers[i].answerKey,
                            realAnswers[i].answerKey,
                            realAnswers[i].questionType,
                            userAnswers[i].actualPoints,
                            realAnswers[i].points,
                            `The correct answer: ${realAnswers[i].answerKey}`,
                        ]
                    );

                    for (var option of realAnswers[i].options) {
                        await connection.query(sqlOptionPreview, [
                            newQuestion[0].insertId,
                            option.optionText,
                        ]);
                    }
                }
                await connection.commit();
                await connection.end();
            } catch (err) {
                console.log(err);
                await connection.rollback();
                await connection.end();
                return res
                    .status(500)
                    .send('Something goes wrong!, try again later');
            }

            //////////////////////////////////////

            let newNotification = await db.query(sqlInsertNotification, [
                req.params.id1,
                req.params.id3,
                row1[0].name,
                "You fail in this exam, don't give up and try again",
            ]);

            let getNewNotification = await db.query(sqlGetNotification, [
                newNotification[0].insertId,
            ]);

            res.status(200).send(getNewNotification[0]);
        }
    }
);

//admin or moderator get

router.get('/exams/:id', [auth, moderatorAdmin], async (req, res) => {
    let sql1 = 'SELECT * FROM exams WHERE id = ?';
    let sql2 = 'SELECT * FROM questions WHERE exam_id = ?';
    let sql3 = 'SELECT * FROM options WHERE question_id = ?';

    let [row1] = await db.query(sql1, [req.params.id]);
    let [row2] = await db.query(sql2, [req.params.id]);

    for (var question of row2) {
        let [row3] = await db.query(sql3, [question.id]);
        question.options = row3;
    }

    res.status(200).send({
        name: row1[0].name,
        successRate: row1[0].successRate,
        description: row1[0].description,
        questions: row2,
    });
});

//admin or moderator creates new exam
router.post('/chapters/:id/exams', [auth, moderatorAdmin], async (req, res) => {
    const { name, description, questions, successRate } = req.body;
    const databaseConfigs = {
        host: 'eu-cdbr-west-01.cleardb.com',
        user: 'bc35cbfa307ff4',
        password: '5954f772',
        database: 'heroku_b4b2aa704af1467',
    };

    const connection = await mysql.createConnection(databaseConfigs);

    let sql1 =
        'INSERT INTO exams (chapter_id, name, description, successRate) VALUES (?, ?, ?, ?)';

    let sql2 =
        'INSERT INTO questions (exam_id, questionText, answer, answerKey, questionType, points, open, required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

    let sql3 = 'INSERT INTO options (question_id, optionText) VALUES (?, ?)';

    try {
        await connection.beginTransaction();
        const newExam = await connection.query(sql1, [
            req.params.id,
            name,
            description,
            successRate,
        ]);
        for (var question of questions) {
            const newQuestion = await connection.query(sql2, [
                newExam[0].insertId,
                question.questionText,
                question.answer,
                question.answerKey,
                question.questionType,
                question.points,
                question.open,
                question.required,
            ]);

            for (var option of question.options) {
                await connection.query(sql3, [
                    newQuestion[0].insertId,
                    option.optionText,
                ]);
            }
        }

        await connection.commit();
        await connection.end();
        return res.status(200).send('ok');
    } catch (err) {
        await connection.rollback();
        await connection.end();
        return res.status(500).send('Something goes wrong!, try again later');
    }
});

//admin or moderator update exams
router.put(
    '/chapters/:id/exams/:id2',
    [auth, moderatorAdmin],
    async (req, res) => {
        const { name, description, questions, successRate } = req.body;
        const databaseConfigs = {
            host: 'eu-cdbr-west-01.cleardb.com',
            user: 'bc35cbfa307ff4',
            password: '5954f772',
            database: 'heroku_b4b2aa704af1467',
        };
        const connection = await mysql.createConnection(databaseConfigs);

        let sql = `DELETE FROM exams WHERE id = ?`;

        let sql1 =
            'INSERT INTO exams (id, chapter_id, name, description, successRate) VALUES (?, ?, ?, ?, ?)';

        let sql2 =
            'INSERT INTO questions (exam_id, questionText, answer, answerKey, questionType, points, open, required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

        let sql3 =
            'INSERT INTO options (question_id, optionText) VALUES (?, ?)';

        try {
            await connection.beginTransaction();
            await connection.query(sql, [req.params.id2]);
            const newExam = await connection.query(sql1, [
                req.params.id2,
                req.params.id,
                name,
                description,
                successRate,
            ]);
            for (var question of questions) {
                const newQuestion = await connection.query(sql2, [
                    newExam[0].insertId,
                    question.questionText,
                    question.answer,
                    question.answerKey,
                    question.questionType,
                    question.points,
                    question.open,
                    question.required,
                ]);

                for (var option of question.options) {
                    await connection.query(sql3, [
                        newQuestion[0].insertId,
                        option.optionText,
                    ]);
                }
            }

            await connection.commit();
            await connection.end();
            return res.status(200).send('ok');
        } catch (err) {
            console.log(err);
            await connection.rollback();
            await connection.end();
            return res
                .status(500)
                .send('Something goes wrong!, try again later');
        }
    }
);

router.get('/examPreviews/:id', auth, async (req, res) => {
    let sqlExamPreviews = 'SELECT * FROM exampreviews WHERE user_id = ?';
    let [examPreviews] = await db.query(sqlExamPreviews, [req.params.id]);
    res.status(200).send(examPreviews);
});

//teacher get exams previews of students
router.get(
    '/moderator/examPreviews/:id',
    [auth, moderatorAdmin],
    async (req, res) => {
        let sqlExamPreviews = 'SELECT * FROM exampreviews WHERE teacher_id = ?';
        let [examPreviews] = await db.query(sqlExamPreviews, [req.params.id]);
        res.status(200).send(examPreviews);
    }
);

//teacher get  for exporting
router.get('/moderator/exams/:id', [auth, moderatorAdmin], async (req, res) => {
    let sqlExams =
        'SELECT id, name, description, exam_id FROM exampreviews WHERE teacher_id = ?';
    let [exams] = await db.query(sqlExams, [req.params.id]);
    const uniqueExams = _.uniqBy(exams, 'exam_id');
    res.status(200).send(uniqueExams);
});

//teacher get  for exporting
router.get(
    '/moderator/exportExam/:id',
    [auth, moderatorAdmin],
    async (req, res) => {
        let sqlExamPreviews = 'SELECT * FROM exampreviews WHERE exam_id = ?';
        let [examPreviews] = await db.query(sqlExamPreviews, [req.params.id]);
        res.status(200).send(examPreviews);
    }
);

//admin get all exams previews of students
router.get('/admin/examPreviews/', [auth, admin], async (req, res) => {
    let sqlExamPreviews = 'SELECT * FROM exampreviews';
    let [examPreviews] = await db.query(sqlExamPreviews);
    res.status(200).send(examPreviews);
});

//admin or moderator delete an exam
router.delete('/exams/:id', [auth, moderatorAdmin], async (req, res) => {
    let sqlDeleteForm = `DELETE FROM exams WHERE id = ?`;

    await db.query(sqlDeleteForm, [req.params.id]);

    res.status(200).send({ id: req.params.id });
});

module.exports = router;
