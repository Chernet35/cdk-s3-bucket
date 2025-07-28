import { SecureBucket, SecureBucketStack } from '../src/index';

describe('Index exports', () => {
  it('should export SecureBucket', () => {
    expect(SecureBucket).toBeDefined();
  });

  it('should export SecureBucketStack', () => {
    expect(SecureBucketStack).toBeDefined();
  });
});
