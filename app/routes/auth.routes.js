const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { message: 'Too many password reset requests. Please try again after 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = app => {
    const auth = require("../controllers/auth.controller.js");
    const authMiddleware = require('../middlewares/auth.js');

    var router = require("express").Router();

    router.post("/login", loginLimiter, auth.login);
    router.post("/signup", auth.signup);
    router.get("/verify/:token", auth.verify);
    router.post('/refresh-token', auth.refreshToken);
    router.post('/forget-password', forgotPasswordLimiter, auth.forgetPassword);
    router.post('/reset-password', auth.resetPassword);
    router.post('/logout', authMiddleware.authenticateJWT, auth.logout);

    app.use('/api/auth', router);
  };
  