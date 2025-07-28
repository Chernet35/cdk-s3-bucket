import * as exports from '../src/index';

describe('Index Exports', () => {
  it('should export SecureBucket', () => {
    expect(exports).toHaveProperty('SecureBucket');
  });

  it('should export SecureBucketStack', () => {
    expect(exports).toHaveProperty('SecureBucketStack');
  });
});
