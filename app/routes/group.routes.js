const authMiddleware = require('../middlewares/auth.js')

module.exports = app => {
    const group = require("../controllers/group.controller.js");
  
    var router = require("express").Router();

    // Static routes first (before /:id to avoid conflicts)
    router.get("/statuses", group.getGroupStatuses);
  
    router.post("/", group.create);
    router.get("/", group.list);
    router.get("/:id", group.read);
    router.put("/:id", group.update);
    router.delete("/:id", group.delete);

    // Member management
    router.post("/:id/members", group.addUser);
    router.get("/:id/members", group.getMembers);
    router.delete("/:id/members/:userId", group.removeUser);

    // Permission (taskFeature) management
    router.get("/:id/permissions", group.getPermissions);
    router.post("/:id/permissions", group.addPermission);
    router.delete("/:id/permissions/:tfId", group.removePermission);
  
    app.use('/api/groups', authMiddleware.authenticateJWT, router);
  };
  