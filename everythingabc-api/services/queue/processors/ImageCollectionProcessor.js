const ImageCollector = require('../../collection/ImageCollector');
const logger = require('../../../utils/logger');

/**
 * Image Collection Queue Processor
 *
 * Processes image collection jobs for categories and items
 */

const imageCollector = new ImageCollector();

module.exports = async function(job) {
  const {
    categoryId,
    letter,
    itemId,
    itemName,
    priority = 'normal',
    strategy = {},
    forceRestart = false
  } = job.data;

  try {
    logger.info(`Processing image collection job`, {
      jobId: job.id,
      categoryId,
      letter,
      itemName,
      priority
    });

    // Update job progress
    await job.progress(10);

    // Initialize collector if needed
    if (!imageCollector.isInitialized) {
      await imageCollector.initialize();
    }

    await job.progress(20);

    // Collect images for the item
    const result = await imageCollector.collectImagesForItem(
      categoryId,
      letter,
      itemName,
      {
        targetCount: strategy.targetImagesPerItem || 3,
        minQualityScore: strategy.minQualityThreshold || 7.0,
        useAiGeneration: strategy.useAiGeneration !== false,
        uploadToCloud: true,
        forceRestart
      }
    );

    await job.progress(90);

    logger.info(`Image collection job completed`, {
      jobId: job.id,
      categoryId,
      itemName,
      collectedCount: result.collectedCount,
      approvedCount: result.approvedCount,
      rejectedCount: result.rejectedCount
    });

    await job.progress(100);

    return {
      success: true,
      categoryId,
      letter,
      itemId,
      itemName,
      result: {
        collectedCount: result.collectedCount,
        approvedCount: result.approvedCount,
        rejectedCount: result.rejectedCount,
        images: result.images.length
      },
      completedAt: new Date()
    };

  } catch (error) {
    logger.error(`Image collection job failed`, {
      jobId: job.id,
      categoryId,
      itemName,
      error: error.message,
      stack: error.stack
    });

    throw new Error(`Collection failed for ${itemName}: ${error.message}`);
  }
};