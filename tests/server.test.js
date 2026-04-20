// Server smoke test — see integration/full-visit-flow.test.js for full lifecycle coverage
require('dotenv').config({ path: './tests/.env.test' });
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { app } = require('../server');

describe('Server', () => {
  it('responds to unknown routes with 404', async () => {
    const res = await request(app).get('/api/nonexistent-route-xyz');
    expect(res.status).toBe(404);
  });
});
