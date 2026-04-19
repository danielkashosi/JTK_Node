module.exports = (sequelize, Sequelize) => {
    const Invoice = sequelize.define("invoice", {
        ID: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        visit_ID: { type: Sequelize.INTEGER },
        totalAmount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0.00 },
        status: { type: Sequelize.STRING(20), defaultValue: 'PENDING' },
        notes: { type: Sequelize.TEXT },
        createdBy_ID: { type: Sequelize.INTEGER }
    }, {
        freezeTableName: true,
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    });
    return Invoice;
};
