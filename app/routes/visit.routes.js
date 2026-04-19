const authMiddleware = require('../middlewares/auth.js');

module.exports = app => {
    const visits = require("../controllers/visit.controller.js");
    const router = require("express").Router();

    // Stats (must come before /:id to avoid being matched as ID)
    router.get("/stats", authMiddleware.checkTaskFeature('LISTVISITS'), visits.getStats);

    // Visit CRUD
    router.get("/",     authMiddleware.checkTaskFeature('LISTVISITS'),  visits.list);
    router.post("/",    authMiddleware.checkTaskFeature('CREATEVISIT'), visits.create);
    router.get("/:id",  authMiddleware.checkTaskFeature('LISTVISITS'),  visits.read);

    // Transition (send to next step)
    router.post("/:id/transition", authMiddleware.checkTaskFeature('UPDATEVISIT'), visits.transition);

    // Vitals
    router.post("/:id/vitals", authMiddleware.checkTaskFeature('UPDATEVISIT'), visits.saveVitals);

    // Clinical notes
    router.post("/:id/notes", authMiddleware.checkTaskFeature('UPDATEVISIT'), visits.saveNote);

    // Lab orders
    router.get("/:id/lab-orders",        authMiddleware.checkTaskFeature('LISTVISITS'),  visits.listLabOrders);
    router.post("/:id/lab-orders",       authMiddleware.checkTaskFeature('UPDATEVISIT'), visits.createLabOrder);
    router.patch("/:id/lab-orders/:labId", authMiddleware.checkTaskFeature('UPDATEVISIT'), visits.updateLabOrder);

    // Invoice & payment
    router.get("/:id/invoice",      authMiddleware.checkTaskFeature('LISTVISITS'),  visits.getInvoice);
    router.put("/:id/invoice",      authMiddleware.checkTaskFeature('CLOSEVISIT'),  visits.createOrUpdateInvoice);
    router.post("/:id/invoice/pay", authMiddleware.checkTaskFeature('CLOSEVISIT'),  visits.addPayment);

    app.use('/api/visits', authMiddleware.authenticateJWT, router);
};
