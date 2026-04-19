module.exports = (sequelize, Sequelize) => {
    const VisitEvent = sequelize.define("visitEvent", {
        ID: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        visit_ID: { type: Sequelize.INTEGER },
        fromStatus: { type: Sequelize.STRING(50) },
        toStatus: { type: Sequelize.STRING(50) },
        fromDepartment_ID: { type: Sequelize.INTEGER },
        toDepartment_ID: { type: Sequelize.INTEGER },
        toAssignedUser_ID: { type: Sequelize.INTEGER },
        note: { type: Sequelize.TEXT },
        performedBy_ID: { type: Sequelize.INTEGER }
    }, {
        freezeTableName: true,
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: false
    });
    return VisitEvent;
};
