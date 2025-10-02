const ImageProcessor = require('../../processing/ImageProcessor');
const logger = require('../../../utils/logger');

/**
 * Image Processing Queue Processor
 *
 * Processes individual images through optimization pipeline
 */

const imageProcessor = new ImageProcessor();

module.exports = async function(job) {
  const {
    imagePath,
    category,
    letter,
    itemName,
    sourceData = {},
    outputFormat = 'webp',
    quality = 85
  } = job.data;

  try {
    logger.info(`Processing image processing job`, {
      jobId: job.id,
      imagePath,
      category,
      letter,
      itemName
    });

    await job.progress(10);

    // Initialize processor if needed
    if (!imageProcessor.initialized) {
      await imageProcessor.initialize();
    }

    await job.progress(20);

    // Process the image
    const result = await imageProcessor.processImage(imagePath, {
      category,
      letter,
      itemName,
      sourceData,
      outputFormat,
      quality
    });

    await job.progress(80);

    logger.info(`Image processing job completed`, {
      jobId: job.id,
      imagePath,
      sizesGenerated: result.sizes.length,
      processingTime: result.processing.processingTime,
      compressionRatio: result.processing.compressionRatio
    });

    await job.progress(100);

    return {
      success: true,
      imagePath,
      processedPath: result.processedPath,
      metadata: result.metadata,
      sizes: result.sizes,
      processing: result.processing,
      tempDir: result.tempDir,
      completedAt: new Date()
    };

  } catch (error) {
    logger.error(`Image processing job failed`, {
      jobId: job.id,
      imagePath,
      error: error.message,
      stack: error.stack
    });

    throw new Error(`Processing failed for ${imagePath}: ${error.message}`);
  }
};