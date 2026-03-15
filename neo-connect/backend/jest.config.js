module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      branches: 80,
    },
  },
  coveragePathIgnorePatterns: ['/node_modules/', '/prisma/'],
  testTimeout: 30000,
};
