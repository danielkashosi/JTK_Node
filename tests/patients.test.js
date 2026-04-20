/**
 * Patients test suite
 *
 * Covers:
 *   GET  /api/patients          — LISTPATIENTS permission gate, pagination, search
 *   POST /api/patients          — CREATEPATIENT, validation, duplicate nationalID
 *   GET  /api/patients/:id      — READPATIENT, 404
 *   PUT  /api/patients/:id      — UPDATEPATIENT, 404, duplicate nationalID
 */

require('dotenv').config({ path: './tests/.env.test' });
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { app } = require('../server');
const { createTestUser, createAdminUser, getAuthHeader } = require('./helpers/auth');
const { cleanupDb, db } = require('./helpers/db');
const patientFixtures = require('./fixtures/patients');

// ─────────────────────────────────────────────────────────────────────────────
// Shared test state
// ─────────────────────────────────────────────────────────────────────────────
let adminToken;
let noPermToken;
let createdPatientId;
let uniqueNationalId; // For duplicate-NID test

beforeAll(async () => {
  await db.sequelize.authenticate();

  const admin = await createAdminUser();
  adminToken = admin.token;

  const noPerm = await createTestUser({ userName: `testuser_noperm_patients_${Date.now()}` });
  noPermToken = noPerm.token;
});

afterAll(async () => {
  await cleanupDb();
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/patients
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/patients', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  it('returns 403 for authenticated user without LISTPATIENTS permission', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('returns 200 with paginated patient list for admin', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('supports pagination parameters', async () => {
    const res = await request(app)
      .get('/api/patients?page=1&pageSize=2')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });

  it('supports search query — filters by firstName', async () => {
    // Create a patient to search for
    const payload = patientFixtures.validPatient();
    await request(app)
      .post('/api/patients')
      .set(getAuthHeader(adminToken))
      .send(payload);

    const res = await request(app)
      .get(`/api/patients?search=${encodeURIComponent('TEST_PatientFirst')}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    // The search term should appear somewhere in results
    const names = res.body.data.map(p => p.firstName);
    expect(names.some(n => n.includes('TEST_PatientFirst'))).toBe(true);
  });

  it('returns an empty data array when search matches nothing', async () => {
    const res = await request(app)
      .get('/api/patients?search=ZZZNOTEXIST_XYZ_999')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/patients
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/patients', () => {
  it('returns 403 without CREATEPATIENT permission', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set(getAuthHeader(noPermToken))
      .send(patientFixtures.validPatient());

    expect(res.status).toBe(403);
  });

  it('creates a patient and returns 201 with patient data', async () => {
    const payload = patientFixtures.validPatient();
    uniqueNationalId = payload.nationalID; // save for duplicate test

    const res = await request(app)
      .post('/api/patients')
      .set(getAuthHeader(adminToken))
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('ID');
    expect(res.body.firstName).toBe(payload.firstName);
    expect(res.body.lastName).toBe(payload.lastName);
    expect(res.body.nationalID).toBe(payload.nationalID);

    createdPatientId = res.body.ID;
  });

  it('creates a patient with minimal required fields', async () => {
    const payload = patientFixtures.minimalPatient();
    const res = await request(app)
      .post('/api/patients')
      .set(getAuthHeader(adminToken))
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('ID');
    expect(res.body.firstName).toBe(payload.firstName);
  });

  it('returns 400 when firstName and lastName are missing', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set(getAuthHeader(adminToken))
      .send(patientFixtures.missingNamesPatient);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/firstName and lastName are required/i);
  });

  it('returns 409 for duplicate nationalID', async () => {
    // Use the same nationalID from the first create
    const res = await request(app)
      .post('/api/patients')
      .set(getAuthHeader(adminToken))
      .send({
        firstName: 'TEST_DupFirst',
        lastName: 'TEST_DupLast',
        nationalID: uniqueNationalId
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/National ID already exists/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/patients/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/patients/:id', () => {
  it('returns 403 without READPATIENT permission', async () => {
    const res = await request(app)
      .get(`/api/patients/${createdPatientId}`)
      .set(getAuthHeader(noPermToken));

    expect(res.status).toBe(403);
  });

  it('returns 200 with patient data for admin', async () => {
    const res = await request(app)
      .get(`/api/patients/${createdPatientId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ID', createdPatientId);
    expect(res.body).toHaveProperty('firstName');
    expect(res.body).toHaveProperty('lastName');
  });

  it('returns 404 for non-existent patient ID', async () => {
    const res = await request(app)
      .get('/api/patients/999999999')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/patients/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/patients/:id', () => {
  it('returns 403 without UPDATEPATIENT permission', async () => {
    const res = await request(app)
      .put(`/api/patients/${createdPatientId}`)
      .set(getAuthHeader(noPermToken))
      .send(patientFixtures.validUpdate);

    expect(res.status).toBe(403);
  });

  it('updates patient fields and returns 200 with updated data', async () => {
    const res = await request(app)
      .put(`/api/patients/${createdPatientId}`)
      .set(getAuthHeader(adminToken))
      .send(patientFixtures.validUpdate);

    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe(patientFixtures.validUpdate.firstName);
    expect(res.body.lastName).toBe(patientFixtures.validUpdate.lastName);
    expect(res.body.phone).toBe(patientFixtures.validUpdate.phone);
  });

  it('persists the updated fields in the DB', async () => {
    const patient = await db.patient.findByPk(createdPatientId);
    expect(patient.firstName).toBe(patientFixtures.validUpdate.firstName);
    expect(patient.lastName).toBe(patientFixtures.validUpdate.lastName);
  });

  it('returns 404 for non-existent patient ID', async () => {
    const res = await request(app)
      .put('/api/patients/999999999')
      .set(getAuthHeader(adminToken))
      .send(patientFixtures.validUpdate);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('returns 409 when updating nationalID to one that already exists', async () => {
    // Create a second patient
    const second = await request(app)
      .post('/api/patients')
      .set(getAuthHeader(adminToken))
      .send(patientFixtures.validPatient());
    const secondId = second.body.ID;
    const secondNid = second.body.nationalID;

    // Try to update createdPatientId's nationalID to the second patient's NID
    const res = await request(app)
      .put(`/api/patients/${createdPatientId}`)
      .set(getAuthHeader(adminToken))
      .send({ nationalID: secondNid });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/National ID already exists/i);
  });
});
