module.exports = (sequelize, Sequelize) => {
    const Visit = sequelize.define("visit", {
        ID: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        patient_ID: { type: Sequelize.INTEGER },
        currentStatus: { type: Sequelize.STRING(50), defaultValue: 'CHECKED_IN' },
        currentDepartment_ID: { type: Sequelize.INTEGER },
        currentAssignedUser_ID: { type: Sequelize.INTEGER },
        reasonText: { type: Sequelize.STRING(500) },
        visitReason_ID: { type: Sequelize.INTEGER },
        scheduledAt: { type: Sequelize.DATE },
        checkedInAt: { type: Sequelize.DATE },
        checkedOutAt: { type: Sequelize.DATE },
        createdBy_ID: { type: Sequelize.INTEGER }
    }, {
        freezeTableName: true,
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    });
    return Visit;
};
