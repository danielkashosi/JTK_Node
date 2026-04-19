const authMiddleware = require('../middlewares/auth.js');

module.exports = app => {
    const visitReasons = require("../controllers/visitReason.controller.js");
    const router = require("express").Router();

    router.get("/",  visitReasons.list);
    router.post("/", authMiddleware.checkTaskFeature('MANAGEDEPTS'), visitReasons.create);

    app.use('/api/visit-reasons', authMiddleware.authenticateJWT, router);
};
