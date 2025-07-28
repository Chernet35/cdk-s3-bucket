import { Construct } from 'constructs';
import { aws_s3 as s3 } from 'aws-cdk-lib';

export interface SecureBucketProps {
  encryption?: boolean;
  versioning?: boolean;
}

export class SecureBucket extends Construct {
  constructor(scope: Construct, id: string, props: SecureBucketProps = {}) {
    super(scope, id);

    const encryptionEnabled = props.encryption ?? false;
    const versioningEnabled = props.versioning ?? false;

    new s3.Bucket(this, 'SecureBucketResource', {
      encryption: encryptionEnabled ? s3.BucketEncryption.S3_MANAGED : undefined,
      versioned: versioningEnabled,
    });
  }
}
