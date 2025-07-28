it('creates a bucket without encryption and versioning', () => {
  const app = new App();
  const stack = new SecureBucketStack(app, 'TestStackWithoutProps', {
    bucketProps: {
      encryption: false,
      versioning: false,
    },
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    VersioningConfiguration: {
      Status: 'Suspended',
    },
  });

  // Ensure encryption is NOT present
  const resources = template.findResources('AWS::S3::Bucket');
  const bucket = Object.values(resources)[0];
  expect(bucket.Properties).not.toHaveProperty('BucketEncryption');
});
