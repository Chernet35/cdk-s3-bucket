#!/usr/bin/env node
import 'source-map-support/register';
import { App, Environment, Stack, StackProps } from 'aws-cdk-lib';
import { SecureBucket, SecureBucketProps } from '../lib';

/**
 * Configuration interface for the CDK app
 */
interface AppConfig {
  readonly account?: string;
  readonly region?: string;
  readonly environments: {
    [key: string]: {
      bucketProps: SecureBucketProps;
      stackProps?: StackProps;
    };
  };
}

/**
 * Stack containing the SecureBucket construct
 */
class SecureBucketStack extends Stack {
  public readonly secureBucket: SecureBucket;

  public constructor(scope: App, id: string, bucketProps: SecureBucketProps, props?: StackProps) {
    super(scope, id, props);

    this.secureBucket = new SecureBucket(this, 'SecureBucket', bucketProps);
  }
}

/**
 * Main CDK application
 */
class SecureBucketApp extends App {
  public constructor() {
    super();

    const config = this.getConfig();
    const env = this.getEnvironment(config);

    Object.entries(config.environments).forEach(([envName, envConfig]) => {
      if (this.shouldDeployEnvironment(envName)) {
        new SecureBucketStack(
          this,
          `AstraZeneca-SecureBucket-${envName}`,
          {
            ...envConfig.bucketProps,
            environment: envName,
          },
          {
            env,
            description: `AstraZeneca Secure S3 Bucket Stack - ${envName} environment`,
            ...envConfig.stackProps,
          }
        );
      }
    });
  }

  /**
   * Get application configuration
   */
  private getConfig(): AppConfig {
    return {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
      environments: {
        dev: {
          bucketProps: {
            projectId: 'astrazeneca-dev',
            enableVersioning: true,
            enableEncryption: true,
            githubRepo: process.env.GITHUB_REPOSITORY || 'astrazeneca/secure-s3-cdk',
            allowedBranches: ['main', 'develop', 'feature/*'],
            enableAccessLogging: true,
            enableIntelligentTiering: false,
            transferAcceleration: false,
            notificationConfiguration: {
              cloudWatchMetrics: true,
              eventBridge: true,
            },
          },
        },
        prod: {
          bucketProps: {
            projectId: 'astrazeneca-prod',
            enableVersioning: true,
            enableEncryption: true,
            githubRepo: process.env.GITHUB_REPOSITORY || 'astrazeneca/secure-s3-cdk',
            allowedBranches: ['main'],
            enableAccessLogging: true,
            enableIntelligentTiering: true,
            transferAcceleration: true,
            notificationConfiguration: {
              cloudWatchMetrics: true,
              eventBridge: true,
            },
            lifecycleRules: [
              {
                id: 'production-lifecycle-policy',
                enabled: true,
                abortIncompleteMultipartUploadAfter: { days: 7 },
                noncurrentVersionExpiration: { days: 365 },
                transitions: [
                  {
                    storageClass: 'STANDARD_IA' as any,
                    transitionAfter: { days: 30 },
                  },
                  {
                    storageClass: 'GLACIER' as any,
                    transitionAfter: { days: 90 },
                  },
                  {
                    storageClass: 'DEEP_ARCHIVE' as any,
                    transitionAfter: { days: 365 },
                  },
                ],
              },
            ],
          },
        },
      },
    };
  }

  /**
   * Get AWS environment configuration
   */
  private getEnvironment(config: AppConfig): Environment {
    return {
      account: config.account,
      region: config.region,
    };
  }

  /**
   * Determine if environment should be deployed based on context
   */
  private shouldDeployEnvironment(envName: string): boolean {
    const targetEnv = this.node.tryGetContext('env');
    
    if (targetEnv) {
      return targetEnv === envName;
    }

    // Default to dev if no environment is specified
    return envName === 'dev';
  }
}

// Create and run the application
new SecureBucketApp();