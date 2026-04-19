/**
 * Auth helpers for tests.
 *
 * Creates real users directly via the DB (bypassing the API) and mints valid
 * JWTs using the same secrets as the running application.
 *
 * Usage:
 *   const { createTestUser, createAdminUser, getAuthHeader } = require('./auth');
 *   const { user, token } = await createTestUser({ userName: 'testuser_foo' });
 *   const headers = getAuthHeader(token);
 */

require('dotenv').config({ path: './tests/.env.test' });
process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../../app/models');

const jwtConfig = require('../../app/config/jwt.config');

const DEFAULT_PASSWORD_PLAIN = 'TestPass1';

/**
 * Create a user directly in the DB with an optional set of overrides.
 * The userName is normalised to always start with "testuser_" so cleanupDb()
 * can identify and remove it.
 *
 * @param {object} overrides  - Partial user fields (userName, email, firstName, lastName, DOB)
 * @param {string[]} taskFeatureNames - Array of TaskFeature names to assign directly to the user
 * @returns {{ user, token }}
 */
async function createTestUser(overrides = {}, taskFeatureNames = []) {
  const userName = overrides.userName || `testuser_${Date.now()}`;
  const email = overrides.email || `${userName}@test.invalid`;
  const firstName = overrides.firstName || 'TEST_First';
  const lastName = overrides.lastName || 'TEST_Last';
  const plainPassword = overrides.password || DEFAULT_PASSWORD_PLAIN;

  // Get or create ACTIVE status
  const activeStatus = await db.userStatus.findOne({ where: { name: 'ACTIVE' } });
  if (!activeStatus) throw new Error('ACTIVE UserStatus not found — check DB seeding.');

  const person = await db.persons.create({ firstName, lastName, DOB: null });

  const user = await db.users.create({
    userName,
    email,
    password: await bcrypt.hash(plainPassword, 10),
    person_ID: person.ID,
    userStatus_ID: activeStatus.ID,
    Verified: new Date()
  });

  // Assign requested task-feature permissions directly to this user
  if (taskFeatureNames.length > 0) {
    for (const name of taskFeatureNames) {
      const tf = await db.taskFeature.findOne({ where: { name } });
      if (tf) {
        const existing = await db.taskFeature_has_user.findOne({
          where: { taskFeature_ID: tf.ID, user_ID: user.ID }
        });
        if (!existing) {
          await db.taskFeature_has_user.create({ taskFeature_ID: tf.ID, user_ID: user.ID });
        }
      }
    }
  }

  const token = mintAccessToken(user.ID);
  return { user, token, plainPassword };
}

/**
 * Create an admin user that holds all task-feature permissions needed
 * for the full test suite.
 */
async function createAdminUser() {
  const adminPermissions = [
    'LISTUSERS', 'CREATEUSER', 'READUSER', 'UPDATEUSER', 'DELETEUSER',
    'LISTPATIENTS', 'CREATEPATIENT', 'READPATIENT', 'UPDATEPATIENT',
    'LISTVISITS', 'CREATEVISIT', 'UPDATEVISIT', 'CLOSEVISIT',
    'LISTGROUPS', 'CREATEGROUP', 'READGROUP', 'UPDATEGROUP', 'DELETEGROUP'
  ];

  return createTestUser(
    { userName: `testuser_admin_${Date.now()}`, firstName: 'TEST_Admin', lastName: 'TEST_User' },
    adminPermissions
  );
}

/**
 * Mint a short-lived access token for a given user ID.
 * Uses the same secret as jwtConfig so the authenticateJWT middleware accepts it.
 */
function mintAccessToken(userId) {
  return jwt.sign(
    { ID: userId },
    jwtConfig.ACCESS_TOKEN_PRIVATE_KEY,
    { expiresIn: '2h' }
  );
}

/**
 * Return an Authorization header object for use with supertest.
 * @param {string} token
 * @returns {{ Authorization: string }}
 */
function getAuthHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { createTestUser, createAdminUser, getAuthHeader, mintAccessToken, DEFAULT_PASSWORD_PLAIN };
