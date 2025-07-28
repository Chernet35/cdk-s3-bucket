import {
  Bucket,
  BucketEncryption,
  IntelligentTieringStatus,
  IntelligentTieringOptionalField,
  IntelligentTieringConfiguration,
} from 'aws-cdk-lib/aws-s3';

const intelligentTieringConfigurations: IntelligentTieringConfiguration[] = [
  {
    name: 'archive-tiering',
    status: IntelligentTieringStatus.ENABLED,
    tierings: [
      {
        accessTier: 'ARCHIVE_ACCESS',
        days: 90,
      },
      {
        accessTier: 'DEEP_ARCHIVE_ACCESS',
        days: 180,
      },
    ],
    optionalFields: [IntelligentTieringOptionalField.OBJECT_SIZE],
  },
];

new Bucket(this, 'SecureBucket', {
  versioned: true,
  encryption: BucketEncryption.S3_MANAGED,
  intelligentTieringConfigurations,
});
