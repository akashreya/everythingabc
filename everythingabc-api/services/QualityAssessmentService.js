/**
 * Quality Assessment Service
 *
 * This service evaluates image quality across multiple dimensions to ensure
 * only high-quality images are approved for the vocabulary platform.
 * It replicates the quality assessment logic from the Image Collection System.
 */

class QualityAssessmentService {
  constructor() {
    this.initialized = false;

    // Quality assessment thresholds
    this.thresholds = {
      technical: {
        minWidth: 300,
        minHeight: 300,
        maxFileSize: 5 * 1024 * 1024, // 5MB
        minFileSize: 5 * 1024, // 5KB
        preferredAspectRatio: 1.0, // Square preferred
        aspectRatioTolerance: 0.3
      },
      relevance: {
        titleMatchWeight: 0.4,
        contextMatchWeight: 0.3,
        visualMatchWeight: 0.3
      },
      aesthetic: {
        brightnessRange: [50, 200], // 0-255 scale
        contrastMinimum: 30,
        colorfulnessMinimum: 20
      },
      usability: {
        backgroundComplexityMax: 0.7,
        subjectClarityMin: 0.6,
        textOverlayPenalty: 0.2
      }
    };

    // Category-specific scoring adjustments
    this.categoryAdjustments = {
      animals: {
        preferLivingSubjects: true,
        penalizeCartoons: true,
        requireClearSubject: true
      },
      fruits: {
        preferNaturalColors: true,
        penalizeProcessed: true,
        requireCloseup: true
      },
      transportation: {
        allowTechnicalImages: true,
        preferSideViews: true,
        allowMultipleSubjects: true
      },
      colors: {
        prioritizeColorAccuracy: true,
        penalizeFilters: true,
        requireHighSaturation: true
      }
    };
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize any required libraries or models
      // For now, we'll use basic image analysis
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Quality Assessment Service: ${error.message}`);
    }
  }

  /**
   * Main quality assessment method
   * @param {Buffer} imageBuffer - The image data
   * @param {Object} context - Context about the image (item name, category, etc.)
   * @returns {Object} Quality score breakdown
   */
  async assessImage(imageBuffer, context = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Extract basic image properties
      const imageProperties = await this.extractImageProperties(imageBuffer);

      // Perform quality assessments
      const technical = await this.assessTechnicalQuality(imageProperties, context);
      const relevance = await this.assessRelevance(imageProperties, context);
      const aesthetic = await this.assessAestheticQuality(imageProperties, context);
      const usability = await this.assessUsability(imageProperties, context);

      // Calculate overall score
      const weights = {
        technical: 0.25,
        relevance: 0.35,
        aesthetic: 0.25,
        usability: 0.15
      };

      const overall = (
        technical * weights.technical +
        relevance * weights.relevance +
        aesthetic * weights.aesthetic +
        usability * weights.usability
      );

      return {
        overall: Math.round(overall * 10) / 10,
        breakdown: {
          technical: Math.round(technical * 10) / 10,
          relevance: Math.round(relevance * 10) / 10,
          aesthetic: Math.round(aesthetic * 10) / 10,
          usability: Math.round(usability * 10) / 10
        },
        details: {
          imageProperties,
          assessmentNotes: this.generateAssessmentNotes(technical, relevance, aesthetic, usability, context)
        }
      };

    } catch (error) {
      // Return a low score if assessment fails
      return {
        overall: 3.0,
        breakdown: {
          technical: 3.0,
          relevance: 3.0,
          aesthetic: 3.0,
          usability: 3.0
        },
        details: {
          error: error.message,
          assessmentNotes: ['Quality assessment failed due to technical error']
        }
      };
    }
  }

  async extractImageProperties(imageBuffer) {
    // In a real implementation, this would use Sharp or similar library
    // For now, we'll simulate basic property extraction

    const properties = {
      width: 800, // Placeholder
      height: 600, // Placeholder
      fileSize: imageBuffer.length,
      format: 'jpeg', // Placeholder
      aspectRatio: 800 / 600,

      // Simulated color analysis
      averageBrightness: 128,
      contrast: 45,
      colorfulness: 35,
      dominantColors: ['#4A90E2', '#7ED321', '#F5A623'],

      // Simulated composition analysis
      hasText: false,
      backgroundComplexity: 0.4,
      subjectClarity: 0.8,

      // Metadata
      hasTransparency: false,
      colorDepth: 24,
      compression: 'standard'
    };

    return properties;
  }

  async assessTechnicalQuality(properties, context) {
    let score = 10.0;
    const t = this.thresholds.technical;

    // Check resolution
    if (properties.width < t.minWidth || properties.height < t.minHeight) {
      score -= 3.0;
    } else if (properties.width >= 1000 && properties.height >= 1000) {
      score += 0.5; // Bonus for high resolution
    }

    // Check file size
    if (properties.fileSize > t.maxFileSize) {
      score -= 2.0;
    } else if (properties.fileSize < t.minFileSize) {
      score -= 2.5;
    }

    // Check aspect ratio (prefer square or close to square)
    const aspectDiff = Math.abs(properties.aspectRatio - t.preferredAspectRatio);
    if (aspectDiff > t.aspectRatioTolerance) {
      score -= Math.min(aspectDiff * 2, 2.0);
    }

    // Format preferences
    if (properties.format === 'webp') {
      score += 0.3;
    } else if (properties.format === 'png' && !properties.hasTransparency) {
      score -= 0.3;
    }

    // Color depth
    if (properties.colorDepth < 24) {
      score -= 1.0;
    }

    return Math.max(0, Math.min(10, score));
  }

  async assessRelevance(properties, context) {
    let score = 7.0; // Start with neutral score

    const { itemName = '', category = '' } = context;
    const r = this.thresholds.relevance;

    // Title/filename matching (simulated)
    const titleRelevance = this.calculateTitleRelevance(itemName, context.sourceDescription || '');
    score += (titleRelevance - 0.5) * r.titleMatchWeight * 10;

    // Category context matching
    const contextRelevance = this.calculateContextRelevance(category, properties);
    score += (contextRelevance - 0.5) * r.contextMatchWeight * 10;

    // Visual matching (simplified heuristics)
    const visualRelevance = this.calculateVisualRelevance(itemName, category, properties);
    score += (visualRelevance - 0.5) * r.visualMatchWeight * 10;

    // Category-specific adjustments
    const categoryAdjustment = this.applyCategoryRelevanceAdjustments(category, properties, context);
    score += categoryAdjustment;

    return Math.max(0, Math.min(10, score));
  }

  calculateTitleRelevance(itemName, description) {
    const itemWords = itemName.toLowerCase().split(/\\s+/);
    const descWords = description.toLowerCase().split(/\\s+/);

    let matches = 0;
    for (const word of itemWords) {
      if (descWords.some(descWord => descWord.includes(word) || word.includes(descWord))) {
        matches++;
      }
    }

    return itemWords.length > 0 ? matches / itemWords.length : 0.5;
  }

  calculateContextRelevance(category, properties) {
    // Simple heuristics based on category
    const categoryHints = {
      animals: ['natural', 'organic', 'warm'],
      fruits: ['colorful', 'natural', 'round'],
      transportation: ['metallic', 'geometric', 'manufactured'],
      colors: ['vibrant', 'pure', 'saturated']
    };

    const hints = categoryHints[category.toLowerCase()] || [];
    let relevanceScore = 0.5;

    // Check if image properties match category hints
    if (hints.includes('colorful') && properties.colorfulness > 40) relevanceScore += 0.2;
    if (hints.includes('natural') && properties.backgroundComplexity < 0.6) relevanceScore += 0.1;
    if (hints.includes('vibrant') && properties.averageBrightness > 100) relevanceScore += 0.1;

    return Math.min(1.0, relevanceScore);
  }

  calculateVisualRelevance(itemName, category, properties) {
    // Simplified visual relevance based on known patterns
    let relevance = 0.6; // Base relevance

    // Item-specific heuristics
    const item = itemName.toLowerCase();

    if (category.toLowerCase() === 'animals') {
      if (properties.subjectClarity > 0.7) relevance += 0.2;
      if (properties.backgroundComplexity < 0.5) relevance += 0.1;
    } else if (category.toLowerCase() === 'fruits') {
      if (properties.colorfulness > 30) relevance += 0.2;
      if (properties.averageBrightness > 80) relevance += 0.1;
    } else if (category.toLowerCase() === 'transportation') {
      if (properties.contrast > 35) relevance += 0.1;
      // Transportation items often have geometric shapes
    }

    return Math.min(1.0, relevance);
  }

  applyCategoryRelevanceAdjustments(category, properties, context) {
    const adjustments = this.categoryAdjustments[category.toLowerCase()];
    if (!adjustments) return 0;

    let adjustment = 0;

    if (adjustments.requireClearSubject && properties.subjectClarity < 0.6) {
      adjustment -= 1.5;
    }

    if (adjustments.preferNaturalColors && properties.colorfulness < 25) {
      adjustment -= 1.0;
    }

    if (adjustments.requireHighSaturation && properties.colorfulness < 30) {
      adjustment -= 1.0;
    }

    return adjustment;
  }

  async assessAestheticQuality(properties, context) {
    let score = 7.0;
    const a = this.thresholds.aesthetic;

    // Brightness assessment
    const brightness = properties.averageBrightness;
    if (brightness < a.brightnessRange[0] || brightness > a.brightnessRange[1]) {
      const deviation = Math.min(
        Math.abs(brightness - a.brightnessRange[0]),
        Math.abs(brightness - a.brightnessRange[1])
      );
      score -= Math.min(deviation / 50, 2.0);
    }

    // Contrast assessment
    if (properties.contrast < a.contrastMinimum) {
      score -= (a.contrastMinimum - properties.contrast) / 10;
    } else if (properties.contrast > 60) {
      score += 0.5; // Bonus for good contrast
    }

    // Colorfulness assessment
    if (properties.colorfulness < a.colorfulnessMinimum) {
      score -= (a.colorfulnessMinimum - properties.colorfulness) / 10;
    } else if (properties.colorfulness > 50) {
      score += 0.3; // Bonus for vibrant colors
    }

    // Color harmony (simplified)
    if (properties.dominantColors.length >= 2) {
      score += 0.2; // Bonus for color variety
    }

    // Penalize over-saturation
    if (properties.colorfulness > 80) {
      score -= 1.0;
    }

    return Math.max(0, Math.min(10, score));
  }

  async assessUsability(properties, context) {
    let score = 8.0;
    const u = this.thresholds.usability;

    // Background complexity
    if (properties.backgroundComplexity > u.backgroundComplexityMax) {
      score -= (properties.backgroundComplexity - u.backgroundComplexityMax) * 3;
    }

    // Subject clarity
    if (properties.subjectClarity < u.subjectClarityMin) {
      score -= (u.subjectClarityMin - properties.subjectClarity) * 4;
    }

    // Text overlay penalty
    if (properties.hasText) {
      score -= u.textOverlayPenalty * 10;
    }

    // Aspect ratio for display
    const aspectRatio = properties.aspectRatio;
    if (aspectRatio > 0.7 && aspectRatio < 1.4) {
      score += 0.5; // Good for display
    } else if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      score -= 1.0; // Poor for display
    }

    // Size appropriateness
    if (properties.width >= 400 && properties.height >= 400) {
      score += 0.3; // Good for web display
    }

    return Math.max(0, Math.min(10, score));
  }

  generateAssessmentNotes(technical, relevance, aesthetic, usability, context) {
    const notes = [];

    // Technical notes
    if (technical < 5) {
      notes.push('Image has technical quality issues (resolution, file size, or format)');
    } else if (technical > 8) {
      notes.push('Excellent technical quality');
    }

    // Relevance notes
    if (relevance < 5) {
      notes.push(`Image may not be relevant to "${context.itemName}" in category "${context.category}"`);
    } else if (relevance > 8) {
      notes.push('Highly relevant to the requested item');
    }

    // Aesthetic notes
    if (aesthetic < 5) {
      notes.push('Image has aesthetic issues (brightness, contrast, or color)');
    } else if (aesthetic > 8) {
      notes.push('Visually appealing with good color and contrast');
    }

    // Usability notes
    if (usability < 5) {
      notes.push('Image may be difficult to use (complex background, poor subject clarity)');
    } else if (usability > 8) {
      notes.push('Clear, easy-to-understand image suitable for learning');
    }

    // Overall assessment
    const overall = (technical + relevance + aesthetic + usability) / 4;
    if (overall >= 8.5) {
      notes.push('Recommended for automatic approval');
    } else if (overall < 5) {
      notes.push('Recommended for rejection');
    } else {
      notes.push('Requires manual review');
    }

    return notes;
  }

  /**
   * Batch assess multiple images
   * @param {Array} images - Array of {buffer, context} objects
   * @returns {Array} Array of quality assessments
   */
  async assessImages(images) {
    const assessments = [];

    for (const { buffer, context } of images) {
      try {
        const assessment = await this.assessImage(buffer, context);
        assessments.push({
          ...assessment,
          context
        });
      } catch (error) {
        assessments.push({
          overall: 2.0,
          breakdown: { technical: 2.0, relevance: 2.0, aesthetic: 2.0, usability: 2.0 },
          error: error.message,
          context
        });
      }
    }

    return assessments;
  }

  /**
   * Update quality thresholds
   * @param {Object} newThresholds - Updated threshold values
   */
  updateThresholds(newThresholds) {
    Object.assign(this.thresholds, newThresholds);
  }

  /**
   * Get quality statistics for a set of assessments
   * @param {Array} assessments - Array of quality assessments
   * @returns {Object} Statistics summary
   */
  getQualityStatistics(assessments) {
    if (assessments.length === 0) {
      return {
        count: 0,
        averageOverall: 0,
        averageBreakdown: {},
        distribution: {}
      };
    }

    const overallScores = assessments.map(a => a.overall);
    const technicalScores = assessments.map(a => a.breakdown.technical);
    const relevanceScores = assessments.map(a => a.breakdown.relevance);
    const aestheticScores = assessments.map(a => a.breakdown.aesthetic);
    const usabilityScores = assessments.map(a => a.breakdown.usability);

    const average = arr => arr.reduce((sum, val) => sum + val, 0) / arr.length;

    // Quality distribution
    const distribution = {
      excellent: overallScores.filter(s => s >= 9).length,
      good: overallScores.filter(s => s >= 7 && s < 9).length,
      acceptable: overallScores.filter(s => s >= 5 && s < 7).length,
      poor: overallScores.filter(s => s < 5).length
    };

    return {
      count: assessments.length,
      averageOverall: Math.round(average(overallScores) * 10) / 10,
      averageBreakdown: {
        technical: Math.round(average(technicalScores) * 10) / 10,
        relevance: Math.round(average(relevanceScores) * 10) / 10,
        aesthetic: Math.round(average(aestheticScores) * 10) / 10,
        usability: Math.round(average(usabilityScores) * 10) / 10
      },
      distribution,
      qualityPercentage: Math.round(((distribution.excellent + distribution.good) / assessments.length) * 100)
    };
  }
}

module.exports = QualityAssessmentService;