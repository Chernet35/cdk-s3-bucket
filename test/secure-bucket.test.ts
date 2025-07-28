import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SecureBucketStack } from '../lib/secure-bucket-stack';

test('S3 Bucket Created with Encryption and Versioning', () => {
  const app = new App();
  const stack = new SecureBucketStack(app, 'TestStack', {
    bucketProps: {
      encryption: true,
      versioning: true,
    },
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 1);
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
