const authMiddleware = require('../middlewares/auth.js')

module.exports = app => {
    const task = require("../controllers/task.controller.js");
  
    var router = require("express").Router();
  
    router.post("/", authMiddleware.checkTaskFeature('CREATETASK'), task.create);

    router.get("/", authMiddleware.checkTaskFeature('LISTTASKS'), task.list);

    router.get("/:id", authMiddleware.checkTaskFeature('READTASK'), task.read);

    router.put("/:id", authMiddleware.checkTaskFeature('UPDATETASK'), task.update);

    router.delete("/:id", authMiddleware.checkTaskFeature('DELETETASK'), task.delete);
  
    app.use('/api/tasks', authMiddleware.authenticateJWT, router);
  };
  