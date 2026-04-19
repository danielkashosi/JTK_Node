/**
 * Database helper for tests.
 *
 * Imports the shared db instance (same Sequelize connection used by the app)
 * and provides a cleanupDb() that removes any records created by tests
 * — identified by the TEST_ prefix in name/userName fields.
 */

// Ensure test env is loaded before requiring models
require('dotenv').config({ path: './tests/.env.test' });
process.env.NODE_ENV = 'test';

const db = require('../../app/models');

/**
 * Remove all test-prefixed records created during a test run.
 * Order matters because of FK constraints:
 *   invoice_payments → invoices → visits → patients
 *   taskFeature_has_user → users (via person) → persons
 *   group_has_user, taskFeature_has_group → groups
 */
async function cleanupDb() {
  const { Op } = db.Sequelize;

  // --- Visit workflow cleanup ---

  // InvoicePayments don't have a name field; clean them via their invoices
  // First, get invoice IDs tied to test visits
  const testVisits = await db.visit.findAll({
    include: [{ model: db.patient, as: 'Patient' }],
    where: {
      '$Patient.firstName$': { [Op.like]: 'TEST_%' }
    }
  });
  const testVisitIds = testVisits.map(v => v.ID);

  if (testVisitIds.length > 0) {
    // Lab orders
    await db.labOrder.destroy({ where: { visit_ID: testVisitIds } });

    // Invoice payments + invoices
    const testInvoices = await db.invoice.findAll({ where: { visit_ID: testVisitIds } });
    const testInvoiceIds = testInvoices.map(i => i.ID);
    if (testInvoiceIds.length > 0) {
      await db.invoicePayment.destroy({ where: { invoice_ID: testInvoiceIds } });
      await db.invoice.destroy({ where: { ID: testInvoiceIds } });
    }

    // Visit events
    await db.visitEvent.destroy({ where: { visit_ID: testVisitIds } });

    // Visits
    await db.visit.destroy({ where: { ID: testVisitIds } });
  }

  // Patients with firstName or lastName starting with TEST_
  await db.patient.destroy({
    where: {
      [Op.or]: [
        { firstName: { [Op.like]: 'TEST_%' } },
        { lastName: { [Op.like]: 'TEST_%' } }
      ]
    }
  });

  // --- User / auth cleanup ---

  // Find test users by userName prefix
  const testUsers = await db.users.findAll({
    where: { userName: { [Op.like]: 'testuser_%' } }
  });
  const testUserIds = testUsers.map(u => u.ID);
  const testPersonIds = testUsers.map(u => u.person_ID).filter(Boolean);

  if (testUserIds.length > 0) {
    await db.taskFeature_has_user.destroy({ where: { user_ID: testUserIds } });
    await db.group_has_user.destroy({ where: { user_ID: testUserIds } });
    await db.refreshTokens.destroy({ where: { user_ID: testUserIds } });
    await db.users.destroy({ where: { ID: testUserIds } });
  }

  if (testPersonIds.length > 0) {
    await db.persons.destroy({ where: { ID: testPersonIds } });
  }

  // --- Group cleanup ---
  // Must delete join-table rows before deleting groups (no ON DELETE CASCADE in schema)
  const testGroups = await db.group.findAll({ where: { name: { [Op.like]: 'TEST_%' } } });
  const testGroupIds = testGroups.map(g => g.ID);
  if (testGroupIds.length > 0) {
    await db.group_has_user.destroy({ where: { group_ID: testGroupIds } });
    await db.taskFeature_has_group.destroy({ where: { group_ID: testGroupIds } });
    await db.group.destroy({ where: { ID: testGroupIds } });
  }
}

module.exports = { db, cleanupDb };
