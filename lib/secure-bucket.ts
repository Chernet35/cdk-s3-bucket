import {
  Stack,
  StackProps,
  Duration,
  CfnOutput,
  RemovalPolicy,
} from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * Properties for the SecureBucket construct
 */
export interface SecureBucketProps {
  /**
   * Project identifier used as bucket name prefix
   */
  readonly projectId: string;

  /**
   * Custom bucket name suffix
   * @default 'secure-bucket'
   */
  readonly bucketNameSuffix?: string;

  /**
   * Enable S3 bucket versioning
   * @default true
   */
  readonly enableVersioning?: boolean;

  /**
   * Enable KMS encryption
   * @default true
   */
  readonly enableEncryption?: boolean;

  /**
   * GitHub repository for OIDC (format: 'org/repo')
   */
  readonly githubRepo?: string;

  /**
   * Branches allowed for OIDC assume role
   * @default ['main', 'develop']
   */
  readonly allowedBranches?: string[];

  /**
   * Environment name for tagging and naming
   * @default 'dev'
   */
  readonly environment?: string;

  /**
   * Enable S3 access logging
   * @default true
   */
  readonly enableAccessLogging?: boolean;

  /**
   * External access log bucket name
   */
  readonly accessLogBucket?: string;

  /**
   * Custom lifecycle policies
   */
  readonly lifecycleRules?: s3.LifecycleRule[];

  /**
   * CORS configuration
   */
  readonly corsRules?: s3.CorsRule[];

  /**
   * Enable public read access (use with caution)
   * @default false
   */
  readonly publicReadAccess?: boolean;

  /**
   * Additional IAM principals for access
   */
  readonly additionalPrincipals?: iam.IPrincipal[];

  /**
   * Custom KMS key for encryption
   */
  readonly encryptionKey?: kms.IKey;

  /**
   * Enable S3 Intelligent Tiering
   * @default false
   */
  readonly enableIntelligentTiering?: boolean;

  /**
   * Enable S3 Transfer Acceleration
   * @default false
   */
  readonly transferAcceleration?: boolean;

  /**
   * Notification configuration
   */
  readonly notificationConfiguration?: {
    cloudWatchMetrics?: boolean;
    eventBridge?: boolean;
  };
}

/**
 * Enterprise-grade secure S3 bucket construct
 */
export class SecureBucket extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly encryptionKey?: kms.Key;
  public readonly githubOidcRole?: iam.Role;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: SecureBucketProps) {
    super(scope, id);

    // Validate props
    this.validateProps(props);

    const environment = props.environment || 'dev';
    const bucketNameSuffix = props.bucketNameSuffix || 'secure-bucket';
    const bucketName = `${props.projectId}-${bucketNameSuffix}-${environment}`;

    // Create KMS key if encryption is enabled
    if (props.enableEncryption !== false) {
      this.encryptionKey = new kms.Key(this, 'EncryptionKey', {
        description: `KMS key for ${props.projectId} S3 bucket encryption`,
        enableKeyRotation: true,
        removalPolicy: RemovalPolicy.DESTROY,
      });

      new kms.Alias(this, 'EncryptionKeyAlias', {
        aliasName: `alias/${props.projectId}-s3-${environment}`,
        targetKey: this.encryptionKey,
      });
    }

    // Create access log bucket if needed
    let accessLogBucket: s3.Bucket | undefined;
    if (props.enableAccessLogging !== false && !props.accessLogBucket) {
      accessLogBucket = new s3.Bucket(this, 'AccessLogBucket', {
        bucketName: `${bucketName}-access-logs`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: RemovalPolicy.DESTROY,
        lifecycleRules: [
          {
            id: 'access-logs-lifecycle',
            enabled: true,
            expiration: Duration.days(90),
          },
        ],
      });
    }

    // Create main S3 bucket
    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName,
      versioned: props.enableVersioning !== false,
      encryption: this.getEncryptionConfiguration(props),
      encryptionKey: this.encryptionKey,
      blockPublicAccess: this.getPublicAccessConfiguration(props),
      serverAccessLogsBucket: accessLogBucket,
      serverAccessLogsPrefix: props.accessLogBucket ? undefined : 'access-logs/',
      lifecycleRules: this.getLifecycleRules(props, environment),
      cors: props.corsRules,
      transferAcceleration: props.transferAcceleration,
      intelligentTieringConfigurations: props.enableIntelligentTiering
        ? [
            {
              id: 'EntireBucket',
              status: s3.IntelligentTieringStatus.ENABLED,
              optionalFields: [s3.IntelligentTieringOptionalFields.BUCKET_KEY_STATUS],
            },
          ]
        : undefined,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create bucket policy with security controls
    this.createBucketPolicy(props);

    // Create GitHub OIDC integration if specified
    if (props.githubRepo) {
      this.githubOidcRole = this.createGitHubOidcIntegration(props, environment);
    }

    // Create CloudWatch log group
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/s3/${bucketName}`,
      retention: logs.RetentionDays.SIX_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create outputs
    this.createOutputs(props, environment);
  }

  private validateProps(props: SecureBucketProps): void {
    if (!props.projectId || props.projectId.trim() === '') {
      throw new Error('projectId is required and cannot be empty');
    }

    if (props.projectId.length > 20) {
      throw new Error('projectId must be 20 characters or less');
    }

    if (!/^[a-z0-9-]+$/.test(props.projectId)) {
      throw new Error('projectId must contain only lowercase letters, numbers, and hyphens');
    }

    if (props.githubRepo && !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(props.githubRepo)) {
      throw new Error('githubRepo must be in format "organization/repository"');
    }
  }

  private getEncryptionConfiguration(props: SecureBucketProps): s3.BucketEncryption {
    if (props.enableEncryption === false) {
      return s3.BucketEncryption.UNENCRYPTED;
    }
    return props.encryptionKey || this.encryptionKey
      ? s3.BucketEncryption.KMS
      : s3.BucketEncryption.S3_MANAGED;
  }

  private getPublicAccessConfiguration(props: SecureBucketProps): s3.BlockPublicAccess {
    if (props.publicReadAccess) {
      return new s3.BlockPublicAccess({
        blockPublicAcls: true,
        blockPublicPolicy: false,
        ignorePublicAcls: true,
        restrictPublicBuckets: false,
      });
    }
    return s3.BlockPublicAccess.BLOCK_ALL;
  }

  private getLifecycleRules(props: SecureBucketProps, environment: string): s3.LifecycleRule[] {
    if (props.lifecycleRules) {
      return props.lifecycleRules;
    }

    // Default lifecycle rules based on environment
    if (environment === 'prod') {
      return [
        {
          id: 'production-lifecycle',
          enabled: true,
          abortIncompleteMultipartUploadAfter: Duration.days(7),
          noncurrentVersionExpiration: Duration.days(365),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: Duration.days(365),
            },
          ],
        },
      ];
    }

    // Development environment
    return [
      {
        id: 'development-lifecycle',
        enabled: true,
        expiration: Duration.days(30),
        abortIncompleteMultipartUploadAfter: Duration.days(1),
        noncurrentVersionExpiration: Duration.days(7),
      },
    ];
  }

  private createBucketPolicy(props: SecureBucketProps): void {
    const policyStatements: iam.PolicyStatement[] = [];

    // Deny insecure connections
    policyStatements.push(
      new iam.PolicyStatement({
        sid: 'DenyInsecureConnections',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:*'],
        resources: [this.bucket.bucketArn, this.bucket.arnForObjects('*')],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false',
          },
        },
      })
    );

    // Deny unencrypted uploads if encryption is enabled
    if (props.enableEncryption !== false) {
      policyStatements.push(
        new iam.PolicyStatement({
          sid: 'DenyUnencryptedUploads',
          effect: iam.Effect.DENY,
          principals: [new iam.AnyPrincipal()],
          actions: ['s3:PutObject'],
          resources: [this.bucket.arnForObjects('*')],
          conditions: {
            StringNotEquals: {
              's3:x-amz-server-side-encryption': this.encryptionKey ? 'aws:kms' : 'AES256',
            },
          },
        })
      );
    }

    // Apply bucket policy
    if (policyStatements.length > 0) {
      this.bucket.addToResourcePolicy(
        new iam.PolicyStatement({
          sid: 'CombinedSecurityPolicy',
          effect: iam.Effect.DENY,
          principals: [new iam.AnyPrincipal()],
          actions: ['s3:*'],
          resources: [this.bucket.bucketArn, this.bucket.arnForObjects('*')],
          conditions: {
            Bool: {
              'aws:SecureTransport': 'false',
            },
          },
        })
      );
    }
  }

  private createGitHubOidcIntegration(props: SecureBucketProps, environment: string): iam.Role {
    // Create OIDC provider
    const oidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    // Create role for GitHub Actions
    const allowedBranches = props.allowedBranches || ['main', 'develop'];
    const conditions = allowedBranches.map(
      branch => `repo:${props.githubRepo}:ref:refs/heads/${branch}`
    );

    const role = new iam.Role(this, 'GitHubOidcRole', {
      roleName: `${props.projectId}-${props.bucketNameSuffix || 'secure-bucket'}-${environment}-github-oidc-role`,
      assumedBy: new iam.WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': conditions,
        },
      }),
    });

    // Grant S3 permissions
    this.bucket.grantReadWrite(role);

    // Grant KMS permissions if encryption is enabled
    if (this.encryptionKey) {
      this.encryptionKey.grantEncryptDecrypt(role);
    }

    return role;
  }

  private createOutputs(props: SecureBucketProps, environment: string): void {
    const exportPrefix = `${props.projectId}-${props.bucketNameSuffix || 'secure-bucket'}-${environment}`;

    new CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'Name of the created S3 bucket',
      exportName: `${exportPrefix}-BucketName`,
    });

    new CfnOutput(this, 'BucketArn', {
      value: this.bucket.bucketArn,
      description: 'ARN of the created S3 bucket',
      exportName: `${exportPrefix}-BucketArn`,
    });

    if (this.encryptionKey) {
      new CfnOutput(this, 'EncryptionKeyArn', {
        value: this.encryptionKey.keyArn,
        description: 'ARN of the KMS encryption key',
        exportName: `${exportPrefix}-EncryptionKeyArn`,
      });
    }

    if (this.githubOidcRole) {
      new CfnOutput(this, 'GitHubOidcRoleArn', {
        value: this.githubOidcRole.roleArn,
        description: 'ARN of the GitHub OIDC role for CI/CD',
        exportName: `${exportPrefix}-GitHubOidcRoleArn`,
      });
    }

    new CfnOutput(this, 'LogGroupName', {
      value: this.logGroup.logGroupName,
      description: 'Name of the CloudWatch log group',
      exportName: `${exportPrefix}-LogGroupName`,
    });
  }
}
