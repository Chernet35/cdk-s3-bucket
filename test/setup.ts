import 'jest';

// Global test setup
beforeEach(() => {
  // Set default environment variables for tests
  process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
  process.env.CDK_DEFAULT_REGION = 'us-east-1';
  process.env.GITHUB_REPOSITORY = 'astrazeneca/test-repo';
});

afterEach(() => {
  // Clean up any test-specific environment variables
  delete process.env.TEST_SPECIFIC_VAR;
});