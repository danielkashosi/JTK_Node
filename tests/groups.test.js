/**
 * Groups test suite
 *
 * Covers:
 *   GET    /api/groups                          — LISTGROUPS permission gate, filters
 *   POST   /api/groups                          — CREATEGROUP, validation
 *   GET    /api/groups/statuses                 — any authenticated user
 *   GET    /api/groups/:id                      — READGROUP, 404
 *   PUT    /api/groups/:id                      — UPDATEGROUP
 *   DELETE /api/groups/:id                      — DELETEGROUP
 *   POST   /api/groups/:id/members              — UPDATEGROUP, duplicate check
 *   GET    /api/groups/:id/members              — READGROUP
 *   DELETE /api/groups/:id/members/:userId      — UPDATEGROUP, 404
 *   GET    /api/groups/:id/permissions          — READGROUP
 *   POST   /api/groups/:id/permissions          — UPDATEGROUP, duplicate check
 *   DELETE /api/groups/:id/permissions/:tfId    — UPDATEGROUP, 404
 */

require('dotenv').config({ path: './tests/.env.test' });
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { app } = require('../server');
const { createTestUser, createAdminUser, getAuthHeader } = require('./helpers/auth');
const { cleanupDb, db } = require('./helpers/db');

// ─────────────────────────────────────────────────────────────────────────────
// Shared test state
// ─────────────────────────────────────────────────────────────────────────────
let adminToken;
let noPermToken;
let groupStatusId;       // ID of a GroupStatus row for test group creation
let createdGroupId;      // ID of the group created during tests
let memberUserId;        // ID of a test user added as a member
let taskFeatureId;       // ID of a TaskFeature to assign as a permission

beforeAll(async () => {
  await db.sequelize.authenticate();

  const admin = await createAdminUser();
  adminToken = admin.token;

  const noPerm = await createTestUser({ userName: `testuser_noperm_groups_${Date.now()}` });
  noPermToken = noPerm.token;

  // Look up a real GroupStatus ID to use in create payloads
  const status = await db.groupStatus.findOne();
  if (!status) throw new Error('No GroupStatus rows found — check DB seeding.');
  groupStatusId = status.ID;

  // Look up a real TaskFeature to use in permission tests
  const tf = await db.taskFeature.findOne();
  if (!tf) throw new Error('No TaskFeature rows found — check DB seeding.');
  taskFeatureId = tf.ID;

  // Create a user to add/remove as a member
  const member = await createTestUser({ userName: `testuser_groupmember_${Date.now()}` });
  memberUserId = member.user.ID;
});

afterAll(async () => {
  await cleanupDb();
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/groups/statuses  — public (any authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/groups/statuses', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/groups/statuses');
    expect(res.status).toBe(401);
  });

  it('returns array of group statuses for any authenticated user', async () => {
    const res = await request(app)
      .get('/api/groups/statuses')
      .set(getAuthHeader(noPermToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('ID');
    expect(res.body[0]).toHaveProperty('name');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/groups
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/groups', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(401);
  });

  it('returns 403 for user without LISTGROUPS permission', async () => {
    const res = await request(app)
      .get('/api/groups')
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('returns 200 with array of groups for admin', async () => {
    const res = await request(app)
      .get('/api/groups')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('supports name filter', async () => {
    // First create a group so we have something to filter on
    await db.group.create({
      name: 'TEST_FilterGroup',
      description: 'A filterable test group',
      groupStatus_ID: groupStatusId
    });

    const res = await request(app)
      .get('/api/groups?name=TEST_FilterGroup')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.some(g => g.name === 'TEST_FilterGroup')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/groups
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/groups', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/groups').send({});
    expect(res.status).toBe(401);
  });

  it('returns 403 for user without CREATEGROUP permission', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set(getAuthHeader(noPermToken))
      .send({
        name: 'TEST_NoPermGroup',
        description: 'Should not be created',
        groupStatus_ID: groupStatusId
      });
    expect(res.status).toBe(403);
  });

  it('creates a group and returns 200 with success message', async () => {
    const payload = {
      name: `TEST_Group_${Date.now()}`,
      description: 'A test group created by test suite',
      groupStatus_ID: groupStatusId
    };

    const res = await request(app)
      .post('/api/groups')
      .set(getAuthHeader(adminToken))
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/created successfully/i);

    // Save the ID for subsequent tests
    const found = await db.group.findOne({ where: { name: payload.name } });
    expect(found).not.toBeNull();
    createdGroupId = found.ID;
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set(getAuthHeader(adminToken))
      .send({ name: `TEST_Incomplete_${Date.now()}` }); // missing description + groupStatus_ID

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/empty/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/groups/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/groups/:id', () => {
  it('returns 403 without READGROUP permission', async () => {
    const res = await request(app)
      .get(`/api/groups/${createdGroupId}`)
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('returns 200 with group data for admin', async () => {
    const res = await request(app)
      .get(`/api/groups/${createdGroupId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ID', createdGroupId);
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('description');
  });

  it('returns 404 for non-existent group ID', async () => {
    const res = await request(app)
      .get('/api/groups/999999999')
      .set(getAuthHeader(adminToken));
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/groups/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/groups/:id', () => {
  it('returns 403 without UPDATEGROUP permission', async () => {
    const res = await request(app)
      .put(`/api/groups/${createdGroupId}`)
      .set(getAuthHeader(noPermToken))
      .send({ description: 'Should not update' });
    expect(res.status).toBe(403);
  });

  it('updates group and returns 200 with success message', async () => {
    const res = await request(app)
      .put(`/api/groups/${createdGroupId}`)
      .set(getAuthHeader(adminToken))
      .send({ description: 'Updated description by test suite' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);
  });

  it('persists the updated description in the DB', async () => {
    const group = await db.group.findByPk(createdGroupId);
    expect(group.description).toBe('Updated description by test suite');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/groups/:id/members  +  GET  +  DELETE
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/groups/:id/members', () => {
  it('returns 403 without UPDATEGROUP permission', async () => {
    const res = await request(app)
      .post(`/api/groups/${createdGroupId}/members`)
      .set(getAuthHeader(noPermToken))
      .send({ user_ID: memberUserId });
    expect(res.status).toBe(403);
  });

  it('adds a member and returns 200 with success message', async () => {
    const res = await request(app)
      .post(`/api/groups/${createdGroupId}/members`)
      .set(getAuthHeader(adminToken))
      .send({ user_ID: memberUserId });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/added to group successfully/i);
  });

  it('returns 400 when trying to add the same user twice', async () => {
    const res = await request(app)
      .post(`/api/groups/${createdGroupId}/members`)
      .set(getAuthHeader(adminToken))
      .send({ user_ID: memberUserId });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists in the group/i);
  });

  it('returns 400 when user_ID is missing', async () => {
    const res = await request(app)
      .post(`/api/groups/${createdGroupId}/members`)
      .set(getAuthHeader(adminToken))
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /api/groups/:id/members', () => {
  it('returns 403 without READGROUP permission', async () => {
    const res = await request(app)
      .get(`/api/groups/${createdGroupId}/members`)
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('returns 200 with array of member users', async () => {
    const res = await request(app)
      .get(`/api/groups/${createdGroupId}/members`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    const ids = res.body.map(u => u.ID);
    expect(ids).toContain(memberUserId);
    // Passwords must not be exposed
    res.body.forEach(u => expect(u).not.toHaveProperty('password'));
  });

  it('returns empty array for group with no members (fresh group)', async () => {
    // Create a fresh group with no members
    const fresh = await db.group.create({
      name: `TEST_EmptyGroup_${Date.now()}`,
      description: 'No members',
      groupStatus_ID: groupStatusId
    });

    const res = await request(app)
      .get(`/api/groups/${fresh.ID}/members`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('DELETE /api/groups/:id/members/:userId', () => {
  it('returns 403 without UPDATEGROUP permission', async () => {
    const res = await request(app)
      .delete(`/api/groups/${createdGroupId}/members/${memberUserId}`)
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('removes member and returns 200 with success message', async () => {
    const res = await request(app)
      .delete(`/api/groups/${createdGroupId}/members/${memberUserId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed from group successfully/i);
  });

  it('returns 404 when member not in group', async () => {
    const res = await request(app)
      .delete(`/api/groups/${createdGroupId}/members/${memberUserId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/groups/:id/permissions  +  GET  +  DELETE
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/groups/:id/permissions', () => {
  it('returns 403 without UPDATEGROUP permission', async () => {
    const res = await request(app)
      .post(`/api/groups/${createdGroupId}/permissions`)
      .set(getAuthHeader(noPermToken))
      .send({ taskFeature_ID: taskFeatureId });
    expect(res.status).toBe(403);
  });

  it('adds a permission and returns 200 with success message', async () => {
    const res = await request(app)
      .post(`/api/groups/${createdGroupId}/permissions`)
      .set(getAuthHeader(adminToken))
      .send({ taskFeature_ID: taskFeatureId });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/permission added to group successfully/i);
  });

  it('returns 400 when trying to add the same permission twice', async () => {
    const res = await request(app)
      .post(`/api/groups/${createdGroupId}/permissions`)
      .set(getAuthHeader(adminToken))
      .send({ taskFeature_ID: taskFeatureId });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already assigned/i);
  });

  it('returns 400 when taskFeature_ID is missing', async () => {
    const res = await request(app)
      .post(`/api/groups/${createdGroupId}/permissions`)
      .set(getAuthHeader(adminToken))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/taskFeature_ID is required/i);
  });
});

describe('GET /api/groups/:id/permissions', () => {
  it('returns 403 without READGROUP permission', async () => {
    const res = await request(app)
      .get(`/api/groups/${createdGroupId}/permissions`)
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('returns 200 with array of task features assigned to the group', async () => {
    const res = await request(app)
      .get(`/api/groups/${createdGroupId}/permissions`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    const ids = res.body.map(tf => tf.ID);
    expect(ids).toContain(taskFeatureId);
  });

  it('returns empty array for group with no permissions', async () => {
    const fresh = await db.group.create({
      name: `TEST_NopermGroup_${Date.now()}`,
      description: 'No permissions',
      groupStatus_ID: groupStatusId
    });

    const res = await request(app)
      .get(`/api/groups/${fresh.ID}/permissions`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('DELETE /api/groups/:id/permissions/:tfId', () => {
  it('returns 403 without UPDATEGROUP permission', async () => {
    const res = await request(app)
      .delete(`/api/groups/${createdGroupId}/permissions/${taskFeatureId}`)
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('removes permission and returns 200 with success message', async () => {
    const res = await request(app)
      .delete(`/api/groups/${createdGroupId}/permissions/${taskFeatureId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/permission removed from group successfully/i);
  });

  it('returns 404 when permission not found in group', async () => {
    const res = await request(app)
      .delete(`/api/groups/${createdGroupId}/permissions/${taskFeatureId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/groups/:id
// (run last so we don't destroy the group while other describes still need it)
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/groups/:id', () => {
  let groupToDeleteId;

  beforeAll(async () => {
    const g = await db.group.create({
      name: `TEST_DeleteTarget_${Date.now()}`,
      description: 'Will be deleted',
      groupStatus_ID: groupStatusId
    });
    groupToDeleteId = g.ID;
  });

  it('returns 403 without DELETEGROUP permission', async () => {
    const res = await request(app)
      .delete(`/api/groups/${groupToDeleteId}`)
      .set(getAuthHeader(noPermToken));
    expect(res.status).toBe(403);
  });

  it('deletes the group and returns 200 with success message', async () => {
    const res = await request(app)
      .delete(`/api/groups/${groupToDeleteId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted successfully/i);
  });

  it('group no longer exists in DB', async () => {
    const group = await db.group.findByPk(groupToDeleteId);
    expect(group).toBeNull();
  });

  it('returns 400 for already-deleted group ID', async () => {
    const res = await request(app)
      .delete(`/api/groups/${groupToDeleteId}`)
      .set(getAuthHeader(adminToken));

    // Controller returns 400 when destroy count is 0
    expect(res.status).toBe(400);
  });
});
