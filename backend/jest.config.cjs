module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.cjs' }],
  },
  moduleFileExtensions: ['js', 'mjs', 'json', 'node'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)', '**/tests/**/*.test.[jt]s?(x)'],
  roots: ['<rootDir>/src', '<rootDir>/tests', '<rootDir>/src/tests'],
  clearMocks: true,
};
