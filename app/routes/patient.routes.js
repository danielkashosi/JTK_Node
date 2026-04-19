const authMiddleware = require('../middlewares/auth.js');

module.exports = app => {
    const patients = require("../controllers/patient.controller.js");
    const router = require("express").Router();

    router.get("/",       authMiddleware.checkTaskFeature('LISTPATIENTS'),  patients.list);
    router.post("/",      authMiddleware.checkTaskFeature('CREATEPATIENT'), patients.create);
    router.get("/:id",    authMiddleware.checkTaskFeature('READPATIENT'),   patients.read);
    router.put("/:id",    authMiddleware.checkTaskFeature('UPDATEPATIENT'), patients.update);

    app.use('/api/patients', authMiddleware.authenticateJWT, router);
};
