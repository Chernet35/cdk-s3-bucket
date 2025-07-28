import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnBucket } from 'aws-cdk-lib/aws-s3';

export class SecureBucketStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new CfnBucket(this, 'SecureTieredBucket', {
      bucketName: 'secure-tiered-bucket-demo', // ⚠️ Must be globally unique or omit this for auto-naming
      intelligentTieringConfigurations: [
        {
          id: 'ArchiveDeepArchiveTiering',
          status: 'Enabled',
          tierings: [
            {
              accessTier: 'ARCHIVE_ACCESS',
              days: 90,
            },
            {
              accessTier: 'DEEP_ARCHIVE_ACCESS',
              days: 180,
            },
          ],
        },
      ],
    });
  }
}
