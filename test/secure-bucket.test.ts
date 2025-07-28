import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SecureBucketStack } from '../lib/secure-bucket-stack';

describe('SecureBucketStack', () => {
  it('creates a bucket with encryption and versioning', () => {
    const app = new App();
    const stack = new SecureBucketStack(app, 'TestStack', {
      bucketProps: {
        encryption: true,
        versioning: true,
      },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled',
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
    });
  });

  it('creates a bucket without encryption and versioning', () => {
    const app = new App();
    const stack = new SecureBucketStack(app, 'TestStackWithoutProps', {
      bucketProps: {
        encryption: false,
        versioning: false,
      },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Suspended',
      },
    });

    // Ensure encryption is NOT present
    expect(() =>
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {},
      })
    ).toThrow();
  });

  it('creates a bucket with default props (undefined)', () => {
    const app = new App();
    const stack = new SecureBucketStack(app, 'TestStackDefaults');

    const template = Template.fromStack(stack);
    // This will test fallback/undefined/defaults for branching logic
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });
});
