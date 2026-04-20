/**
 * Users test suite
 *
 * Covers:
 *   GET    /api/users             — LISTUSERS permission gate, pagination, filters
 *   POST   /api/users             — CREATEUSER, validation, password strength
 *   GET    /api/users/statuses    — public (auth required but no special perm)
 *   GET    /api/users/:id         — READUSER, 404
 *   PUT    /api/users/:id         — UPDATEUSER, partial update
 *   PATCH  /api/users/:id/status  — UPDATEUSER, invalid status ID
 *   DELETE /api/users/:id         — DELETEUSER, transaction integrity
 */

require('dotenv').config({ path: './tests/.env.test' });
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { app } = require('../server');
const { createTestUser, createAdminUser, getAuthHeader } = require('./helpers/auth');
const { cleanupDb, db } = require('./helpers/db');
const userFixtures = require('./fixtures/users');

// ─────────────────────────────────────────────────────────────────────────────
// Shared test state
// ─────────────────────────────────────────────────────────────────────────────
let adminToken;
let noPermToken;       // token for a user without any permissions
let createdUserId;     // ID of a user created by POST /api/users in tests

beforeAll(async () => {
  await db.sequelize.authenticate();

  const admin = await createAdminUser();
  adminToken = admin.token;

  const noPerm = await createTestUser({ userName: `testuser_noperm_users_${Date.now()}` });
  noPermToken = noPerm.token;
});

afterAll(async () => {
  await cleanupDb();
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/users', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for authenticated user without LISTUSERS permission', async () => {
    const res = await request(app)
      .get('/api/users')
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('returns 200 with paginated user list for admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit');
  });

  it('does not expose password field in list response', async () => {
    const res = await request(app)
      .get('/api/users')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    res.body.data.forEach(user => {
      expect(user).not.toHaveProperty('password');
    });
  });

  it('supports pagination parameters', async () => {
    const res = await request(app)
      .get('/api/users?page=1&limit=2')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(2);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });

  it('supports userName filter', async () => {
    const res = await request(app)
      .get('/api/users?userName=testuser_admin')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    res.body.data.forEach(u => {
      expect(u.userName).toContain('testuser_admin');
    });
  });

  it('caps limit at 100 records', async () => {
    const res = await request(app)
      .get('/api/users?limit=500')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/statuses
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/users/statuses', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/users/statuses');
    expect(res.status).toBe(401);
  });

  it('returns array of statuses for any authenticated user', async () => {
    const res = await request(app)
      .get('/api/users/statuses')
      .set(getAuthHeader(noPermToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // At minimum PENDING and ACTIVE should exist
    const names = res.body.map(s => s.name);
    expect(names).toContain('PENDING');
    expect(names).toContain('ACTIVE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/users', () => {
  it('returns 403 without CREATEUSER permission', async () => {
    const res = await request(app)
      .post('/api/users')
      .set(getAuthHeader(noPermToken))
      .send(userFixtures.validUser());

    expect(res.status).toBe(403);
  });

  it('creates a new user and returns 200 with success message', async () => {
    const payload = userFixtures.validUser();
    const res = await request(app)
      .post('/api/users')
      .set(getAuthHeader(adminToken))
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/created successfully/i);

    // Save the ID for later tests (find by userName since response omits ID)
    const found = await db.users.findOne({ where: { userName: payload.userName } });
    expect(found).not.toBeNull();
    createdUserId = found.ID;
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/users')
      .set(getAuthHeader(adminToken))
      .send(userFixtures.missingFieldsUser);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/empty/i);
  });

  it('returns 400 for password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/users')
      .set(getAuthHeader(adminToken))
      .send(userFixtures.weakPasswordUser());

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8 characters/i);
  });

  it('returns 400 for password without uppercase letter', async () => {
    const res = await request(app)
      .post('/api/users')
      .set(getAuthHeader(adminToken))
      .send(userFixtures.noUppercasePasswordUser());

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/uppercase/i);
  });

  it('returns 400 for password without a number', async () => {
    const res = await request(app)
      .post('/api/users')
      .set(getAuthHeader(adminToken))
      .send(userFixtures.noNumberPasswordUser());

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/number/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/users/:id', () => {
  it('returns 403 without READUSER permission', async () => {
    const res = await request(app)
      .get(`/api/users/${createdUserId}`)
      .set(getAuthHeader(noPermToken));

    expect(res.status).toBe(403);
  });

  it('returns 200 with user data (no password) for admin', async () => {
    const res = await request(app)
      .get(`/api/users/${createdUserId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ID', createdUserId);
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).toHaveProperty('person');
    expect(res.body).toHaveProperty('userStatus');
  });

  it('returns 404 for non-existent user ID', async () => {
    const res = await request(app)
      .get('/api/users/999999999')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/users/:id', () => {
  it('returns 403 without UPDATEUSER permission', async () => {
    const res = await request(app)
      .put(`/api/users/${createdUserId}`)
      .set(getAuthHeader(noPermToken))
      .send(userFixtures.validUpdate);

    expect(res.status).toBe(403);
  });

  it('updates user fields and returns 200 success message', async () => {
    const res = await request(app)
      .put(`/api/users/${createdUserId}`)
      .set(getAuthHeader(adminToken))
      .send(userFixtures.validUpdate);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);
  });

  it('persists the updated firstName in the DB', async () => {
    const user = await db.users.findByPk(createdUserId);
    const person = await db.persons.findByPk(user.person_ID);
    expect(person.firstName).toBe(userFixtures.validUpdate.firstName);
  });

  it('returns 404 for non-existent user ID', async () => {
    const res = await request(app)
      .put('/api/users/999999999')
      .set(getAuthHeader(adminToken))
      .send(userFixtures.validUpdate);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id/status
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/users/:id/status', () => {
  let activeStatusId;
  let pendingStatusId;

  beforeAll(async () => {
    const active = await db.userStatus.findOne({ where: { name: 'ACTIVE' } });
    const pending = await db.userStatus.findOne({ where: { name: 'PENDING' } });
    activeStatusId = active.ID;
    pendingStatusId = pending.ID;
  });

  it('returns 403 without UPDATEUSER permission', async () => {
    const res = await request(app)
      .patch(`/api/users/${createdUserId}/status`)
      .set(getAuthHeader(noPermToken))
      .send({ userStatus_ID: activeStatusId });

    expect(res.status).toBe(403);
  });

  it('changes user status and returns 200', async () => {
    // User is created with PENDING status by the controller; change to ACTIVE (different value)
    const res = await request(app)
      .patch(`/api/users/${createdUserId}/status`)
      .set(getAuthHeader(adminToken))
      .send({ userStatus_ID: activeStatusId });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);
  });

  it('returns 400 when userStatus_ID is missing', async () => {
    const res = await request(app)
      .patch(`/api/users/${createdUserId}/status`)
      .set(getAuthHeader(adminToken))
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid userStatus_ID', async () => {
    const res = await request(app)
      .patch(`/api/users/${createdUserId}/status`)
      .set(getAuthHeader(adminToken))
      .send({ userStatus_ID: 999999 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns 404 for non-existent user', async () => {
    const res = await request(app)
      .patch('/api/users/999999999/status')
      .set(getAuthHeader(adminToken))
      .send({ userStatus_ID: activeStatusId });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/users/:id', () => {
  let userToDeleteId;
  let personToDeleteId;

  beforeAll(async () => {
    // Create a dedicated user for deletion so we don't disturb other tests
    const { user } = await createTestUser({ userName: `testuser_todelete_${Date.now()}` });
    userToDeleteId = user.ID;
    personToDeleteId = user.person_ID;
  });

  it('returns 403 without DELETEUSER permission', async () => {
    const res = await request(app)
      .delete(`/api/users/${userToDeleteId}`)
      .set(getAuthHeader(noPermToken));

    expect(res.status).toBe(403);
  });

  it('deletes user and returns 200', async () => {
    const res = await request(app)
      .delete(`/api/users/${userToDeleteId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted successfully/i);
  });

  it('user record no longer exists in DB (transaction integrity)', async () => {
    const user = await db.users.findByPk(userToDeleteId);
    expect(user).toBeNull();
  });

  it('associated person record is also removed (cascade in transaction)', async () => {
    const person = await db.persons.findByPk(personToDeleteId);
    expect(person).toBeNull();
  });

  it('returns 404 for already-deleted user ID', async () => {
    const res = await request(app)
      .delete(`/api/users/${userToDeleteId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(404);
  });
});
