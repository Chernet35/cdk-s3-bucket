#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SecureBucketStack } from '../lib/secure-bucket-stack';

const app = new cdk.App();
new SecureBucketStack(app, 'SecureBucketStack', {
  bucketProps: {
    encryption: true,
    versioning: true,
  },
});

