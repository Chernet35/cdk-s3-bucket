// test/index.test.ts
import * as index from '../src/index';

describe('Index exports', () => {
  it('should export SecureBucket and SecureBucketStack', () => {
    expect(index.SecureBucket).toBeDefined();
    expect(index.SecureBucketStack).toBeDefined();
  });
});
