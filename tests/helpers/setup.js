/**
 * Global Jest setup — runs after the test framework is installed.
 * Loads the test .env, sets NODE_ENV=test, and suppresses noisy console output.
 */

// Load test environment variables BEFORE any module that reads process.env
require('dotenv').config({ path: './tests/.env.test' });

// Ensure NODE_ENV is always 'test' during the test run
process.env.NODE_ENV = 'test';

// Suppress console.error and console.warn during tests to keep output clean.
// Tests that need to assert on logged errors can restore these per-test.
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
  console.warn.mockRestore();
});
