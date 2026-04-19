module.exports = (sequelize, Sequelize) => {
    const Patient = sequelize.define("patient", {
        ID: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        firstName: { type: Sequelize.STRING(255) },
        lastName: { type: Sequelize.STRING(255) },
        DOB: { type: Sequelize.DATEONLY },
        gender: { type: Sequelize.STRING(10) },
        nationalID: { type: Sequelize.STRING(100) },
        phone: { type: Sequelize.STRING(50) },
        address: { type: Sequelize.TEXT },
        bloodType: { type: Sequelize.STRING(10) },
        allergiesNotes: { type: Sequelize.TEXT },
        emergencyContactName: { type: Sequelize.STRING(255) },
        emergencyContactPhone: { type: Sequelize.STRING(50) },
        createdBy_ID: { type: Sequelize.INTEGER }
    }, {
        freezeTableName: true,
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    });
    return Patient;
};
