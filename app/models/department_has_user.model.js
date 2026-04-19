module.exports = (sequelize, Sequelize) => {
    const DepartmentHasUser = sequelize.define("department_has_user", {
        ID: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        department_ID: { type: Sequelize.INTEGER },
        user_ID: { type: Sequelize.INTEGER },
        isPrimary: { type: Sequelize.TINYINT, defaultValue: 0 }
    }, {
        freezeTableName: true,
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    });
    return DepartmentHasUser;
};
