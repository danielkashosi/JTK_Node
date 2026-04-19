module.exports = (sequelize, Sequelize) => {
    const VisitReason = sequelize.define("visitReason", {
        ID: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: Sequelize.STRING(255) },
        isActive: { type: Sequelize.TINYINT, defaultValue: 1 }
    }, {
        freezeTableName: true,
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    });
    return VisitReason;
};
