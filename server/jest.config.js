// Jest runs with --experimental-vm-modules (see package.json) so native ESM
// works without a transform step.
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30_000,
  verbose: true,
};
