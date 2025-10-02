const S3ImageUploadService = require('../../cloud/S3ImageUploadService');
const fs = require('fs-extra');
const logger = require('../../../utils/logger');

/**
 * Cloud Upload Queue Processor
 *
 * Processes cloud upload jobs for S3 and CDN integration
 */

const s3Service = new S3ImageUploadService();

module.exports = async function(job) {
  const {
    imagePath,
    metadata,
    deleteAfterUpload = true
  } = job.data;

  try {
    logger.info(`Processing cloud upload job`, {
      jobId: job.id,
      imagePath,
      category: metadata.category,
      itemName: metadata.itemName
    });

    await job.progress(10);

    // Initialize S3 service if needed
    if (!s3Service.initialized) {
      await s3Service.initialize();
    }

    await job.progress(20);

    // Read image buffer
    const imageBuffer = await fs.readFile(imagePath);

    await job.progress(30);

    // Upload to S3 with multiple sizes
    const uploadResults = await s3Service.uploadImageWithMultipleSizes(
      imageBuffer,
      metadata
    );

    await job.progress(80);

    // Clean up local file if requested
    if (deleteAfterUpload) {
      try {
        await fs.remove(imagePath);
        logger.debug(`Cleaned up local file: ${imagePath}`);
      } catch (cleanupError) {
        logger.warn(`Failed to clean up local file: ${imagePath}`, cleanupError);
      }
    }

    await job.progress(90);

    logger.info(`Cloud upload job completed`, {
      jobId: job.id,
      imagePath,
      sizesUploaded: Object.keys(uploadResults).length,
      bucket: s3Service.bucket
    });

    await job.progress(100);

    return {
      success: true,
      imagePath,
      uploadResults,
      metadata,
      bucket: s3Service.bucket,
      cdnDomain: s3Service.config.cdnDomain,
      completedAt: new Date()
    };

  } catch (error) {
    logger.error(`Cloud upload job failed`, {
      jobId: job.id,
      imagePath,
      metadata,
      error: error.message,
      stack: error.stack
    });

    throw new Error(`Cloud upload failed for ${imagePath}: ${error.message}`);
  }
};