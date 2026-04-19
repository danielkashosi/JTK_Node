const authMiddleware = require('../middlewares/auth.js')

module.exports = app => {
  const taskFeature = require("../controllers/taskFeature.controller.js");

  var router = require("express").Router();

  router.post("/", authMiddleware.checkTaskFeature('CREATETASKFEATURE'), taskFeature.create);

  router.get("/", authMiddleware.checkTaskFeature('LISTTASKFEATURES'), taskFeature.list);

  router.get("/:id", authMiddleware.checkTaskFeature('READTASKFEATURE'), taskFeature.read);

  router.put("/:id", authMiddleware.checkTaskFeature('UPDATETASKFEATURE'), taskFeature.update);

  router.delete("/:id", authMiddleware.checkTaskFeature('DELETETASKFEATURE'), taskFeature.delete);

  router.post("/:id/user", authMiddleware.checkTaskFeature('UPDATETASKFEATURE'), taskFeature.addUser);

  router.post("/:id/group", authMiddleware.checkTaskFeature('UPDATETASKFEATURE'), taskFeature.addGroup);

  app.use('/api/taskfeatures', authMiddleware.authenticateJWT, router);
};
  