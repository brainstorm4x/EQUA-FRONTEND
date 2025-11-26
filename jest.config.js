const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/e2e/', '<rootDir>/__tests__/utils/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!app/layout.tsx',
    '!app/globals.css',
    // Exclude blockchain integration files (tested via integration tests)
    '!src/lib/program.ts',
    '!src/services/**',
    '!src/hooks/useProgram.ts',
    '!src/hooks/useEquaProgram.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 29,
      lines: 24,
      statements: 24,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
