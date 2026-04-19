const db = require("../models");
const Department = db.department;
const DepartmentHasUser = db.departmentHasUser;
const User = db.users;
const Person = db.persons;

// List all active departments
exports.list = async (req, res) => {
    try {
        const where = {};
        if (req.query.activeOnly !== 'false') where.isActive = 1;
        const depts = await Department.findAll({ where, order: [['name', 'ASC']] });
        res.json(depts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get single department with staff list
exports.read = async (req, res) => {
    try {
        const dept = await Department.findByPk(req.params.id, {
            include: [{
                model: DepartmentHasUser,
                as: 'Staff',
                include: [{ model: User, as: 'User', include: [{ model: Person }] }]
            }]
        });
        if (!dept) return res.status(404).json({ message: "Department not found." });
        res.json(dept);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create department
exports.create = async (req, res) => {
    const { name, code, description } = req.body;
    if (!name || !code) return res.status(400).json({ message: "name and code are required." });
    try {
        const dept = await Department.create({ name, code, description, isActive: 1 });
        res.status(201).json(dept);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: "Department code already exists." });
        }
        res.status(500).json({ message: err.message });
    }
};

// Update department
exports.update = async (req, res) => {
    try {
        const dept = await Department.findByPk(req.params.id);
        if (!dept) return res.status(404).json({ message: "Department not found." });
        const { name, description, isActive } = req.body;
        await dept.update({ name, description, isActive });
        res.json(dept);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// List staff of a department
exports.listStaff = async (req, res) => {
    try {
        const staff = await DepartmentHasUser.findAll({
            where: { department_ID: req.params.id },
            include: [{ model: User, as: 'User', include: [{ model: Person }] }]
        });
        res.json(staff);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Add staff to department
exports.addStaff = async (req, res) => {
    const { user_ID, isPrimary } = req.body;
    if (!user_ID) return res.status(400).json({ message: "user_ID is required." });
    try {
        const entry = await DepartmentHasUser.create({
            department_ID: req.params.id,
            user_ID,
            isPrimary: isPrimary ? 1 : 0
        });
        res.status(201).json(entry);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: "User is already in this department." });
        }
        res.status(500).json({ message: err.message });
    }
};

// Remove staff from department
exports.removeStaff = async (req, res) => {
    try {
        const deleted = await DepartmentHasUser.destroy({
            where: { department_ID: req.params.id, user_ID: req.params.userId }
        });
        if (!deleted) return res.status(404).json({ message: "Staff assignment not found." });
        res.json({ message: "Staff removed from department." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
