const authMiddleware = require('../middlewares/auth.js')

module.exports = app => {
    const modulo = require("../controllers/modulo.controller.js");
  
    var router = require("express").Router();
  
    router.post("/", authMiddleware.checkTaskFeature('CREATEMODULE'), modulo.create);

    router.get("/", authMiddleware.checkTaskFeature('LISTMODULES'), modulo.list);

    router.get("/:id", authMiddleware.checkTaskFeature('READMODULE'), modulo.read);

    router.put("/:id", authMiddleware.checkTaskFeature('UPDATEMODULE'), modulo.update);

    router.delete("/:id", authMiddleware.checkTaskFeature('DELETEMODULE'), modulo.delete);

    router.post("/:id/user", authMiddleware.checkTaskFeature('UPDATEMODULE'), modulo.addUser);

    router.post("/:id/group", authMiddleware.checkTaskFeature('UPDATEMODULE'), modulo.addGroup);
  
    app.use('/api/modules', authMiddleware.authenticateJWT, router);
  };
  