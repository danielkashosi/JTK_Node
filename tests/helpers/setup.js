/**
 * Global Jest setup — runs after the test framework is installed.
 * Loads the test .env, sets NODE_ENV=test, and suppresses noisy console output.
 */

require('dotenv').config({ path: './tests/.env.test' });
process.env.NODE_ENV = 'test';

const db = require('../../app/models');

// Suppress console.error and console.warn during tests to keep output clean.
beforeAll(async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});

  // Warm up all pool connections before any test runs.
  // MySQL 8 caching_sha2_password uses a fast-auth path for connections
  // that are already cached on the server. By opening all pool connections
  // up front (while the server cache is warm from the first auth), we avoid
  // the cold-cache full-auth handshake that mysql2 cannot handle mid-suite.
  const poolMax = process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : 5;
  await Promise.all(
    Array.from({ length: poolMax }, () => db.sequelize.query('SELECT 1'))
  );
});

afterAll(() => {
  console.error.mockRestore();
  console.warn.mockRestore();
});
