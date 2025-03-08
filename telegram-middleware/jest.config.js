module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFiles: ['dotenv/config'],
  verbose: true,
  testTimeout: 30000, // 30 seconds timeout for API calls
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  // Add settings for better async handling
  detectOpenHandles: true,
  forceExit: true,
  // Configure console output
  setupFilesAfterEnv: ['./jest.setup.js']
}; 