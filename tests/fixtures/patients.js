/**
 * Sample patient payload objects for POST /api/patients tests.
 *
 * firstName / lastName use the TEST_ prefix so cleanupDb() can remove them.
 */

const timestamp = () => Date.now();

module.exports = {
  /** Fully valid patient payload */
  validPatient: () => ({
    firstName: 'TEST_PatientFirst',
    lastName: 'TEST_PatientLast',
    DOB: '1985-04-12',
    gender: 'M',
    nationalID: `TEST_NID_${timestamp()}`,
    phone: '0700000001',
    address: '123 Test Street, Test City',
    bloodType: 'O+',
    allergiesNotes: 'None known',
    emergencyContactName: 'TEST_Contact',
    emergencyContactPhone: '0700000002'
  }),

  /** Minimal valid payload — only required fields */
  minimalPatient: () => ({
    firstName: 'TEST_MinFirst',
    lastName: 'TEST_MinLast'
  }),

  /** Missing required fields — should return 400 */
  missingNamesPatient: {
    DOB: '1990-01-01',
    gender: 'F'
    // firstName and lastName omitted
  },

  /** Valid update payload */
  validUpdate: {
    firstName: 'TEST_UpdatedPatFirst',
    lastName: 'TEST_UpdatedPatLast',
    phone: '0799999999',
    address: 'Updated Address'
  }
};
