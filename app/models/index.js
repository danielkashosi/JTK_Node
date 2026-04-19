const dbConfig = require("../config/db.config.js");

const Sequelize = require("sequelize");
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  port: dbConfig.PORT,
  dialect: dbConfig.dialect,
  dialectOptions: dbConfig.dialectOptions || {},
  operatorsAliases: 0,

  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.users = require("./user.model.js")(sequelize, Sequelize);
db.persons = require("./person.model.js")(sequelize, Sequelize);
db.refreshTokens = require("./refreshToken.model.js")(sequelize, Sequelize);
db.userStatus = require('./userStatus.model.js')(sequelize, Sequelize);
db.taskFeature_has_group = require('./taskFeature_has_group.model.js')(sequelize, Sequelize);
db.taskFeature_has_user = require('./taskFeature_has_user.model.js')(sequelize, Sequelize);
db.taskFeature = require('./taskFeature.model.js')(sequelize, Sequelize);
db.modulo = require('./modulo.model.js')(sequelize, Sequelize);
db.moduleFeatureTaskStatus = require('./moduleFeatureTaskStatus.model.js')(sequelize, Sequelize);
db.feature = require('./feature.model.js')(sequelize, Sequelize);
db.task = require('./task.model.js')(sequelize, Sequelize);
db.group = require('./group.model.js')(sequelize, Sequelize);
db.groupStatus = require('./groupStatus.model.js')(sequelize, Sequelize);
db.group_has_user = require('./group_has_user.model.js')(sequelize, Sequelize);
db.apiLog = require('./apiLog.model.js')(sequelize, Sequelize);

// --- Module 1: Visit Workflow ---
db.department = require('./department.model.js')(sequelize, Sequelize);
db.departmentHasUser = require('./department_has_user.model.js')(sequelize, Sequelize);
db.patient = require('./patient.model.js')(sequelize, Sequelize);
db.visitReason = require('./visitReason.model.js')(sequelize, Sequelize);
db.visit = require('./visit.model.js')(sequelize, Sequelize);
db.visitEvent = require('./visitEvent.model.js')(sequelize, Sequelize);
db.labOrder = require('./labOrder.model.js')(sequelize, Sequelize);
db.invoice = require('./invoice.model.js')(sequelize, Sequelize);
db.invoicePayment = require('./invoicePayment.model.js')(sequelize, Sequelize);

db.persons.hasOne(db.users, {
  foreignKey: 'person_ID',
  onDelete: 'CASCADE'
});

db.users.belongsTo(db.persons, {
  foreignKey: 'person_ID',
  onDelete: 'CASCADE',
});

db.users.belongsTo(db.userStatus, {
  foreignKey: 'userStatus_ID'
});

db.userStatus.hasOne(db.users, {
  foreignKey: 'userStatus_ID'
});

db.users.hasOne(db.refreshTokens, {
  foreignKey: 'user_ID',
  onDelete: 'CASCADE',
});

db.refreshTokens.belongsTo(db.users, {
  foreignKey: 'user_ID',
  onDelete: 'CASCADE'
});

db.group.belongsTo(db.groupStatus, {
  foreignKey: 'groupStatus_ID',
  as: 'GroupStatus'
});

db.groupStatus.hasMany(db.group, {
  foreignKey: 'groupStatus_ID'
});

// --- Module 1: Visit Workflow Associations ---

// Department <-> User (staff assignments)
db.department.hasMany(db.departmentHasUser, { foreignKey: 'department_ID', as: 'Staff' });
db.departmentHasUser.belongsTo(db.department, { foreignKey: 'department_ID' });
db.users.hasMany(db.departmentHasUser, { foreignKey: 'user_ID' });
db.departmentHasUser.belongsTo(db.users, { foreignKey: 'user_ID', as: 'User' });

// Patient
db.patient.belongsTo(db.users, { foreignKey: 'createdBy_ID', as: 'CreatedBy' });
db.patient.hasMany(db.visit, { foreignKey: 'patient_ID' });

// Visit
db.visit.belongsTo(db.patient, { foreignKey: 'patient_ID', as: 'Patient' });
db.visit.belongsTo(db.department, { foreignKey: 'currentDepartment_ID', as: 'CurrentDepartment' });
db.visit.belongsTo(db.users, { foreignKey: 'currentAssignedUser_ID', as: 'CurrentAssignedUser' });
db.visit.belongsTo(db.visitReason, { foreignKey: 'visitReason_ID', as: 'VisitReason' });
db.visit.belongsTo(db.users, { foreignKey: 'createdBy_ID', as: 'CreatedBy' });
db.visit.hasMany(db.visitEvent, { foreignKey: 'visit_ID', as: 'Events' });
db.visit.hasMany(db.labOrder, { foreignKey: 'visit_ID', as: 'LabOrders' });
db.visit.hasOne(db.invoice, { foreignKey: 'visit_ID', as: 'Invoice' });

// VisitEvent
db.visitEvent.belongsTo(db.visit, { foreignKey: 'visit_ID' });
db.visitEvent.belongsTo(db.department, { foreignKey: 'fromDepartment_ID', as: 'FromDepartment' });
db.visitEvent.belongsTo(db.department, { foreignKey: 'toDepartment_ID', as: 'ToDepartment' });
db.visitEvent.belongsTo(db.users, { foreignKey: 'toAssignedUser_ID', as: 'ToAssignedUser' });
db.visitEvent.belongsTo(db.users, { foreignKey: 'performedBy_ID', as: 'PerformedBy' });

// LabOrder
db.labOrder.belongsTo(db.visit, { foreignKey: 'visit_ID' });
db.labOrder.belongsTo(db.users, { foreignKey: 'orderedBy_ID', as: 'OrderedBy' });
db.labOrder.belongsTo(db.department, { foreignKey: 'assignedDepartment_ID', as: 'AssignedDepartment' });
db.labOrder.belongsTo(db.users, { foreignKey: 'assignedUser_ID', as: 'AssignedUser' });

// Invoice & Payment
db.invoice.belongsTo(db.visit, { foreignKey: 'visit_ID' });
db.invoice.belongsTo(db.users, { foreignKey: 'createdBy_ID', as: 'CreatedBy' });
db.invoice.hasMany(db.invoicePayment, { foreignKey: 'invoice_ID', as: 'Payments' });
db.invoicePayment.belongsTo(db.invoice, { foreignKey: 'invoice_ID' });
db.invoicePayment.belongsTo(db.users, { foreignKey: 'receivedBy_ID', as: 'ReceivedBy' });

module.exports = db;
