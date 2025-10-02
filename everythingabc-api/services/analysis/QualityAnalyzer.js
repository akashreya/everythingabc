const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../../utils/logger');

class QualityAnalyzer {
  constructor() {
    this.initialized = false;

    // Default configuration
    this.config = {
      qualityControl: {
        weights: {
          technical: 0.35,
          relevance: 0.25,
          aesthetic: 0.20,
          usability: 0.20
        },
        thresholds: {
          excellent: 8.5,
          good: 7.0,
          poor: 5.0
        }
      }
    };

    this.relevanceKeywords = this.loadRelevanceKeywords();
  }

  async initialize() {
    if (this.initialized) return;

    try {
      this.initialized = true;
      logger.info('QualityAnalyzer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize QualityAnalyzer', error);
      throw error;
    }
  }

  async analyzeImage(imagePath, itemName, category, sourceData = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      logger.debug(`Analyzing image quality: ${path.basename(imagePath)}`);

      // In development, use simplified fast analysis
      if (process.env.NODE_ENV === 'development') {
        return this.simpleFastAnalysis(imagePath, itemName, category);
      }

      // Load image metadata
      const imageInfo = await sharp(imagePath).metadata();

      // Perform all quality checks
      const [
        technical,
        relevance,
        aesthetic,
        usability
      ] = await Promise.all([
        this.analyzeTechnical(imagePath, imageInfo),
        this.analyzeRelevance(imagePath, itemName, category, sourceData),
        this.analyzeAesthetic(imagePath, imageInfo),
        this.analyzeUsability(imagePath, imageInfo, category)
      ]);

      // Ensure all scores are valid numbers
      const safeScore = (score) => {
        if (typeof score !== 'number' || isNaN(score)) {
          return 5.0; // Default neutral score
        }
        return Math.max(0, Math.min(10, score)); // Clamp between 0-10
      };

      const technicalScore = safeScore(technical.score);
      const relevanceScore = safeScore(relevance.score);
      const aestheticScore = safeScore(aesthetic.score);
      const usabilityScore = safeScore(usability.score);

      // Calculate weighted overall score
      const weights = this.config.qualityControl.weights;
      const overall = (
        technicalScore * weights.technical +
        relevanceScore * weights.relevance +
        aestheticScore * weights.aesthetic +
        usabilityScore * weights.usability
      );

      const result = {
        overall: Math.round(overall * 100) / 100,
        breakdown: {
          technical: Math.round(technicalScore * 100) / 100,
          relevance: Math.round(relevanceScore * 100) / 100,
          aesthetic: Math.round(aestheticScore * 100) / 100,
          usability: Math.round(usabilityScore * 100) / 100
        },
        details: {
          technical: technical.details,
          relevance: relevance.details,
          aesthetic: aesthetic.details,
          usability: usability.details
        },
        recommendation: this.getRecommendation(overall),
        metadata: {
          width: imageInfo.width,
          height: imageInfo.height,
          format: imageInfo.format,
          space: imageInfo.space,
          channels: imageInfo.channels,
          depth: imageInfo.depth,
          density: imageInfo.density,
          hasAlpha: imageInfo.hasAlpha,
          isAnimated: imageInfo.pages > 1
        },
        analysisTime: Date.now() - startTime
      };

      logger.debug(`Quality analysis completed for ${path.basename(imagePath)}`, {
        overall: result.overall,
        breakdown: result.breakdown,
        recommendation: result.recommendation
      });

      return result;
    } catch (error) {
      logger.error('Quality analysis failed', {
        imagePath,
        error: error.message
      });
      throw error;
    }
  }

  async simpleFastAnalysis(imagePath, itemName, category) {
    try {
      // Quick metadata check
      const imageInfo = await sharp(imagePath).metadata();

      // Basic size and format checks
      const width = imageInfo.width || 0;
      const height = imageInfo.height || 0;
      const pixels = width * height;

      // Simple scoring based on size
      let technicalScore = 7.0; // Default good score
      if (pixels < 300 * 300) technicalScore = 4.0; // Too small
      else if (pixels > 1920 * 1080) technicalScore = 8.5; // High res

      // Default scores for development
      const relevanceScore = 7.0;
      const aestheticScore = 7.0;
      const usabilityScore = 7.0;

      const overall = (technicalScore + relevanceScore + aestheticScore + usabilityScore) / 4;

      return {
        overall: Math.round(overall * 100) / 100,
        breakdown: {
          technical: Math.round(technicalScore * 100) / 100,
          relevance: Math.round(relevanceScore * 100) / 100,
          aesthetic: Math.round(aestheticScore * 100) / 100,
          usability: Math.round(usabilityScore * 100) / 100
        },
        details: {
          mode: 'fast-development',
          imageSize: `${width}x${height}`,
          fileSize: imageInfo.size || 0,
          format: imageInfo.format || 'unknown'
        },
        processingTime: 0
      };
    } catch (error) {
      // Fallback if even simple analysis fails
      return {
        overall: 6.0,
        breakdown: {
          technical: 6.0,
          relevance: 6.0,
          aesthetic: 6.0,
          usability: 6.0
        },
        details: {
          mode: 'fast-fallback',
          error: error.message
        },
        processingTime: 0
      };
    }
  }

  async analyzeTechnical(imagePath, imageInfo) {
    const details = {};
    let score = 0;

    // Resolution scoring
    const pixels = imageInfo.width * imageInfo.height;
    const resolutionScore = this.scoreResolution(imageInfo.width, imageInfo.height);
    details.resolution = {
      width: imageInfo.width,
      height: imageInfo.height,
      pixels,
      score: resolutionScore,
      rating: this.getRating(resolutionScore)
    };
    score += resolutionScore * 0.4;

    // Aspect ratio scoring
    const aspectRatioScore = this.scoreAspectRatio(imageInfo.width, imageInfo.height);
    details.aspectRatio = {
      ratio: Math.round((imageInfo.width / imageInfo.height) * 100) / 100,
      score: aspectRatioScore,
      rating: this.getRating(aspectRatioScore)
    };
    score += aspectRatioScore * 0.2;

    // Format scoring
    const formatScore = this.scoreFormat(imageInfo.format);
    details.format = {
      format: imageInfo.format,
      score: formatScore,
      rating: this.getRating(formatScore)
    };
    score += formatScore * 0.2;

    // File size analysis
    try {
      const stats = await fs.stat(imagePath);
      const fileSizeScore = this.scoreFileSize(stats.size, pixels);
      details.fileSize = {
        bytes: stats.size,
        mb: Math.round(stats.size / (1024 * 1024) * 100) / 100,
        pixelRatio: Math.round(stats.size / pixels * 100) / 100,
        score: fileSizeScore,
        rating: this.getRating(fileSizeScore)
      };
      score += fileSizeScore * 0.2;
    } catch (error) {
      details.fileSize = { error: error.message, score: 5 };
      score += 5 * 0.2;
    }

    return {
      score: Math.min(10, Math.max(0, score)),
      details
    };
  }

  async analyzeRelevance(imagePath, itemName, category, sourceData) {
    const details = {};
    let score = 0;

    // Filename relevance
    const filename = path.basename(imagePath, path.extname(imagePath));
    const filenameScore = this.scoreTextRelevance(filename, itemName);
    details.filename = {
      filename,
      score: filenameScore,
      rating: this.getRating(filenameScore)
    };
    score += filenameScore * 0.3;

    // Source data relevance (tags, description, etc.)
    if (sourceData.tags && sourceData.tags.length > 0) {
      const tagsText = sourceData.tags.join(' ');
      const tagsScore = this.scoreTextRelevance(tagsText, itemName);
      details.tags = {
        tags: sourceData.tags,
        relevantTags: this.findRelevantTerms(tagsText, itemName),
        score: tagsScore,
        rating: this.getRating(tagsScore)
      };
      score += tagsScore * 0.4;
    } else {
      details.tags = { tags: [], score: 5, rating: 'average' };
      score += 5 * 0.4;
    }

    if (sourceData.description) {
      const descriptionScore = this.scoreTextRelevance(sourceData.description, itemName);
      details.description = {
        description: sourceData.description,
        relevantTerms: this.findRelevantTerms(sourceData.description, itemName),
        score: descriptionScore,
        rating: this.getRating(descriptionScore)
      };
      score += descriptionScore * 0.3;
    } else {
      details.description = { description: '', score: 5, rating: 'average' };
      score += 5 * 0.3;
    }

    return {
      score: Math.min(10, Math.max(0, score)),
      details
    };
  }

  async analyzeAesthetic(imagePath, imageInfo) {
    const details = {};
    let score = 7.0; // Default aesthetic score

    // Basic aesthetic checks
    details.basicChecks = {
      hasGoodAspectRatio: this.hasGoodAspectRatio(imageInfo.width, imageInfo.height),
      hasDecentResolution: imageInfo.width >= 400 && imageInfo.height >= 400,
      score: score,
      rating: this.getRating(score)
    };

    return {
      score: Math.min(10, Math.max(0, score)),
      details
    };
  }

  async analyzeUsability(imagePath, imageInfo, category) {
    const details = {};
    let score = 0;

    // Size appropriateness for web display
    const webSizeScore = this.scoreWebUsability(imageInfo.width, imageInfo.height);
    details.webUsability = {
      score: webSizeScore,
      rating: this.getRating(webSizeScore)
    };
    score += webSizeScore * 0.4;

    // Format appropriateness
    const formatUsabilityScore = this.scoreFormatUsability(imageInfo.format);
    details.formatUsability = {
      format: imageInfo.format,
      score: formatUsabilityScore,
      rating: this.getRating(formatUsabilityScore)
    };
    score += formatUsabilityScore * 0.3;

    // Educational appropriateness
    const educationalScore = this.scoreEducationalValue(category);
    details.educational = {
      category,
      score: educationalScore,
      rating: this.getRating(educationalScore)
    };
    score += educationalScore * 0.3;

    return {
      score: Math.min(10, Math.max(0, score)),
      details
    };
  }

  // Scoring helper methods
  scoreResolution(width, height) {
    const pixels = width * height;
    if (pixels < 160000) return 3; // < 400x400
    if (pixels < 640000) return 6; // < 800x800
    if (pixels < 1440000) return 8; // < 1200x1200
    return 9; // >= 1200x1200
  }

  scoreAspectRatio(width, height) {
    const ratio = width / height;
    // Prefer square to slightly rectangular images
    if (ratio >= 0.75 && ratio <= 1.33) return 9; // Good range
    if (ratio >= 0.5 && ratio <= 2.0) return 7; // Acceptable
    return 4; // Too extreme
  }

  scoreFormat(format) {
    const formatLower = format.toLowerCase();
    if (['webp', 'jpg', 'jpeg'].includes(formatLower)) return 9;
    if (['png'].includes(formatLower)) return 8;
    if (['tiff', 'bmp'].includes(formatLower)) return 6;
    return 4;
  }

  scoreFileSize(bytes, pixels) {
    const bytesPerPixel = bytes / pixels;
    if (bytesPerPixel < 0.5) return 5; // Too compressed
    if (bytesPerPixel < 2.0) return 9; // Good compression
    if (bytesPerPixel < 5.0) return 7; // Acceptable
    return 4; // Too large
  }

  scoreTextRelevance(text, itemName) {
    if (!text || !itemName) return 5;

    const textLower = text.toLowerCase();
    const itemLower = itemName.toLowerCase();

    // Exact match
    if (textLower.includes(itemLower)) return 9;

    // Partial matches
    const itemWords = itemLower.split(/\s+/);
    let matches = 0;
    for (const word of itemWords) {
      if (word.length > 2 && textLower.includes(word)) {
        matches++;
      }
    }

    if (matches === itemWords.length) return 8;
    if (matches > 0) return 6;
    return 4;
  }

  scoreWebUsability(width, height) {
    if (width >= 400 && height >= 400 && width <= 2000 && height <= 2000) return 9;
    if (width >= 200 && height >= 200) return 7;
    return 4;
  }

  scoreFormatUsability(format) {
    const formatLower = format.toLowerCase();
    if (['webp', 'jpg', 'jpeg'].includes(formatLower)) return 9;
    if (['png'].includes(formatLower)) return 8;
    return 6;
  }

  scoreEducationalValue(category) {
    // All categories are considered educationally valuable
    return 8;
  }

  hasGoodAspectRatio(width, height) {
    const ratio = width / height;
    return ratio >= 0.75 && ratio <= 1.33;
  }

  getRating(score) {
    if (score >= 8.5) return 'excellent';
    if (score >= 7.0) return 'good';
    if (score >= 5.0) return 'average';
    return 'poor';
  }

  getRecommendation(score) {
    if (score >= this.config.qualityControl.thresholds.excellent) {
      return 'auto_approve';
    }
    if (score >= this.config.qualityControl.thresholds.good) {
      return 'approve';
    }
    if (score >= this.config.qualityControl.thresholds.poor) {
      return 'manual_review';
    }
    return 'reject';
  }

  findRelevantTerms(text, itemName) {
    if (!text || !itemName) return [];

    const textLower = text.toLowerCase();
    const itemWords = itemName.toLowerCase().split(/\s+/);
    const relevantTerms = [];

    for (const word of itemWords) {
      if (word.length > 2 && textLower.includes(word)) {
        relevantTerms.push(word);
      }
    }

    return relevantTerms;
  }

  loadRelevanceKeywords() {
    // Basic relevance keywords for common categories
    return {
      animals: ['animal', 'wildlife', 'creature', 'mammal', 'bird', 'insect', 'pet'],
      fruits: ['fruit', 'fresh', 'organic', 'healthy', 'nutrition', 'vitamin'],
      vegetables: ['vegetable', 'fresh', 'organic', 'healthy', 'nutrition', 'garden'],
      transportation: ['transport', 'vehicle', 'travel', 'road', 'traffic'],
      colors: ['color', 'bright', 'vivid', 'hue', 'shade', 'palette'],
      shapes: ['shape', 'geometric', 'form', 'pattern', 'design']
    };
  }

  // Configuration update method
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

module.exports = QualityAnalyzer;