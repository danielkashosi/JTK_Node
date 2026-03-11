module.exports = {
  MAIL_SERVER: process.env.MAIL_SERVER || 'smtp-relay.brevo.com',
  MAIL_PORT: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT) : 587,
  MAIL_USER: process.env.MAIL_USER || '',
  MAIL_PASSWORD: process.env.MAIL_PASSWORD || '',
  MAIL_DEFAULT_SENDER: process.env.MAIL_DEFAULT_SENDER || 'sender@example.com',
};
  