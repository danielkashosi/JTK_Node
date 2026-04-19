/**
 * Sample user payload objects for POST /api/users tests.
 *
 * All userNames and emails use the testuser_ prefix so cleanupDb() picks them up.
 * Passwords satisfy the app's strength policy: ≥8 chars, 1 uppercase, 1 number.
 */

const timestamp = () => Date.now();

module.exports = {
  /** A fully valid new-user payload */
  validUser: () => ({
    userName: `testuser_valid_${timestamp()}`,
    email: `testuser_valid_${timestamp()}@test.invalid`,
    password: 'TestPass1',
    firstName: 'TEST_Jane',
    lastName: 'TEST_Doe',
    DOB: '1990-06-15'
  }),

  /** Missing required fields — should return 400 */
  missingFieldsUser: {
    userName: 'testuser_incomplete',
    // email, password, firstName, lastName omitted intentionally
  },

  /** Password too short — should return 400 */
  weakPasswordUser: () => ({
    userName: `testuser_weakpw_${timestamp()}`,
    email: `testuser_weakpw_${timestamp()}@test.invalid`,
    password: 'abc',          // too short, no uppercase, no number
    firstName: 'TEST_Weak',
    lastName: 'TEST_Pass'
  }),

  /** Password without uppercase — should return 400 */
  noUppercasePasswordUser: () => ({
    userName: `testuser_noup_${timestamp()}`,
    email: `testuser_noup_${timestamp()}@test.invalid`,
    password: 'testpass1',    // no uppercase
    firstName: 'TEST_No',
    lastName: 'TEST_Upper'
  }),

  /** Password without number — should return 400 */
  noNumberPasswordUser: () => ({
    userName: `testuser_nonum_${timestamp()}`,
    email: `testuser_nonum_${timestamp()}@test.invalid`,
    password: 'TestPassABC',  // no number
    firstName: 'TEST_No',
    lastName: 'TEST_Number'
  }),

  /** Valid update payload — put on PUT /api/users/:id */
  validUpdate: {
    firstName: 'TEST_UpdatedFirst',
    lastName: 'TEST_UpdatedLast',
    DOB: '1992-03-22'
  }
};
