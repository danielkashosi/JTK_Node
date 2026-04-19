const db = require("../models");
const Visit = db.visit;
const VisitEvent = db.visitEvent;
const Patient = db.patient;
const Department = db.department;
const User = db.users;
const Person = db.persons;
const VisitReason = db.visitReason;
const LabOrder = db.labOrder;
const Invoice = db.invoice;
const InvoicePayment = db.invoicePayment;
const Op = db.Sequelize.Op;

// Terminal statuses — cannot transition out of these
const TERMINAL_STATUSES = ['CHECKED_OUT', 'ABANDONED', 'CANCELLED'];

const VISIT_INCLUDE = [
    { model: Patient, as: 'Patient' },
    { model: Department, as: 'CurrentDepartment' },
    { model: User, as: 'CurrentAssignedUser', include: [{ model: Person }] },
    { model: VisitReason, as: 'VisitReason' },
    { model: User, as: 'CreatedBy', include: [{ model: Person }] }
];

// ── Create / Check-In ─────────────────────────────────────────────────────────
exports.create = async (req, res) => {
    const { patient_ID, currentDepartment_ID, currentAssignedUser_ID, reasonText, visitReason_ID, scheduledAt } = req.body;
    if (!patient_ID) return res.status(400).json({ message: "patient_ID is required." });

    // Prevent duplicate active visits (only for immediate check-ins, not scheduled)
    if (!scheduledAt) {
        try {
            const existingActive = await Visit.findOne({
                where: {
                    patient_ID,
                    currentStatus: { [Op.notIn]: TERMINAL_STATUSES }
                }
            });
            if (existingActive) {
                return res.status(409).json({
                    message: "This patient already has an active visit.",
                    existingVisitId: existingActive.ID
                });
            }
        } catch (err) {
            console.error('Error checking for existing active visit:', err);
            return res.status(500).json({ message: "An error occurred. Please try again." });
        }
    }

    const status = scheduledAt ? 'SCHEDULED' : 'CHECKED_IN';
    const t = await db.sequelize.transaction();
    try {
        const visit = await Visit.create({
            patient_ID,
            currentStatus: status,
            currentDepartment_ID: currentDepartment_ID || null,
            currentAssignedUser_ID: currentAssignedUser_ID || null,
            reasonText: reasonText || null,
            visitReason_ID: visitReason_ID || null,
            scheduledAt: scheduledAt || null,
            checkedInAt: scheduledAt ? null : new Date(),
            createdBy_ID: req.user.ID
        }, { transaction: t });

        await VisitEvent.create({
            visit_ID: visit.ID,
            fromStatus: null,
            toStatus: status,
            fromDepartment_ID: null,
            toDepartment_ID: currentDepartment_ID || null,
            toAssignedUser_ID: currentAssignedUser_ID || null,
            note: reasonText || null,
            performedBy_ID: req.user.ID
        }, { transaction: t });

        await t.commit();

        const full = await Visit.findByPk(visit.ID, { include: VISIT_INCLUDE });
        res.status(201).json(full);
    } catch (err) {
        await t.rollback();
        console.error('Error creating visit:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

// ── List / Queue ──────────────────────────────────────────────────────────────
exports.list = async (req, res) => {
    const { status, department_ID, patient_ID, assignedUser_ID, activeOnly, page = 1, pageSize = 50 } = req.query;
    const limit = Math.min(parseInt(pageSize) || 50, 200);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

    const where = {};
    if (status) where.currentStatus = status;
    if (department_ID) where.currentDepartment_ID = department_ID;
    if (patient_ID) where.patient_ID = patient_ID;
    if (assignedUser_ID) where.currentAssignedUser_ID = assignedUser_ID;
    if (activeOnly === 'true') {
        where.currentStatus = { [Op.notIn]: TERMINAL_STATUSES };
    }

    try {
        const { count, rows } = await Visit.findAndCountAll({
            where,
            include: VISIT_INCLUDE,
            limit, offset,
            order: [['checkedInAt', 'DESC'], ['createdAt', 'DESC']]
        });
        res.json({ total: count, data: rows });
    } catch (err) {
        console.error('Error listing visits:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

// ── Read single visit ─────────────────────────────────────────────────────────
exports.read = async (req, res) => {
    try {
        const visit = await Visit.findByPk(req.params.id, {
            include: [
                ...VISIT_INCLUDE,
                {
                    model: VisitEvent, as: 'Events',
                    include: [
                        { model: Department, as: 'FromDepartment' },
                        { model: Department, as: 'ToDepartment' },
                        { model: User, as: 'ToAssignedUser', include: [{ model: Person }] },
                        { model: User, as: 'PerformedBy', include: [{ model: Person }] }
                    ],
                    order: [['createdAt', 'ASC']]
                },
                {
                    model: LabOrder, as: 'LabOrders',
                    include: [
                        { model: User, as: 'OrderedBy', include: [{ model: Person }] },
                        { model: Department, as: 'AssignedDepartment' }
                    ]
                },
                {
                    model: Invoice, as: 'Invoice',
                    include: [{ model: InvoicePayment, as: 'Payments' }]
                }
            ]
        });
        if (!visit) return res.status(404).json({ message: "Visit not found." });
        res.json(visit);
    } catch (err) {
        console.error('Error reading visit:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

// ── Transition (Send to Next Step) ────────────────────────────────────────────
// Body: { toStatus, toDepartment_ID, toAssignedUser_ID, note }
exports.transition = async (req, res) => {
    const { toStatus, toDepartment_ID, toAssignedUser_ID, note } = req.body;
    if (!toStatus) return res.status(400).json({ message: "toStatus is required." });

    // Validate toStatus against allowed values (M-8)
    const VALID_STATUSES = [
        'SCHEDULED', 'CHECKED_IN', 'TRIAGE', 'WAITING', 'WITH_DOCTOR',
        'LAB_ORDERED', 'BILLING', 'CHECKED_OUT', 'ABANDONED', 'CANCELLED',
        'VITALS_RECORDED', 'CLINICAL_NOTE'
    ];
    if (!VALID_STATUSES.includes(toStatus)) {
        return res.status(400).json({ message: `Invalid toStatus. Allowed: ${VALID_STATUSES.join(', ')}` });
    }

    const t = await db.sequelize.transaction();
    try {
        const visit = await Visit.findByPk(req.params.id, { transaction: t });
        if (!visit) { await t.rollback(); return res.status(404).json({ message: "Visit not found." }); }
        if (TERMINAL_STATUSES.includes(visit.currentStatus)) {
            await t.rollback();
            return res.status(400).json({ message: `Cannot transition a visit in status ${visit.currentStatus}.` });
        }

        const fromStatus = visit.currentStatus;
        const fromDept = visit.currentDepartment_ID;

        const updates = {
            currentStatus: toStatus,
            currentDepartment_ID: toDepartment_ID !== undefined ? (toDepartment_ID || null) : visit.currentDepartment_ID,
            currentAssignedUser_ID: toAssignedUser_ID !== undefined ? (toAssignedUser_ID || null) : visit.currentAssignedUser_ID
        };

        // Set timestamps for specific transitions
        if (toStatus === 'CHECKED_IN' && !visit.checkedInAt) updates.checkedInAt = new Date();
        if (toStatus === 'CHECKED_OUT') updates.checkedOutAt = new Date();

        await visit.update(updates, { transaction: t });

        await VisitEvent.create({
            visit_ID: visit.ID,
            fromStatus,
            toStatus,
            fromDepartment_ID: fromDept,
            toDepartment_ID: toDepartment_ID || null,
            toAssignedUser_ID: toAssignedUser_ID || null,
            note: note || null,
            performedBy_ID: req.user.ID
        }, { transaction: t });

        await t.commit();

        const full = await Visit.findByPk(visit.ID, { include: VISIT_INCLUDE });
        res.json(full);
    } catch (err) {
        await t.rollback();
        console.error('Error transitioning visit:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

// ── Lab Orders ────────────────────────────────────────────────────────────────
exports.createLabOrder = async (req, res) => {
    const { testName, assignedDepartment_ID, assignedUser_ID, notes } = req.body;
    if (!testName) return res.status(400).json({ message: "testName is required." });
    try {
        const visit = await Visit.findByPk(req.params.id);
        if (!visit) return res.status(404).json({ message: "Visit not found." });

        const order = await LabOrder.create({
            visit_ID: visit.ID,
            testName,
            orderedBy_ID: req.user.ID,
            assignedDepartment_ID: assignedDepartment_ID || null,
            assignedUser_ID: assignedUser_ID || null,
            notes: notes || null,
            status: 'ORDERED',
            orderedAt: new Date()
        });
        res.status(201).json(order);
    } catch (err) {
        console.error('Error creating lab order:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

exports.listLabOrders = async (req, res) => {
    try {
        const orders = await LabOrder.findAll({
            where: { visit_ID: req.params.id },
            include: [
                { model: User, as: 'OrderedBy', include: [{ model: Person }] },
                { model: Department, as: 'AssignedDepartment' }
            ],
            order: [['orderedAt', 'ASC']]
        });
        res.json(orders);
    } catch (err) {
        console.error('Error listing lab orders:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

exports.updateLabOrder = async (req, res) => {
    try {
        const order = await LabOrder.findOne({ where: { ID: req.params.labId, visit_ID: req.params.id } });
        if (!order) return res.status(404).json({ message: "Lab order not found." });
        const { status, resultText, fileUrl, notes } = req.body;

        // Validate fileUrl to prevent stored XSS / SSRF (M-7)
        if (fileUrl !== undefined && fileUrl !== null && fileUrl !== '') {
            try {
                const u = new URL(fileUrl);
                if (!['http:', 'https:'].includes(u.protocol)) {
                    return res.status(400).json({ message: 'Invalid fileUrl: only http and https are allowed.' });
                }
            } catch {
                return res.status(400).json({ message: 'Invalid fileUrl format.' });
            }
        }

        const updates = { status: status || order.status, resultText, fileUrl, notes };
        if (status === 'COMPLETED' && !order.completedAt) updates.completedAt = new Date();
        await order.update(updates);
        res.json(order);
    } catch (err) {
        console.error('Error updating lab order:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

// ── Invoice ───────────────────────────────────────────────────────────────────
exports.getInvoice = async (req, res) => {
    try {
        let invoice = await Invoice.findOne({
            where: { visit_ID: req.params.id },
            include: [{ model: InvoicePayment, as: 'Payments' }]
        });
        if (!invoice) return res.status(404).json({ message: "No invoice for this visit yet." });
        res.json(invoice);
    } catch (err) {
        console.error('Error retrieving invoice:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

exports.createOrUpdateInvoice = async (req, res) => {
    const { totalAmount, notes } = req.body;
    try {
        const visit = await Visit.findByPk(req.params.id);
        if (!visit) return res.status(404).json({ message: "Visit not found." });

        let invoice = await Invoice.findOne({ where: { visit_ID: req.params.id } });
        if (invoice) {
            await invoice.update({ totalAmount, notes });
        } else {
            invoice = await Invoice.create({ visit_ID: visit.ID, totalAmount, notes, status: 'PENDING', createdBy_ID: req.user.ID });
        }
        const full = await Invoice.findByPk(invoice.ID, { include: [{ model: InvoicePayment, as: 'Payments' }] });
        res.json(full);
    } catch (err) {
        console.error('Error creating or updating invoice:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

// ── Stats (for Dashboard) ────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const TERMINAL = ['CHECKED_OUT', 'ABANDONED', 'CANCELLED'];

        const [visitsToday, checkedOutToday, activeByStatus] = await Promise.all([
            Visit.count({ where: { createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
            Visit.count({ where: { currentStatus: 'CHECKED_OUT', checkedOutAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
            Visit.findAll({
                attributes: ['currentStatus', [db.sequelize.fn('COUNT', db.sequelize.col('ID')), 'count']],
                where: { currentStatus: { [Op.notIn]: TERMINAL } },
                group: ['currentStatus'],
                raw: true
            })
        ]);

        const activeTotal = activeByStatus.reduce((sum, s) => sum + parseInt(s.count), 0);
        res.json({ visitsToday, checkedOutToday, activeTotal, activeByStatus });
    } catch (err) {
        console.error('Error retrieving visit stats:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

// ── Vitals ────────────────────────────────────────────────────────────────────
exports.saveVitals = async (req, res) => {
    const { bpSystolic, bpDiastolic, temperature, pulse, spo2, weight, height, triageLevel } = req.body;
    try {
        const visit = await Visit.findByPk(req.params.id);
        if (!visit) return res.status(404).json({ message: 'Visit not found.' });

        const bmi = (weight && height && parseFloat(height) > 0)
            ? (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)
            : null;
        const vitalsData = { bpSystolic, bpDiastolic, temperature, pulse, spo2, weight, height, bmi, triageLevel };

        const event = await VisitEvent.create({
            visit_ID: visit.ID,
            fromStatus: visit.currentStatus,
            toStatus: 'VITALS_RECORDED',
            fromDepartment_ID: visit.currentDepartment_ID,
            toDepartment_ID: visit.currentDepartment_ID,
            note: JSON.stringify(vitalsData),
            performedBy_ID: req.user.ID
        });
        res.status(201).json({ ...event.toJSON(), vitals: vitalsData });
    } catch (err) {
        console.error('Error saving vitals:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

// ── Clinical Notes ────────────────────────────────────────────────────────────
exports.saveNote = async (req, res) => {
    const { noteText } = req.body;
    if (!noteText || !noteText.trim()) return res.status(400).json({ message: 'noteText is required.' });
    try {
        const visit = await Visit.findByPk(req.params.id);
        if (!visit) return res.status(404).json({ message: 'Visit not found.' });

        const event = await VisitEvent.create({
            visit_ID: visit.ID,
            fromStatus: visit.currentStatus,
            toStatus: 'CLINICAL_NOTE',
            fromDepartment_ID: visit.currentDepartment_ID,
            toDepartment_ID: visit.currentDepartment_ID,
            note: noteText.trim(),
            performedBy_ID: req.user.ID
        });
        const full = await VisitEvent.findByPk(event.ID, {
            include: [{ model: User, as: 'PerformedBy', include: [{ model: Person }] }]
        });
        res.status(201).json(full);
    } catch (err) {
        console.error('Error saving clinical note:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

exports.addPayment = async (req, res) => {
    const { amount, method } = req.body;
    if (!amount) return res.status(400).json({ message: "amount is required." });
    try {
        const invoice = await Invoice.findOne({
            where: { visit_ID: req.params.id },
            include: [{ model: InvoicePayment, as: 'Payments' }]
        });
        if (!invoice) return res.status(404).json({ message: "Invoice not found." });

        await InvoicePayment.create({
            invoice_ID: invoice.ID,
            method: method || 'CASH',
            amount,
            receivedBy_ID: req.user.ID,
            paidAt: new Date()
        });

        // Check total paid
        const allPayments = await InvoicePayment.findAll({ where: { invoice_ID: invoice.ID } });
        const totalPaid = allPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
        if (totalPaid >= parseFloat(invoice.totalAmount)) {
            await invoice.update({ status: 'PAID' });
        }

        const full = await Invoice.findByPk(invoice.ID, { include: [{ model: InvoicePayment, as: 'Payments' }] });
        res.json(full);
    } catch (err) {
        console.error('Error adding payment:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};
