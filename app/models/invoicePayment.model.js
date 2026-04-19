module.exports = (sequelize, Sequelize) => {
    const InvoicePayment = sequelize.define("invoicePayment", {
        ID: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        invoice_ID: { type: Sequelize.INTEGER },
        method: { type: Sequelize.STRING(50), defaultValue: 'CASH' },
        amount: { type: Sequelize.DECIMAL(10, 2) },
        receivedBy_ID: { type: Sequelize.INTEGER },
        paidAt: { type: Sequelize.DATE }
    }, {
        freezeTableName: true,
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: false
    });
    return InvoicePayment;
};
