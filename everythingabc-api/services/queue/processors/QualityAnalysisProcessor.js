const QualityAnalyzer = require('../../analysis/QualityAnalyzer');
const logger = require('../../../utils/logger');

/**
 * Quality Analysis Queue Processor
 *
 * Processes quality analysis jobs for images
 */

const qualityAnalyzer = new QualityAnalyzer();

module.exports = async function(job) {
  const {
    imagePath,
    itemName,
    category,
    sourceData = {}
  } = job.data;

  try {
    logger.info(`Processing quality analysis job`, {
      jobId: job.id,
      imagePath,
      itemName,
      category
    });

    await job.progress(10);

    // Initialize analyzer if needed
    if (!qualityAnalyzer.initialized) {
      await qualityAnalyzer.initialize();
    }

    await job.progress(20);

    // Analyze image quality
    const analysisResult = await qualityAnalyzer.analyzeImage(
      imagePath,
      itemName,
      category,
      sourceData
    );

    await job.progress(80);

    logger.info(`Quality analysis job completed`, {
      jobId: job.id,
      imagePath,
      overallScore: analysisResult.overall,
      recommendation: analysisResult.recommendation,
      analysisTime: analysisResult.analysisTime
    });

    await job.progress(100);

    return {
      success: true,
      imagePath,
      itemName,
      category,
      analysisResult: {
        overall: analysisResult.overall,
        breakdown: analysisResult.breakdown,
        recommendation: analysisResult.recommendation,
        metadata: analysisResult.metadata
      },
      completedAt: new Date()
    };

  } catch (error) {
    logger.error(`Quality analysis job failed`, {
      jobId: job.id,
      imagePath,
      itemName,
      category,
      error: error.message,
      stack: error.stack
    });

    throw new Error(`Quality analysis failed for ${imagePath}: ${error.message}`);
  }
};