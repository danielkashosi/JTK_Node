const authMiddleware = require('../middlewares/auth.js')

module.exports = app => {
    const feature = require("../controllers/feature.controller.js");
  
    var router = require("express").Router();
  
    router.post("/", authMiddleware.checkTaskFeature('CREATEFEATURE'), feature.create);

    router.get("/", authMiddleware.checkTaskFeature('LISTFEATURES'), feature.list);

    router.get("/:id", authMiddleware.checkTaskFeature('READFEATURE'), feature.read);

    router.put("/:id", authMiddleware.checkTaskFeature('UPDATEFEATURE'), feature.update);

    router.delete("/:id", authMiddleware.checkTaskFeature('DELETEFEATURE'), feature.delete);

    router.post("/:id/user", authMiddleware.checkTaskFeature('UPDATEFEATURE'), feature.addUser);

    router.post("/:id/group", authMiddleware.checkTaskFeature('UPDATEFEATURE'), feature.addGroup);
  
    app.use('/api/features', authMiddleware.authenticateJWT, router);
  };
  