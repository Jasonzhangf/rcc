module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/src'
  ],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/src/**/*.test.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid)/)'
  ],
  moduleDirectories: [
    'node_modules'
  ],
  moduleNameMapper: {
    '^rcc-configuration$': '<rootDir>/node_modules/rcc-configuration/dist/index.js',
    '^rcc-basemodule$': '<rootDir>/node_modules/rcc-basemodule/dist/index.esm.js',
    '^rcc-pipeline$': '<rootDir>/node_modules/rcc-pipeline/dist/index.js',
    '^rcc-virtual-model-rules$': '<rootDir>/node_modules/rcc-virtual-model-rules/dist/index.js'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__test__/**',
    '!src/**/index.ts'
  ],
  testTimeout: 30000
};