const authMiddleware = require('../middlewares/auth.js')

module.exports = app => {
    const users = require("../controllers/user.controller.js");
  
    var router = require("express").Router();
  
    // Create a new User
    router.post("/", authMiddleware.checkTaskFeature('CREATEUSER'), users.create);
  
    // List and search Users (paginated, sortable, filterable)
    router.get("/", authMiddleware.checkTaskFeature('LISTUSERS'), users.list);

    // List all user statuses (for dropdowns)
    router.get("/statuses", users.listStatuses);
  
    // Retrieve a single User with id
    router.get("/:id", authMiddleware.checkTaskFeature('READUSER'), users.read);
  
    // Update a User (userName, email, password, firstName, lastName, DOB)
    router.put("/:id", authMiddleware.checkTaskFeature('UPDATEUSER'), users.update);

    // Change user status (activate / deactivate / suspend)
    router.patch("/:id/status", authMiddleware.checkTaskFeature('UPDATEUSER'), users.changeStatus);

    // Change own password
    router.patch("/:id/change-password", users.changePassword);
  
    // Delete a User with id
    router.delete("/:id", authMiddleware.checkTaskFeature('DELETEUSER'), users.delete);
  
    app.use('/api/users', authMiddleware.authenticateJWT, router);
  };
  