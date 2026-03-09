export default {
  displayName: 'server',
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/unit/**/*.test.js', '**/__tests__/integration/**/*.test.js'],
  collectCoverageFrom: [
    'lib/speechClarity/**/*.js',
    '!lib/speechClarity/**/*.test.js',
    '!__tests__/**'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/lib/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 10000,
  verbose: true,
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverage: false,
  bail: false
};
