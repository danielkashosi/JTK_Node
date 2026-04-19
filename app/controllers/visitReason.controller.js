const db = require("../models");
const VisitReason = db.visitReason;

exports.list = async (req, res) => {
    try {
        const reasons = await VisitReason.findAll({ where: { isActive: 1 }, order: [['name', 'ASC']] });
        res.json(reasons);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.create = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "name is required." });
    try {
        const reason = await VisitReason.create({ name, isActive: 1 });
        res.status(201).json(reason);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
