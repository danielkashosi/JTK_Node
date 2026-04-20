/**
 * Integration test: Full Visit Lifecycle
 *
 * This test runs the COMPLETE visit workflow in a single sequential describe
 * block using beforeAll/afterAll. Each step depends on the previous one.
 *
 * Flow:
 *  1.  Create test patient
 *  2.  Start a visit (→ CHECKED_IN)
 *  3.  Transition → TRIAGE
 *  4.  Record vitals
 *  5.  Transition → WITH_DOCTOR
 *  6.  Write clinical note
 *  7.  Create lab order
 *  8.  Update lab result (→ COMPLETED)
 *  9.  Transition → BILLING
 * 10.  Create invoice
 * 11.  Pay invoice in full
 * 12.  Transition → CHECKED_OUT
 * 13.  Assert final visit status = CHECKED_OUT, invoice status = PAID
 */

require('dotenv').config({ path: './tests/.env.test' });
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { app } = require('../../server');
const { createAdminUser, getAuthHeader } = require('../helpers/auth');
const { cleanupDb, db } = require('../helpers/db');

// ─────────────────────────────────────────────────────────────────────────────
// State accumulated across steps
// ─────────────────────────────────────────────────────────────────────────────
let adminToken;
let patient;
let visit;
let vitalsEvent;
let noteEvent;
let labOrder;
let invoice;

// ─────────────────────────────────────────────────────────────────────────────
// Setup / Teardown
// ─────────────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  await db.sequelize.authenticate();

  const admin = await createAdminUser();
  adminToken = admin.token;
});

afterAll(async () => {
  await cleanupDb();
});

// ─────────────────────────────────────────────────────────────────────────────
// Sequential lifecycle
// ─────────────────────────────────────────────────────────────────────────────
describe('Full Visit Lifecycle', () => {

  // ── Step 1: Create a test patient ─────────────────────────────────────────
  it('Step 1 — creates a test patient', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set(getAuthHeader(adminToken))
      .send({
        firstName: 'TEST_IntFirst',
        lastName: 'TEST_IntLast',
        DOB: '1985-07-20',
        gender: 'F',
        nationalID: `TEST_INT_NID_${Date.now()}`,
        phone: '0712345678'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('ID');
    patient = res.body;
  });

  // ── Step 2: Start a visit (CHECKED_IN) ───────────────────────────────────
  it('Step 2 — checks patient in (status = CHECKED_IN)', async () => {
    const res = await request(app)
      .post('/api/visits')
      .set(getAuthHeader(adminToken))
      .send({
        patient_ID: patient.ID,
        reasonText: 'Integration test check-in'
      });

    expect(res.status).toBe(201);
    expect(res.body.currentStatus).toBe('CHECKED_IN');
    expect(res.body.patient_ID).toBe(patient.ID);
    visit = res.body;
  });

  // ── Step 3: Transition → TRIAGE ──────────────────────────────────────────
  it('Step 3 — transitions to TRIAGE', async () => {
    const res = await request(app)
      .post(`/api/visits/${visit.ID}/transition`)
      .set(getAuthHeader(adminToken))
      .send({ toStatus: 'TRIAGE', note: 'Sending to triage' });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe('TRIAGE');
    visit = res.body;
  });

  // ── Step 4: Record vitals ─────────────────────────────────────────────────
  it('Step 4 — records vitals', async () => {
    const res = await request(app)
      .post(`/api/visits/${visit.ID}/vitals`)
      .set(getAuthHeader(adminToken))
      .send({
        bpSystolic: 118,
        bpDiastolic: 76,
        temperature: 37.1,
        pulse: 68,
        spo2: 99,
        weight: 62,
        height: 165,
        triageLevel: 'GREEN'
      });

    expect(res.status).toBe(201);
    expect(res.body.toStatus).toBe('VITALS_RECORDED');
    expect(res.body.vitals.triageLevel).toBe('GREEN');
    // BMI auto-calculated: 62 / (1.65^2) ≈ 22.8
    expect(parseFloat(res.body.vitals.bmi)).toBeGreaterThan(20);
    vitalsEvent = res.body;
  });

  // ── Step 5: Transition → WITH_DOCTOR ─────────────────────────────────────
  it('Step 5 — transitions to WITH_DOCTOR', async () => {
    const res = await request(app)
      .post(`/api/visits/${visit.ID}/transition`)
      .set(getAuthHeader(adminToken))
      .send({ toStatus: 'WITH_DOCTOR', note: 'Patient assigned to doctor' });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe('WITH_DOCTOR');
    visit = res.body;
  });

  // ── Step 6: Write clinical note ───────────────────────────────────────────
  it('Step 6 — writes a clinical note', async () => {
    const noteText = 'Patient presents with mild headache. Prescribed paracetamol 500mg.';

    const res = await request(app)
      .post(`/api/visits/${visit.ID}/notes`)
      .set(getAuthHeader(adminToken))
      .send({ noteText });

    expect(res.status).toBe(201);
    expect(res.body.toStatus).toBe('CLINICAL_NOTE');
    expect(res.body.note).toBe(noteText);
    expect(res.body).toHaveProperty('PerformedBy');
    noteEvent = res.body;
  });

  // ── Step 7: Create lab order ──────────────────────────────────────────────
  it('Step 7 — creates a lab order', async () => {
    const res = await request(app)
      .post(`/api/visits/${visit.ID}/lab-orders`)
      .set(getAuthHeader(adminToken))
      .send({
        testName: 'Full Blood Count (FBC)',
        notes: 'Check WBC, RBC, Platelets'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('ID');
    expect(res.body.testName).toBe('Full Blood Count (FBC)');
    expect(res.body.status).toBe('ORDERED');
    labOrder = res.body;
  });

  // ── Step 8: Update lab result ─────────────────────────────────────────────
  it('Step 8 — updates lab result (→ COMPLETED)', async () => {
    const res = await request(app)
      .patch(`/api/visits/${visit.ID}/lab-orders/${labOrder.ID}`)
      .set(getAuthHeader(adminToken))
      .send({
        status: 'COMPLETED',
        resultText: 'WBC: 6.8, RBC: 4.5, Platelets: 240k — all normal.',
        fileUrl: 'https://results.test-hospital.example.com/fbc_12345.pdf'
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.resultText).toBeTruthy();
    expect(res.body.completedAt).not.toBeNull();
    labOrder = res.body;
  });

  // ── Step 9: Transition → BILLING ─────────────────────────────────────────
  it('Step 9 — transitions to BILLING', async () => {
    const res = await request(app)
      .post(`/api/visits/${visit.ID}/transition`)
      .set(getAuthHeader(adminToken))
      .send({ toStatus: 'BILLING', note: 'Sending to billing' });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe('BILLING');
    visit = res.body;
  });

  // ── Step 10: Create invoice ───────────────────────────────────────────────
  it('Step 10 — creates invoice (status = PENDING)', async () => {
    const res = await request(app)
      .put(`/api/visits/${visit.ID}/invoice`)
      .set(getAuthHeader(adminToken))
      .send({
        totalAmount: 350.00,
        notes: 'Consultation fee + FBC lab test'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ID');
    expect(parseFloat(res.body.totalAmount)).toBe(350.00);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.visit_ID).toBe(visit.ID);
    invoice = res.body;
  });

  // ── Step 11: Pay invoice in full ──────────────────────────────────────────
  it('Step 11 — pays invoice in full (invoice status → PAID)', async () => {
    const res = await request(app)
      .post(`/api/visits/${visit.ID}/invoice/pay`)
      .set(getAuthHeader(adminToken))
      .send({
        amount: 350.00,
        method: 'CASH'
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PAID');
    expect(res.body.Payments.length).toBeGreaterThanOrEqual(1);

    const payment = res.body.Payments.find(p => parseFloat(p.amount) === 350.00);
    expect(payment).toBeDefined();
    expect(payment.method).toBe('CASH');
    invoice = res.body;
  });

  // ── Step 12: Transition → CHECKED_OUT ────────────────────────────────────
  it('Step 12 — transitions to CHECKED_OUT', async () => {
    const res = await request(app)
      .post(`/api/visits/${visit.ID}/transition`)
      .set(getAuthHeader(adminToken))
      .send({ toStatus: 'CHECKED_OUT', note: 'Visit complete — patient discharged' });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe('CHECKED_OUT');
    visit = res.body;
  });

  // ── Step 13: Final assertions ─────────────────────────────────────────────
  it('Step 13 — final state: visit = CHECKED_OUT, invoice = PAID', async () => {
    // Re-fetch visit from DB to confirm persisted state
    const dbVisit = await db.visit.findByPk(visit.ID);
    expect(dbVisit.currentStatus).toBe('CHECKED_OUT');
    expect(dbVisit.checkedOutAt).not.toBeNull();

    // Re-fetch invoice from DB to confirm persisted state
    const dbInvoice = await db.invoice.findByPk(invoice.ID);
    expect(dbInvoice.status).toBe('PAID');

    // Verify via API as well
    const visitRes = await request(app)
      .get(`/api/visits/${visit.ID}`)
      .set(getAuthHeader(adminToken));

    expect(visitRes.status).toBe(200);
    expect(visitRes.body.currentStatus).toBe('CHECKED_OUT');
    expect(visitRes.body.Invoice).toBeDefined();
    expect(visitRes.body.Invoice.status).toBe('PAID');
    expect(Array.isArray(visitRes.body.Invoice.Payments)).toBe(true);
    expect(visitRes.body.Invoice.Payments.length).toBeGreaterThanOrEqual(1);

    // Verify event trail
    expect(Array.isArray(visitRes.body.Events)).toBe(true);
    const statuses = visitRes.body.Events.map(e => e.toStatus);
    expect(statuses).toContain('CHECKED_IN');
    expect(statuses).toContain('TRIAGE');
    expect(statuses).toContain('VITALS_RECORDED');
    expect(statuses).toContain('WITH_DOCTOR');
    expect(statuses).toContain('CLINICAL_NOTE');
    expect(statuses).toContain('BILLING');
    expect(statuses).toContain('CHECKED_OUT');

    // Cannot transition out of CHECKED_OUT (terminal)
    const terminalRes = await request(app)
      .post(`/api/visits/${visit.ID}/transition`)
      .set(getAuthHeader(adminToken))
      .send({ toStatus: 'TRIAGE' });
    expect(terminalRes.status).toBe(400);
    expect(terminalRes.body.message).toMatch(/Cannot transition/i);
  });
});
