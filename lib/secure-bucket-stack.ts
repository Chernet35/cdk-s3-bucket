import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SecureBucket } from './secure-bucket';

export class SecureBucketStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new SecureBucket(this, 'MySecureBucket', {
      projectId: 'myproject',    // REQUIRED — replace with your actual project id
      environment: 'dev',        // optional
      enableIntelligentTiering: true,  // example usage
      // Add any other props you need here
    });
  }
}
