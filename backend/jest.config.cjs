module.exports = {
  testEnvironment: 'node',
  transform: {},
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.cjs' }]
  },
  moduleFileExtensions: ['js', 'json', 'node'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)', '**/tests/**/*.test.[jt]s?(x)'],
  roots: ['<rootDir>/src', '<rootDir>/tests', '<rootDir>/src/tests'],
};
