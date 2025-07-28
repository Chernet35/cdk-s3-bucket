import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SecureBucket, SecureBucketProps } from './secure-bucket';

export class SecureBucketStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps & { bucketProps?: SecureBucketProps }) {
    super(scope, id, props);

    new SecureBucket(this, 'MySecureBucket', props?.bucketProps || {});
  }
}
