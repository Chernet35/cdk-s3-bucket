import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SecureBucketStack } from '../lib/secure-bucket';

test('Bucket with Intelligent Tiering Configurations Created', () => {
  const app = new App();
  const stack = new SecureBucketStack(app, 'TestStack');

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    IntelligentTieringConfigurations: [
      {
        Id: 'ArchiveDeepArchiveTiering',
        Status: 'Enabled',
        Tierings: [
          {
            AccessTier: 'ARCHIVE_ACCESS',
            Days: 90,
          },
          {
            AccessTier: 'DEEP_ARCHIVE_ACCESS',
            Days: 180,
          },
        ],
      },
    ],
  });
});
