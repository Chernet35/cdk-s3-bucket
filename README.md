# AstraZeneca Secure S3 CDK Construct

[![Build Status](https://github.com/astrazeneca/secure-s3-cdk/workflows/Deploy%20Secure%20S3%20CDK%20Stack/badge.svg)](https://github.com/astrazeneca/secure-s3-cdk/actions)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=astrazeneca-secure-s3-cdk&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=astrazeneca-secure-s3-cdk)
[![Coverage](https://codecov.io/gh/astrazeneca/secure-s3-cdk/branch/main/graph/badge.svg)](https://codecov.io/gh/astrazeneca/secure-s3-cdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Enterprise-grade AWS CDK construct for provisioning secure S3 buckets with advanced security features, encryption, lifecycle management, and GitHub OIDC integration.

## 🔒 Security Features

- **Encryption**: KMS encryption with automatic key rotation
- **Access Control**: Comprehensive IAM policies and bucket policies
- **Logging**: CloudWatch logging and S3 access logs
- **Versioning**: S3 object versioning with lifecycle management
- **Public Access**: Blocked by default with explicit controls
- **SSL/TLS**: Enforced secure transport (HTTPS only)
- **Compliance**: SOC, ISO, and GDPR compliance ready

## 🚀 Quick Start

### Installation

```bash
npm install @astrazeneca/secure-s3-construct
```

### Basic Usage

```typescript
import { SecureBucket } from '@astrazeneca/secure-s3-construct';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new SecureBucket(this, 'MySecureBucket', {
      projectId: 'my-project',
      enableVersioning: true,
      enableEncryption: true,
      githubRepo: 'astrazeneca/my-repo',
      environment: 'prod'
    });
  }
}
```

## 📋 Configuration Options

### Interface: `SecureBucketProps`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `projectId` | `string` | **Required** | Project identifier used as bucket name prefix |
| `bucketNameSuffix` | `string` | `'secure-bucket'` | Custom bucket name suffix |
| `enableVersioning` | `boolean` | `true` | Enable S3 bucket versioning |
| `enableEncryption` | `boolean` | `true` | Enable KMS encryption |
| `githubRepo` | `string` | `undefined` | GitHub repository for OIDC (format: 'org/repo') |
| `allowedBranches` | `string[]` | `['main', 'develop']` | Branches allowed for OIDC assume role |
| `environment` | `string` | `'dev'` | Environment name for tagging and naming |
| `enableAccessLogging` | `boolean` | `true` | Enable S3 access logging |
| `accessLogBucket` | `string` | `undefined` | External access log bucket name |
| `lifecycleRules` | `LifecycleRule[]` | Environment-based defaults | Custom lifecycle policies |
| `corsRules` | `CorsRule[]` | `undefined` | CORS configuration |
| `publicReadAccess` | `boolean` | `false` | Enable public read access (use with caution) |
| `additionalPrincipals` | `IPrincipal[]` | `undefined` | Additional IAM principals for access |
| `encryptionKey` | `IKey` | Auto-generated | Custom KMS key for encryption |
| `enableIntelligentTiering` | `boolean` | `false` | Enable S3 Intelligent Tiering |
| `transferAcceleration` | `boolean` | `false` | Enable S3 Transfer Acceleration |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SecureBucket Construct                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   S3 Bucket │    │   KMS Key   │    │  CloudWatch Logs   │ │
│  │             │◄───┤             │    │                     │ │
│  │  - Versioned│    │  - Rotation │    │  - Monitoring       │ │
│  │  - Encrypted│    │  - IAM      │    │  - Alerting         │ │
│  │  - Lifecycle│    │    Policies │    │                     │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                                        │              │
│         │            ┌─────────────────────┐     │              │
│         └────────────┤  Access Log Bucket  │─────┘              │
│                      │                     │                    │
│                      │  - S3 Server Logs   │                    │
│                      │  - Lifecycle Mgmt   │                    │
│                      └─────────────────────┘                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                 GitHub OIDC Integration                     │ │
│  │                                                             │ │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │ │
│  │  │    OIDC     │    │  IAM Role   │    │   Trust Policy  │ │ │
│  │  │  Provider   │◄───┤             │◄───┤                 │ │ │
│  │  │             │    │  CI/CD      │    │  Branch-based   │ │ │
│  │  └─────────────┘    └─────────────┘    └─────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Security Best Practices

### 1. Encryption
- Uses AWS KMS with automatic key rotation
- Separate encryption keys per environment
- Server-side encryption enforced for all objects

### 2. Access Control
- Deny all insecure (HTTP) connections
- Require encrypted uploads
- Principle of least privilege IAM policies
- Public access blocked by default

### 3. Monitoring & Logging
- CloudWatch integration for metrics and alarms
- S3 access logging to dedicated bucket
- Comprehensive audit trail

### 4. Network Security
- VPC endpoints supported
- SSL/TLS enforcement
- CORS configuration available

## 📊 Lifecycle Management

### Development Environment
```typescript
{
  id: 'development-lifecycle',
  enabled: true,
  expiration: Duration.days(30),
  abortIncompleteMultipartUploadAfter: Duration.days(1),
  noncurrentVersionExpiration: Duration.days(7)
}
```

### Production Environment
```typescript
{
  id: 'production-lifecycle',
  enabled: true,
  abortIncompleteMultipartUploadAfter: Duration.days(7),
  noncurrentVersionExpiration: Duration.days(365),
  transitions: [
    {
      storageClass: s3.StorageClass.INFREQUENT_ACCESS,
      transitionAfter: Duration.days(30)
    },
    {
      storageClass: s3.StorageClass.GLACIER,
      transitionAfter: Duration.days(90)
    },
    {
      storageClass: s3.StorageClass.DEEP_ARCHIVE,
      transitionAfter: Duration.days(365)
    }
  ]
}
```

## 🔄 CI/CD Integration

### GitHub Actions Setup

1. **Configure OIDC Provider**:
   ```yaml
   permissions:
     id-token: write
     contents: read
   ```

2. **Use the OIDC Role**:
   ```yaml
   - name: Configure AWS credentials
     uses: aws-actions/configure-aws-credentials@v4
     with:
       role-to-assume: ${{ secrets.AWS_OIDC_ROLE_ARN }}
       aws-region: us-east-1
   ```

### Repository Secrets Required

| Secret | Description |
|--------|-------------|
| `AWS_OIDC_ROLE_DEV` | OIDC role ARN for development |
| `AWS_OIDC_ROLE_PROD` | OIDC role ARN for production |
| `AWS_ACCOUNT_ID` | AWS Account ID |
| `SONAR_TOKEN` | SonarQube authentication token |
| `CODECOV_TOKEN` | Codecov upload token |
| `SLACK_WEBHOOK_URL` | Slack notifications webhook |

## 🧪 Testing

### Run Unit Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Security Audit
```bash
npm run security:audit
```

## 📦 Deployment

### Development Deployment
```bash
# Deploy to development environment
npm run deploy:dev
```

### Production Deployment
```bash
# Deploy to production environment
npm run deploy:prod
```

### Manual CDK Commands
```bash
# Synthesize CloudFormation templates
cdk synth --context env=prod

# Preview changes
cdk diff --context env=prod

# Deploy with approval
cdk deploy --context env=prod
```

## 🔍 Monitoring & Observability

### CloudWatch Metrics
- Bucket size and object count
- Request metrics (GET, PUT, DELETE)
- Error rates and latency
- Data transfer metrics

### Alarms
- Unauthorized access attempts
- High error rates
- Unusual data transfer patterns
- Encryption key usage

### Dashboards
Access pre-built CloudWatch dashboards:
- S3 Bucket Overview
- Security Metrics
- Cost Optimization
- Performance Metrics

## 🛡️ Compliance & Governance

### Standards Compliance
- **SOC 2 Type II**: Security and availability controls
- **ISO 27001**: Information security management
- **GDPR**: Data protection and privacy
- **HIPAA**: Healthcare data protection (when configured)

### Governance Features
- Resource tagging for cost allocation
- Automatic compliance reporting
- Policy enforcement
- Audit logging

## 🔧 Customization Examples

### Custom Lifecycle Policy
```typescript
new SecureBucket(this, 'CustomBucket', {
  projectId: 'my-project',
  lifecycleRules: [
    {
      id: 'custom-lifecycle',
      enabled: true,
      expiration: Duration.days(90),
      transitions: [
        {
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: Duration.days(30)
        },
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: Duration.days(60)
        }
      ]
    }
  ]
});
```

### CORS Configuration
```typescript
new SecureBucket(this, 'CORSBucket', {
  projectId: 'web-app',
  corsRules: [
    {
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST],
      allowedOrigins: ['https://myapp.com'],
      allowedHeaders: ['*'],
      maxAge: 3600
    }
  ]
});
```

### Multiple Branch Access
```typescript
new SecureBucket(this, 'MultiBranchBucket', {
  projectId: 'multi-env',
  githubRepo: 'astrazeneca/my-repo',
  allowedBranches: [
    'main',
    'develop',
    'release/*',
    'hotfix/*'
  ]
});
```

## 📚 Advanced Configuration

### Custom KMS Key
```typescript
import { Key } from 'aws-cdk-lib/aws-kms';

const customKey = new Key(this, 'CustomKey', {
  description: 'Custom encryption key',
  enableKeyRotation: true
});

new SecureBucket(this, 'CustomEncryptedBucket', {
  projectId: 'custom-key',
  encryptionKey: customKey
});
```

### Cross-Account Access
```typescript
import { AccountPrincipal } from 'aws-cdk-lib/aws-iam';

new SecureBucket(this, 'CrossAccountBucket', {
  projectId: 'shared-data',
  additionalPrincipals: [
    new AccountPrincipal('123456789012'),
    new AccountPrincipal('210987654321')
  ]
});
```

## 🚨 Troubleshooting

### Common Issues

1. **OIDC Role Assumption Fails**
   - Verify GitHub repository name format
   - Check branch name matches allowed branches
   - Ensure OIDC provider is correctly configured

2. **KMS Access Denied**
   - Verify IAM role has KMS permissions
   - Check KMS key policy allows the service/role
   - Ensure cross-account access is properly configured

3. **Bucket Policy Conflicts**
   - Review bucket policy statements
   - Check for conflicting Allow/Deny statements
   - Verify principal specifications

### Debug Commands
```bash
# Check CDK context
cdk context

# Validate CloudFormation template
cdk synth | cfn-lint

# Check IAM policy simulation
aws iam simulate-principal-policy --policy-source-arn <role-arn> --action-names s3:GetObject --resource-arns <bucket-arn>/*
```

## 🤝 Contributing

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Submit pull request

### Code Standards
- ESLint and Prettier configured
- 80%+ test coverage required
- Security scan must pass
- Documentation updates required

## 📞 Support

For support and questions:
- **Internal Team**: Slack #devops-support
- **Issues**: GitHub Issues
- **Documentation**: Internal Wiki
- **Security**: security@astrazeneca.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏷️ Versioning

This project uses [Semantic Versioning](https://semver.org/). For available versions, see the [tags on this repository](https://github.com/astrazeneca/secure-s3-cdk/tags).

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes and updates.

---

**Built with ❤️ by the AstraZeneca DevOps Team**#   c d k - s 3 - b u c k e t  
 