/**
 * Visits test suite
 *
 * Covers the full visit API surface:
 *   POST   /api/visits                        — create/check-in
 *   GET    /api/visits                        — list/queue
 *   GET    /api/visits/stats                  — dashboard counts
 *   GET    /api/visits/:id                    — read single
 *   POST   /api/visits/:id/transition         — status transition
 *   POST   /api/visits/:id/vitals             — save vitals
 *   POST   /api/visits/:id/notes              — save clinical note
 *   POST   /api/visits/:id/lab-orders         — create lab order
 *   GET    /api/visits/:id/lab-orders         — list lab orders
 *   PATCH  /api/visits/:id/lab-orders/:labId  — update lab result
 *   GET    /api/visits/:id/invoice            — get invoice (404 if none)
 *   PUT    /api/visits/:id/invoice            — create/update invoice
 *   POST   /api/visits/:id/invoice/pay        — record payment
 *
 * Also checks permission gates (403) for each route.
 */

require('dotenv').config({ path: './tests/.env.test' });
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { app } = require('../server');
const { createTestUser, createAdminUser, getAuthHeader } = require('./helpers/auth');
const { cleanupDb, db } = require('./helpers/db');
const visitFixtures = require('./fixtures/visits');
const patientFixtures = require('./fixtures/patients');

// ─────────────────────────────────────────────────────────────────────────────
// Shared test state
// ─────────────────────────────────────────────────────────────────────────────
let adminToken;
let noPermToken;
let testPatientId;
let createdVisitId;
let createdLabOrderId;

beforeAll(async () => {
  await db.sequelize.authenticate();

  const admin = await createAdminUser();
  adminToken = admin.token;

  const noPerm = await createTestUser({ userName: `testuser_noperm_visits_${Date.now()}` });
  noPermToken = noPerm.token;

  // Create a patient to associate visits with
  const patient = await db.patient.create({
    firstName: 'TEST_VisitPatFirst',
    lastName: 'TEST_VisitPatLast',
    DOB: '1990-01-01',
    gender: 'M'
  });
  testPatientId = patient.ID;
});

afterAll(async () => {
  await cleanupDb();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/visits — Check-In
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/visits', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app)
      .post('/api/visits')
      .send(visitFixtures.validVisit(testPatientId));
    expect(res.status).toBe(401);
  });

  it('returns 403 for user without CREATEVISIT permission', async () => {
    const res = await request(app)
      .post('/api/visits')
      .set(getAuthHeader(noPermToken))
      .send(visitFixtures.validVisit(testPatientId));
    expect(res.status).toBe(403);
  });

  it('creates a visit and returns 201 with CHECKED_IN status', async () => {
    const res = await request(app)
      .post('/api/visits')
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.validVisit(testPatientId));

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('ID');
    expect(res.body.currentStatus).toBe('CHECKED_IN');
    expect(res.body.patient_ID).toBe(testPatientId);

    createdVisitId = res.body.ID;
  });

  it('returns 400 when patient_ID is missing', async () => {
    const res = await request(app)
      .post('/api/visits')
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.missingPatientIdVisit);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/patient_ID is required/i);
  });

  it('returns 409 if an active visit already exists for that patient', async () => {
    // The same patient already has createdVisitId in CHECKED_IN status
    const res = await request(app)
      .post('/api/visits')
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.validVisit(testPatientId));

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/active visit/i);
    expect(res.body).toHaveProperty('existingVisitId', createdVisitId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/visits/stats
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/visits/stats', () => {
  it('returns 403 for user without LISTVISITS permission', async () => {
    const res = await request(app)
      .get('/api/visits/stats')
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('returns 200 with dashboard stat counts', async () => {
    const res = await request(app)
      .get('/api/visits/stats')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('visitsToday');
    expect(res.body).toHaveProperty('checkedOutToday');
    expect(res.body).toHaveProperty('activeTotal');
    expect(res.body).toHaveProperty('activeByStatus');
    expect(Array.isArray(res.body.activeByStatus)).toBe(true);
    // At least the visit we created should be in visitsToday
    expect(typeof res.body.visitsToday).toBe('number');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/visits
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/visits', () => {
  it('returns 403 for user without LISTVISITS permission', async () => {
    const res = await request(app)
      .get('/api/visits')
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('returns 200 with paginated visit list', async () => {
    const res = await request(app)
      .get('/api/visits')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('can filter by patient_ID', async () => {
    const res = await request(app)
      .get(`/api/visits?patient_ID=${testPatientId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    res.body.data.forEach(v => {
      expect(v.patient_ID).toBe(testPatientId);
    });
  });

  it('can filter activeOnly=true', async () => {
    const res = await request(app)
      .get('/api/visits?activeOnly=true')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    const TERMINAL = ['CHECKED_OUT', 'ABANDONED', 'CANCELLED'];
    res.body.data.forEach(v => {
      expect(TERMINAL).not.toContain(v.currentStatus);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/visits/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/visits/:id', () => {
  it('returns 403 without LISTVISITS permission', async () => {
    const res = await request(app)
      .get(`/api/visits/${createdVisitId}`)
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('returns 200 with full visit detail including includes', async () => {
    const res = await request(app)
      .get(`/api/visits/${createdVisitId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ID', createdVisitId);
    expect(res.body).toHaveProperty('Patient');
    expect(res.body).toHaveProperty('Events');
    expect(Array.isArray(res.body.Events)).toBe(true);
  });

  it('returns 404 for non-existent visit ID', async () => {
    const res = await request(app)
      .get('/api/visits/999999999')
      .set(getAuthHeader(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/visits/:id/transition
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/visits/:id/transition', () => {
  it('returns 403 without UPDATEVISIT permission', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/transition`)
      .set(getAuthHeader(noPermToken))
      .send({ toStatus: 'TRIAGE' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when toStatus is missing', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/transition`)
      .set(getAuthHeader(adminToken))
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/toStatus is required/i);
  });

  it('returns 400 for an invalid toStatus value', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/transition`)
      .set(getAuthHeader(adminToken))
      .send({ toStatus: 'INVALID_STATUS_XYZ' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid toStatus/i);
  });

  it('transitions CHECKED_IN → TRIAGE and returns 200 with updated status', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/transition`)
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.transitions.toTriage);

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe('TRIAGE');
    expect(res.body).toHaveProperty('ID', createdVisitId);
  });

  it('transitions TRIAGE → WITH_DOCTOR', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/transition`)
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.transitions.toWithDoctor);

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe('WITH_DOCTOR');
  });

  it('returns 404 for non-existent visit ID', async () => {
    const res = await request(app)
      .post('/api/visits/999999999/transition')
      .set(getAuthHeader(adminToken))
      .send({ toStatus: 'TRIAGE' });
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/visits/:id/vitals
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/visits/:id/vitals', () => {
  it('returns 403 without UPDATEVISIT permission', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/vitals`)
      .set(getAuthHeader(noPermToken))
      .send(visitFixtures.vitals);
    expect(res.status).toBe(403);
  });

  it('saves vitals and returns 201 with vitals data', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/vitals`)
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.vitals);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('vitals');
    expect(res.body.vitals.bpSystolic).toBe(visitFixtures.vitals.bpSystolic);
    expect(res.body.vitals.bpDiastolic).toBe(visitFixtures.vitals.bpDiastolic);
    expect(res.body.vitals.temperature).toBe(visitFixtures.vitals.temperature);
    expect(res.body.vitals.triageLevel).toBe(visitFixtures.vitals.triageLevel);
    // BMI should be auto-calculated
    expect(res.body.vitals).toHaveProperty('bmi');
    expect(res.body.toStatus).toBe('VITALS_RECORDED');
  });

  it('returns 404 for non-existent visit ID', async () => {
    const res = await request(app)
      .post('/api/visits/999999999/vitals')
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.vitals);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/visits/:id/notes
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/visits/:id/notes', () => {
  it('returns 403 without UPDATEVISIT permission', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/notes`)
      .set(getAuthHeader(noPermToken))
      .send(visitFixtures.note);
    expect(res.status).toBe(403);
  });

  it('saves a clinical note and returns 201', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/notes`)
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.note);

    expect(res.status).toBe(201);
    expect(res.body.toStatus).toBe('CLINICAL_NOTE');
    expect(res.body.note).toBe(visitFixtures.note.noteText);
    expect(res.body).toHaveProperty('PerformedBy');
  });

  it('returns 400 when noteText is empty', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/notes`)
      .set(getAuthHeader(adminToken))
      .send({ noteText: '   ' }); // whitespace only

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/noteText is required/i);
  });

  it('returns 404 for non-existent visit ID', async () => {
    const res = await request(app)
      .post('/api/visits/999999999/notes')
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.note);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/visits/:id/lab-orders  +  GET  +  PATCH
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/visits/:id/lab-orders', () => {
  it('returns 403 without UPDATEVISIT permission', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/lab-orders`)
      .set(getAuthHeader(noPermToken))
      .send(visitFixtures.labOrder);
    expect(res.status).toBe(403);
  });

  it('creates a lab order and returns 201', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/lab-orders`)
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.labOrder);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('ID');
    expect(res.body.testName).toBe(visitFixtures.labOrder.testName);
    expect(res.body.status).toBe('ORDERED');
    expect(res.body.visit_ID).toBe(createdVisitId);

    createdLabOrderId = res.body.ID;
  });

  it('returns 400 when testName is missing', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/lab-orders`)
      .set(getAuthHeader(adminToken))
      .send({ notes: 'No test name provided' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/testName is required/i);
  });
});

describe('GET /api/visits/:id/lab-orders', () => {
  it('returns 403 without LISTVISITS permission', async () => {
    const res = await request(app)
      .get(`/api/visits/${createdVisitId}/lab-orders`)
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('returns 200 with array of lab orders', async () => {
    const res = await request(app)
      .get(`/api/visits/${createdVisitId}/lab-orders`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('testName');
  });
});

describe('PATCH /api/visits/:id/lab-orders/:labId', () => {
  it('returns 403 without UPDATEVISIT permission', async () => {
    const res = await request(app)
      .patch(`/api/visits/${createdVisitId}/lab-orders/${createdLabOrderId}`)
      .set(getAuthHeader(noPermToken))
      .send(visitFixtures.labResult);
    expect(res.status).toBe(403);
  });

  it('updates lab order result and returns 200', async () => {
    const res = await request(app)
      .patch(`/api/visits/${createdVisitId}/lab-orders/${createdLabOrderId}`)
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.labResult);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.resultText).toBe(visitFixtures.labResult.resultText);
    expect(res.body.fileUrl).toBe(visitFixtures.labResult.fileUrl);
    // completedAt should be set automatically
    expect(res.body).toHaveProperty('completedAt');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('returns 400 for invalid (non-http/https) fileUrl', async () => {
    const res = await request(app)
      .patch(`/api/visits/${createdVisitId}/lab-orders/${createdLabOrderId}`)
      .set(getAuthHeader(adminToken))
      .send({ fileUrl: 'javascript:alert(1)' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid fileUrl/i);
  });

  it('returns 404 for non-existent lab order ID', async () => {
    const res = await request(app)
      .patch(`/api/visits/${createdVisitId}/lab-orders/999999999`)
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.labResult);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/visits/:id/invoice  (before any invoice is created)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/visits/:id/invoice — before creation', () => {
  it('returns 403 without LISTVISITS permission', async () => {
    const res = await request(app)
      .get(`/api/visits/${createdVisitId}/invoice`)
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('returns 404 when no invoice exists yet', async () => {
    const res = await request(app)
      .get(`/api/visits/${createdVisitId}/invoice`)
      .set(getAuthHeader(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/No invoice/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/visits/:id/invoice  — create / update
// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/visits/:id/invoice', () => {
  it('returns 403 without CLOSEVISIT permission', async () => {
    const res = await request(app)
      .put(`/api/visits/${createdVisitId}/invoice`)
      .set(getAuthHeader(noPermToken))
      .send(visitFixtures.invoice);
    expect(res.status).toBe(403);
  });

  it('creates an invoice and returns 200 with PENDING status', async () => {
    const res = await request(app)
      .put(`/api/visits/${createdVisitId}/invoice`)
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.invoice);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ID');
    expect(res.body.visit_ID).toBe(createdVisitId);
    expect(parseFloat(res.body.totalAmount)).toBe(visitFixtures.invoice.totalAmount);
    expect(res.body.status).toBe('PENDING');
    expect(res.body).toHaveProperty('Payments');
    expect(Array.isArray(res.body.Payments)).toBe(true);
  });

  it('updates an existing invoice when called again', async () => {
    const res = await request(app)
      .put(`/api/visits/${createdVisitId}/invoice`)
      .set(getAuthHeader(adminToken))
      .send({ totalAmount: 200.00, notes: 'Updated amount' });

    expect(res.status).toBe(200);
    expect(parseFloat(res.body.totalAmount)).toBe(200.00);
    expect(res.body.notes).toBe('Updated amount');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/visits/:id/invoice  — after creation
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/visits/:id/invoice — after creation', () => {
  it('returns 200 with invoice including empty Payments array', async () => {
    const res = await request(app)
      .get(`/api/visits/${createdVisitId}/invoice`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ID');
    expect(res.body.status).toBe('PENDING');
    expect(res.body).toHaveProperty('Payments');
    expect(Array.isArray(res.body.Payments)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/visits/:id/invoice/pay
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/visits/:id/invoice/pay', () => {
  it('returns 403 without CLOSEVISIT permission', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/invoice/pay`)
      .set(getAuthHeader(noPermToken))
      .send(visitFixtures.payment);
    expect(res.status).toBe(403);
  });

  it('records a payment and returns 200 with updated invoice', async () => {
    // First set invoice amount to a known value
    await request(app)
      .put(`/api/visits/${createdVisitId}/invoice`)
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.invoice); // totalAmount = 150

    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/invoice/pay`)
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.payment); // amount = 150 (pays in full)

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('Payments');
    expect(res.body.Payments.length).toBeGreaterThanOrEqual(1);
    // Since payment covers full amount, status should be PAID
    expect(res.body.status).toBe('PAID');
  });

  it('returns 400 when amount is missing', async () => {
    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/invoice/pay`)
      .set(getAuthHeader(adminToken))
      .send({ method: 'CASH' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/amount is required/i);
  });

  it('returns 404 when no invoice exists for the visit', async () => {
    // Create a fresh patient and visit with no invoice
    const freshPatient = await db.patient.create({
      firstName: 'TEST_NoinvFirst',
      lastName: 'TEST_NoinvLast'
    });
    const freshVisit = await request(app)
      .post('/api/visits')
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.validVisit(freshPatient.ID));

    const res = await request(app)
      .post(`/api/visits/${freshVisit.body.ID}/invoice/pay`)
      .set(getAuthHeader(adminToken))
      .send(visitFixtures.payment);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Invoice not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Terminal status — cannot transition out of CHECKED_OUT
// ─────────────────────────────────────────────────────────────────────────────
describe('Transition from terminal status', () => {
  it('cannot transition a CHECKED_OUT visit', async () => {
    // Transition our visit to CHECKED_OUT
    await request(app)
      .post(`/api/visits/${createdVisitId}/transition`)
      .set(getAuthHeader(adminToken))
      .send({ toStatus: 'CHECKED_OUT' });

    const res = await request(app)
      .post(`/api/visits/${createdVisitId}/transition`)
      .set(getAuthHeader(adminToken))
      .send({ toStatus: 'TRIAGE' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Cannot transition/i);
  });
});
