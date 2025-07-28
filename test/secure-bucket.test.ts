import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SecureBucket, SecureBucketProps } from '../lib/secure-bucket';

describe('SecureBucket', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
  });

  describe('Basic Configuration', () => {
    test('creates bucket with minimal configuration', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'test-project-secure-bucket-dev',
        VersioningConfiguration: {
          Status: 'Enabled',
        },
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    test('creates bucket with custom name suffix', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        bucketNameSuffix: 'custom-bucket',
        environment: 'prod',
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'test-project-custom-bucket-prod',
      });
    });
  });

  describe('Encryption Configuration', () => {
    test('creates KMS key when encryption is enabled', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        enableEncryption: true,
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::KMS::Key', {
        Description: 'KMS key for test-project S3 bucket encryption',
        EnableKeyRotation: true,
      });

      template.hasResourceProperties('AWS::KMS::Alias', {
        AliasName: 'alias/test-project-s3-dev',
      });

      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms',
              },
            },
          ],
        },
      });
    });

    test('disables encryption when explicitly set to false', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        enableEncryption: false,
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: Match.absent(),
      });

      // Should not create KMS key
      template.resourceCountIs('AWS::KMS::Key', 0);
    });
  });

  describe('Versioning Configuration', () => {
    test('enables versioning by default', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });
    });

    test('disables versioning when explicitly set to false', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        enableVersioning: false,
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: Match.absent(),
      });
    });
  });

  describe('GitHub OIDC Integration', () => {
    test('creates OIDC provider and role when GitHub repo is specified', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        githubRepo: 'astrazeneca/test-repo',
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::OpenIDConnectProvider', {
        Url: 'https://token.actions.githubusercontent.com',
        ClientIdList: ['sts.amazonaws.com'],
      });

      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'test-project-secure-bucket-dev-github-oidc-role',
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Federated: {
                  Ref: Match.anyValue(),
                },
              },
              Action: 'sts:AssumeRoleWithWebIdentity',
              Condition: {
                StringEquals: {
                  'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                },
                StringLike: {
                  'token.actions.githubusercontent.com:sub': [
                    'repo:astrazeneca/test-repo:ref:refs/heads/main',
                    'repo:astrazeneca/test-repo:ref:refs/heads/develop',
                  ],
                },
              },
            },
          ],
        },
      });
    });

    test('uses custom allowed branches', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        githubRepo: 'astrazeneca/test-repo',
        allowedBranches: ['main', 'release/*'],
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': [
                    'repo:astrazeneca/test-repo:ref:refs/heads/main',
                    'repo:astrazeneca/test-repo:ref:refs/heads/release/*',
                  ],
                },
              },
            },
          ],
        },
      });
    });
  });

  describe('Access Logging', () => {
    test('creates access log bucket by default', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      // Should create two buckets: main bucket and access log bucket
      template.resourceCountIs('AWS::S3::Bucket', 2);

      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'test-project-secure-bucket-dev-access-logs',
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
      });
    });

    test('uses external access log bucket when specified', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        accessLogBucket: 'external-log-bucket',
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      // Should create only one bucket (main bucket)
      template.resourceCountIs('AWS::S3::Bucket', 1);

      template.hasResourceProperties('AWS::S3::Bucket', {
        LoggingConfiguration: {
          DestinationBucketName: 'external-log-bucket',
          LogFilePrefix: 'access-logs/',
        },
      });
    });

    test('disables access logging when set to false', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        enableAccessLogging: false,
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      // Should create only one bucket (main bucket)
      template.resourceCountIs('AWS::S3::Bucket', 1);

      template.hasResourceProperties('AWS::S3::Bucket', {
        LoggingConfiguration: Match.absent(),
      });
    });
  });

  describe('Lifecycle Rules', () => {
    test('applies default development lifecycle rules', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        environment: 'dev',
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: [
            {
              Id: 'development-lifecycle',
              Status: 'Enabled',
              ExpirationInDays: 30,
              AbortIncompleteMultipartUpload: {
                DaysAfterInitiation: 1,
              },
              NoncurrentVersionExpirationInDays: 7,
            },
          ],
        },
      });
    });

    test('applies default production lifecycle rules', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        environment: 'prod',
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: [
            {
              Id: 'production-lifecycle',
              Status: 'Enabled',
              AbortIncompleteMultipartUpload: {
                DaysAfterInitiation: 7,
              },
              NoncurrentVersionExpirationInDays: 365,
              Transitions: [
                {
                  StorageClass: 'STANDARD_IA',
                  TransitionInDays: 30,
                },
                {
                  StorageClass: 'GLACIER',
                  TransitionInDays: 90,
                },
                {
                  StorageClass: 'DEEP_ARCHIVE',
                  TransitionInDays: 365,
                },
              ],
            },
          ],
        },
      });
    });
  });

  describe('Security Features', () => {
    test('creates bucket policy with security controls', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        enableEncryption: true,
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: 'DenyInsecureConnections',
              Effect: 'Deny',
              Principal: '*',
              Action: 's3:*',
              Condition: {
                Bool: {
                  'aws:SecureTransport': 'false',
                },
              },
            },
            {
              Sid: 'DenyUnencryptedUploads',
              Effect: 'Deny',
              Principal: '*',
              Action: 's3:PutObject',
              Condition: {
                StringNotEquals: {
                  's3:x-amz-server-side-encryption': 'aws:kms',
                },
              },
            },
          ]),
        },
      });
    });

    test('creates CloudWatch log group', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/s3/test-project-secure-bucket-dev',
        RetentionInDays: 180,
      });
    });
  });

  describe('Intelligent Tiering', () => {
    test('creates intelligent tiering configuration when enabled', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        enableIntelligentTiering: true,
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        IntelligentTieringConfigurations: [
          {
            Id: 'EntireBucket',
            Status: 'Enabled',
            OptionalFields: ['BucketKeyStatus'],
          },
        ],
      });
    });
  });

  describe('Outputs', () => {
    test('creates all required outputs', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        enableEncryption: true,
        githubRepo: 'astrazeneca/test-repo',
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasOutput('TestBucketBucketName', {
        Description: 'Name of the created S3 bucket',
        Export: {
          Name: 'test-project-secure-bucket-dev-BucketName',
        },
      });

      template.hasOutput('TestBucketBucketArn', {
        Description: 'ARN of the created S3 bucket',
        Export: {
          Name: 'test-project-secure-bucket-dev-BucketArn',
        },
      });

      template.hasOutput('TestBucketEncryptionKeyArn', {
        Description: 'ARN of the KMS encryption key',
        Export: {
          Name: 'test-project-secure-bucket-dev-EncryptionKeyArn',
        },
      });

      template.hasOutput('TestBucketGitHubOidcRoleArn', {
        Description: 'ARN of the GitHub OIDC role for CI/CD',
        Export: {
          Name: 'test-project-secure-bucket-dev-GitHubOidcRoleArn',
        },
      });
    });
  });

  describe('Validation', () => {
    test('throws error for empty project ID', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: '',
      };

      // Act & Assert
      expect(() => {
        new SecureBucket(stack, 'TestBucket', props);
      }).toThrow('projectId is required and cannot be empty');
    });

    test('throws error for invalid project ID format', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'Invalid_Project_ID',
      };

      // Act & Assert
      expect(() => {
        new SecureBucket(stack, 'TestBucket', props);
      }).toThrow(
        'projectId must contain only lowercase letters, numbers, and hyphens'
      );
    });

    test('throws error for project ID too long', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'this-project-id-is-way-too-long-for-aws-resource-naming',
      };

      // Act & Assert
      expect(() => {
        new SecureBucket(stack, 'TestBucket', props);
      }).toThrow('projectId must be 20 characters or less');
    });

    test('throws error for invalid GitHub repo format', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        githubRepo: 'invalid-repo-format',
      };

      // Act & Assert
      expect(() => {
        new SecureBucket(stack, 'TestBucket', props);
      }).toThrow('githubRepo must be in format "organization/repository"');
    });
  });

  describe('Public Access', () => {
    test('allows public read access when explicitly enabled', () => {
      // Arrange
      const props: SecureBucketProps = {
        projectId: 'test-project',
        publicReadAccess: true,
      };

      // Act
      new SecureBucket(stack, 'TestBucket', props);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: false,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: false,
        },
      });
    });
  });
});
