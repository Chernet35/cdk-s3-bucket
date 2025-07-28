#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SecureBucketStack } from '../lib/secure-bucket';

const app = new cdk.App();
new SecureBucketStack(app, 'SecureBucketStack');
