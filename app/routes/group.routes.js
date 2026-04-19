const authMiddleware = require('../middlewares/auth.js')

module.exports = app => {
    const group = require("../controllers/group.controller.js");
  
    var router = require("express").Router();

    // Static routes first (before /:id to avoid conflicts)
    router.get("/statuses", group.getGroupStatuses);
  
    router.post("/", authMiddleware.checkTaskFeature('CREATEGROUP'), group.create);
    router.get("/", authMiddleware.checkTaskFeature('LISTGROUPS'), group.list);
    router.get("/:id", authMiddleware.checkTaskFeature('READGROUP'), group.read);
    router.put("/:id", authMiddleware.checkTaskFeature('UPDATEGROUP'), group.update);
    router.delete("/:id", authMiddleware.checkTaskFeature('DELETEGROUP'), group.delete);

    // Member management
    router.post("/:id/members", authMiddleware.checkTaskFeature('UPDATEGROUP'), group.addUser);
    router.get("/:id/members", authMiddleware.checkTaskFeature('READGROUP'), group.getMembers);
    router.delete("/:id/members/:userId", authMiddleware.checkTaskFeature('UPDATEGROUP'), group.removeUser);

    // Permission (taskFeature) management
    router.get("/:id/permissions", authMiddleware.checkTaskFeature('READGROUP'), group.getPermissions);
    router.post("/:id/permissions", authMiddleware.checkTaskFeature('UPDATEGROUP'), group.addPermission);
    router.delete("/:id/permissions/:tfId", authMiddleware.checkTaskFeature('UPDATEGROUP'), group.removePermission);
  
    app.use('/api/groups', authMiddleware.authenticateJWT, router);
  };
  