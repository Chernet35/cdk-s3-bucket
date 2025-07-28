import { Bucket, BucketEncryption, BucketProps } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class SecureBucket extends Bucket {
  constructor(scope: Construct, id: string, props?: BucketProps) {
    super(scope, id, {
      encryption: props?.encryption ?? BucketEncryption.S3_MANAGED,
      versioned: props?.versioned ?? true,
      ...props,
    });
  }
}
