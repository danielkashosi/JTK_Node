module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['./tests/helpers/setup.js'],
  testTimeout: 30000,
  verbose: true,
  maxWorkers: 1,
  forceExit: true
};
