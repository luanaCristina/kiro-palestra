import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: [
    '**/*.test.ts',
    '**/*.property.test.ts',
  ],
  setupFiles: ['<rootDir>/tests/setup/jest.setup.ts'],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: { allowJs: true } }],
    '^.+\\.mjs$': ['ts-jest', { tsconfig: { allowJs: true } }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@exodus|@asamuzakjp|@csstools|html-encoding-sniffer|parse5|entities|whatwg-|tr46|webidl-conversions|saxes|xml-name-validator|rrweb-cssom|data-urls|decimal\\.js))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/config/migrate.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};

export default config;
