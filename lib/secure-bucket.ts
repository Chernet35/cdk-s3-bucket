import { Construct } from 'constructs';
import { aws_s3 as s3 } from 'aws-cdk-lib';

export interface SecureBucketProps {
  encryption?: boolean;
  versioning?: boolean;
}

export class SecureBucket extends Construct {
  constructor(scope: Construct, id: string, props: SecureBucketProps) {
    super(scope, id);

    new s3.Bucket(this, 'MySecureBucket', {
      encryption: props.encryption ? s3.BucketEncryption.S3_MANAGED : undefined,
      versioned: props.versioning,
    });
  }
}
