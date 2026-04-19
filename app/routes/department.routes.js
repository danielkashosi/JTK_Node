const authMiddleware = require('../middlewares/auth.js');

module.exports = app => {
    const departments = require("../controllers/department.controller.js");
    const router = require("express").Router();

    router.get("/",                       authMiddleware.checkTaskFeature('LISTDEPTS'),   departments.list);
    router.post("/",                      authMiddleware.checkTaskFeature('MANAGEDEPTS'), departments.create);
    router.get("/:id",                    authMiddleware.checkTaskFeature('LISTDEPTS'),   departments.read);
    router.put("/:id",                    authMiddleware.checkTaskFeature('MANAGEDEPTS'), departments.update);
    router.get("/:id/staff",              authMiddleware.checkTaskFeature('LISTDEPTS'),   departments.listStaff);
    router.post("/:id/staff",             authMiddleware.checkTaskFeature('MANAGEDEPTS'), departments.addStaff);
    router.delete("/:id/staff/:userId",   authMiddleware.checkTaskFeature('MANAGEDEPTS'), departments.removeStaff);

    app.use('/api/departments', authMiddleware.authenticateJWT, router);
};
