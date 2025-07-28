intelligentTieringConfigurations: props.enableIntelligentTiering
  ? [
      {
        status: s3.IntelligentTieringStatus.ENABLED,
        tierings: [
          {
            accessTier: s3.IntelligentTieringAccessTier.DEEP_ARCHIVE_ACCESS,
            days: 90,
          },
        ],
      },
    ]
  : undefined,
