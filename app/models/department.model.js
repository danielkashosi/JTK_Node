module.exports = (sequelize, Sequelize) => {
    const Department = sequelize.define("department", {
        ID: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: Sequelize.STRING(100) },
        code: { type: Sequelize.STRING(20) },
        description: { type: Sequelize.TEXT },
        isActive: { type: Sequelize.TINYINT, defaultValue: 1 }
    }, {
        freezeTableName: true,
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    });
    return Department;
};
