const db = require("../models");
const Patient = db.patient;
const User = db.users;
const Op = db.Sequelize.Op;

// Create patient
exports.create = async (req, res) => {
    const { firstName, lastName, DOB, gender, nationalID, phone, address, bloodType, allergiesNotes, emergencyContactName, emergencyContactPhone } = req.body;
    if (!firstName || !lastName) {
        return res.status(400).json({ message: "firstName and lastName are required." });
    }
    try {
        const patient = await Patient.create({
            firstName, lastName, DOB, gender, nationalID, phone, address,
            bloodType, allergiesNotes, emergencyContactName, emergencyContactPhone,
            createdBy_ID: req.user.ID
        });
        res.status(201).json(patient);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: "A patient with this National ID already exists." });
        }
        console.error('Error creating patient:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

// List / search patients
exports.list = async (req, res) => {
    const { search, page = 1, pageSize = 20 } = req.query;
    const limit = Math.min(parseInt(pageSize) || 20, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

    const where = {};
    if (search) {
        where[Op.or] = [
            { firstName: { [Op.like]: `%${search}%` } },
            { lastName: { [Op.like]: `%${search}%` } },
            { nationalID: { [Op.like]: `%${search}%` } },
            { phone: { [Op.like]: `%${search}%` } }
        ];
    }
    try {
        const { count, rows } = await Patient.findAndCountAll({ where, limit, offset, order: [['lastName', 'ASC'], ['firstName', 'ASC']] });
        res.json({ total: count, data: rows });
    } catch (err) {
        console.error('Error listing patients:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

// Get single patient
exports.read = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.id);
        if (!patient) return res.status(404).json({ message: "Patient not found." });
        res.json(patient);
    } catch (err) {
        console.error('Error reading patient:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};

// Update patient
exports.update = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.id);
        if (!patient) return res.status(404).json({ message: "Patient not found." });
        const { firstName, lastName, DOB, gender, nationalID, phone, address, bloodType, allergiesNotes, emergencyContactName, emergencyContactPhone } = req.body;
        await patient.update({ firstName, lastName, DOB, gender, nationalID, phone, address, bloodType, allergiesNotes, emergencyContactName, emergencyContactPhone });
        res.json(patient);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: "A patient with this National ID already exists." });
        }
        console.error('Error updating patient:', err);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};
