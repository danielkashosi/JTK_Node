/**
 * Sample visit payload objects for POST /api/visits tests.
 *
 * patient_ID is set dynamically in beforeAll hooks because it depends on
 * a patient created in the DB. Factories that return functions accept
 * a patientId argument.
 */

module.exports = {
  /**
   * Returns a valid check-in payload for the given patient.
   * @param {number} patientId
   * @param {object} overrides
   */
  validVisit: (patientId, overrides = {}) => ({
    patient_ID: patientId,
    reasonText: 'Routine check-up',
    ...overrides
  }),

  /**
   * Returns a scheduled visit payload.
   * @param {number} patientId
   */
  scheduledVisit: (patientId) => ({
    patient_ID: patientId,
    reasonText: 'Scheduled appointment',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // tomorrow
  }),

  /** Missing required patient_ID — should return 400 */
  missingPatientIdVisit: {
    reasonText: 'No patient ID provided'
  },

  /** Vitals payload */
  vitals: {
    bpSystolic: 120,
    bpDiastolic: 80,
    temperature: 36.6,
    pulse: 72,
    spo2: 98,
    weight: 70,
    height: 175,
    triageLevel: 'GREEN'
  },

  /** Clinical note payload */
  note: {
    noteText: 'Patient presents with mild fever and headache. Prescribed paracetamol.'
  },

  /** Valid lab order payload */
  labOrder: {
    testName: 'Complete Blood Count (CBC)',
    notes: 'Urgent — check WBC and platelets'
  },

  /** Lab result update payload */
  labResult: {
    status: 'COMPLETED',
    resultText: 'WBC: 7.2, RBC: 4.8, Platelets: 250k — all within normal range.',
    fileUrl: 'https://test-results.example.com/lab/cbc_result.pdf'
  },

  /** Invoice payload */
  invoice: {
    totalAmount: 150.00,
    notes: 'Consultation + CBC test'
  },

  /** Payment payload (pays the invoice in full) */
  payment: {
    amount: 150.00,
    method: 'CASH'
  },

  /** Transition payloads for status changes */
  transitions: {
    toTriage: { toStatus: 'TRIAGE', note: 'Moving patient to triage' },
    toWithDoctor: { toStatus: 'WITH_DOCTOR', note: 'Patient assigned to doctor' },
    toLabOrdered: { toStatus: 'LAB_ORDERED', note: 'Lab tests requested' },
    toBilling: { toStatus: 'BILLING', note: 'Ready for billing' },
    toCheckedOut: { toStatus: 'CHECKED_OUT', note: 'Visit complete' }
  }
};
