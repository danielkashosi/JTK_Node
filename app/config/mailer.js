const nodemailer = require('nodemailer');
const mailConfig = require('./mail.config');

// Module-level singleton — one SMTP connection pool for the whole process (M-9)
const transporter = nodemailer.createTransport({
  host: mailConfig.MAIL_SERVER,
  port: mailConfig.MAIL_PORT,
  secure: false,
  auth: {
    user: mailConfig.MAIL_USER,
    pass: mailConfig.MAIL_PASSWORD,
  }
});

module.exports = transporter;
