module.exports = (sequelize, Sequelize) => {
    const LabOrder = sequelize.define("labOrder", {
        ID: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        visit_ID: { type: Sequelize.INTEGER },
        testName: { type: Sequelize.STRING(255) },
        orderedBy_ID: { type: Sequelize.INTEGER },
        assignedDepartment_ID: { type: Sequelize.INTEGER },
        assignedUser_ID: { type: Sequelize.INTEGER },
        status: { type: Sequelize.STRING(20), defaultValue: 'ORDERED' },
        resultText: { type: Sequelize.TEXT },
        fileUrl: { type: Sequelize.STRING(1000) },
        notes: { type: Sequelize.TEXT },
        orderedAt: { type: Sequelize.DATE },
        completedAt: { type: Sequelize.DATE }
    }, {
        freezeTableName: true,
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    });
    return LabOrder;
};
