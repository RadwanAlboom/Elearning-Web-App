const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

router.post('/', (req, res) => {
    const { name, city, email, phone, message } = req.body;
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'radwanalboom@gmail.com',
            pass: 'helloradwan@',
        },
    });

    const mailOptions = {
        from: `<${email}>`,
        to: `radwanalboom@gmail.com`,
        cc: `${name} <${email}>`,
        subject: 'Done With It',
        text: `Name: ${name} \nCity: ${city} \nPhone: ${phone} \nEmail: ${email} \nMessage: ${message}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(400).send('Message send fail');
        }

        return res.status(200).send('Message sent successfully');
    });
});

module.exports = router;
