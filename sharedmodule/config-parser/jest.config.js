import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__test__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(rcc-basemodule)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    'rcc-basemodule': '<rootDir>/node_modules/rcc-basemodule/dist/index.esm.js'
  },
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    }
  }
};