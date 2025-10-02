const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/adminAuth');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../middleware/permissions');
const AuditLog = require('../../models/AuditLog');
const Category = require('../../models/Category');
const AdminUser = require('../../models/AdminUser');
const asyncHandler = require('express-async-handler');

// GET /admin/dashboard/overview - Main dashboard overview
router.get('/overview',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    const { timeframe = '30d' } = req.query;

    // Get basic statistics
    const [
      totalCategories,
      categoriesStats,
      recentActivity,
      pendingReviews,
      systemHealth
    ] = await Promise.all([
      Category.countDocuments({ status: { $ne: 'archived' } }),
      getCategoriesStatistics(),
      getRecentActivity(timeframe),
      getPendingReviews(),
      getSystemHealth()
    ]);

    // Calculate completion rates
    const completionStats = await getCompletionStatistics();

    // Get attention items
    const attentionItems = await getAttentionRequired();

    await AuditLog.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'view',
      resourceType: 'system',
      resourceId: 'dashboard_overview',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { timeframe }
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalCategories,
          totalItems: categoriesStats.totalItems,
          pendingReviews: pendingReviews.length,
          completionRate: completionStats.overallCompletion
        },
        attentionRequired: attentionItems,
        recentActivity,
        systemHealth,
        completionStats,
        timestamp: new Date()
      }
    });
  })
);

// GET /admin/dashboard/analytics - Advanced analytics
router.get('/analytics',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    const {
      timeframe = '30d',
      groupBy = 'category',
      metric = 'completeness'
    } = req.query;

    const analytics = await getAdvancedAnalytics(timeframe, groupBy, metric);

    await AuditLog.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'view',
      resourceType: 'system',
      resourceId: 'advanced_analytics',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { timeframe, groupBy, metric }
    });

    res.json({
      success: true,
      data: analytics
    });
  })
);

// GET /admin/dashboard/performance - System performance metrics
router.get('/performance',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    const performance = await getPerformanceMetrics();

    res.json({
      success: true,
      data: performance
    });
  })
);

// GET /admin/dashboard/content-health - Content quality and health metrics
router.get('/content-health',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    const contentHealth = await getContentHealthMetrics();

    res.json({
      success: true,
      data: contentHealth
    });
  })
);

// GET /admin/dashboard/gaps-analysis - Platform-wide gaps analysis
router.get('/gaps-analysis',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  asyncHandler(async (req, res) => {
    const gapsAnalysis = await getPlatformGapsAnalysis();

    res.json({
      success: true,
      data: gapsAnalysis
    });
  })
);

// GET /admin/dashboard/activity-feed - Real-time activity feed
router.get('/activity-feed',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    const { limit = 20, type } = req.query;

    const activityFeed = await getActivityFeed(limit, type);

    res.json({
      success: true,
      data: activityFeed
    });
  })
);


// GET /admin/dashboard/export - Export dashboard data
router.get('/export',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ANALYTICS_EXPORT),
  asyncHandler(async (req, res) => {
    const { format = 'json', sections = 'all' } = req.query;

    const exportData = await generateDashboardExport(sections);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=dashboard-export.csv');
      res.send(convertToCSV(exportData));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=dashboard-export.json');
      res.json(exportData);
    }

    await AuditLog.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'create',
      resourceType: 'system',
      resourceId: 'dashboard_export',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { format, sections }
    });
  })
);

// Helper functions

async function getCategoriesStatistics() {
  const pipeline = [
    {
      $match: { status: { $ne: 'archived' } }
    },
    {
      $group: {
        _id: null,
        totalCategories: { $sum: 1 },
        totalItems: { $sum: '$metadata.totalItems' },
        avgQuality: { $avg: '$metadata.qualityScore' },
        avgCompleteness: { $avg: '$metadata.completenessScore' }
      }
    }
  ];

  const result = await Category.aggregate(pipeline);
  return result[0] || {
    totalCategories: 0,
    totalItems: 0,
    avgQuality: 0,
    avgCompleteness: 0
  };
}

async function getRecentActivity(timeframe) {
  const days = parseInt(timeframe.replace('d', ''));
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const activities = await AuditLog.find({
    timestamp: { $gte: startDate },
    action: { $in: ['create', 'update', 'approve', 'reject'] }
  })
  .sort({ timestamp: -1 })
  .limit(10)
  .populate('userId', 'firstName lastName email')
  .lean();

  return activities.map(activity => ({
    id: activity._id,
    action: activity.action,
    resourceType: activity.resourceType,
    resourceId: activity.resourceId,
    user: activity.userId,
    timestamp: activity.timestamp,
    description: generateActivityDescription(activity)
  }));
}

async function getPendingReviews() {
  // This would typically query a reviews collection
  // For now, we'll simulate by finding items with pending status
  const categoriesWithPending = await Category.find({
    status: { $ne: 'archived' }
  }).lean();

  let pendingReviews = [];

  categoriesWithPending.forEach(category => {
    const items = category.items || {};
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    alphabet.forEach(letter => {
      const letterItems = items[letter] || [];
      letterItems.forEach(item => {
        if (item.quality?.status === 'pending' || item.quality?.status === 'review') {
          pendingReviews.push({
            itemId: item.id,
            itemName: item.name,
            categoryId: category._id,
            categoryName: category.name,
            letter,
            createdAt: item.audit?.createdAt,
            priority: determinePriority(item, category)
          });
        }
      });
    });
  });

  return pendingReviews.sort((a, b) => {
    // Sort by priority (high first) then by creation date (oldest first)
    if (a.priority !== b.priority) {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

async function getSystemHealth() {
  // Simulate system health metrics
  return {
    mongodb: {
      status: 'healthy',
      avgQueryTime: 2.3,
      connectionPool: 'optimal'
    },
    api: {
      status: 'healthy',
      responseTime: 150,
      uptime: '99.9%'
    },
    storage: {
      status: 'healthy',
      usage: '45%',
      available: '2.1TB'
    },
    overall: 'healthy'
  };
}

async function getCompletionStatistics() {
  const categories = await Category.find({
    status: { $ne: 'archived' }
  }).lean();

  let totalLetters = 0;
  let completedLetters = 0;
  let totalItems = 0;
  let activeItems = 0;

  categories.forEach(category => {
    const items = category.items || {};
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    alphabet.forEach(letter => {
      totalLetters++;
      const letterItems = items[letter] || [];
      const activeLetterItems = letterItems.filter(item =>
        item.quality?.status === 'approved' || item.quality?.status === 'active'
      );

      totalItems += letterItems.length;
      activeItems += activeLetterItems.length;

      if (activeLetterItems.length > 0) {
        completedLetters++;
      }
    });
  });

  return {
    overallCompletion: Math.round((completedLetters / totalLetters) * 100),
    totalCategories: categories.length,
    completedCategories: categories.filter(c => (c.metadata?.completenessScore || 0) === 26).length,
    totalItems,
    activeItems,
    qualityScore: categories.reduce((sum, c) => sum + (c.metadata?.qualityScore || 0), 0) / categories.length
  };
}

async function getAttentionRequired() {
  const categories = await Category.find({
    status: { $ne: 'archived' }
  }).lean();

  const attentionItems = [];

  // Check for categories with critical gaps
  categories.forEach(category => {
    const gaps = category.gaps || {};
    const missingLetters = gaps.missingLetters || [];
    const sparseLetters = gaps.sparseLetters || [];

    if (missingLetters.length > 0) {
      attentionItems.push({
        type: 'critical_gaps',
        priority: 'high',
        categoryId: category._id,
        categoryName: category.name,
        message: `Missing items for letters: ${missingLetters.join(', ')}`,
        count: missingLetters.length
      });
    }

    if (sparseLetters.length > 3) {
      attentionItems.push({
        type: 'sparse_content',
        priority: 'medium',
        categoryId: category._id,
        categoryName: category.name,
        message: `Only 1 item for letters: ${sparseLetters.join(', ')}`,
        count: sparseLetters.length
      });
    }
  });

  // Check for quality issues
  const lowQualityCategories = categories.filter(c =>
    (c.metadata?.qualityScore || 0) < 3.0
  );

  lowQualityCategories.forEach(category => {
    attentionItems.push({
      type: 'quality_issues',
      priority: 'medium',
      categoryId: category._id,
      categoryName: category.name,
      message: `Low quality score: ${category.metadata?.qualityScore || 0}/5`,
      score: category.metadata?.qualityScore || 0
    });
  });

  return attentionItems.slice(0, 10); // Limit to top 10 issues
}

async function getAdvancedAnalytics(timeframe, groupBy, metric) {
  const days = parseInt(timeframe.replace('d', ''));
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // This would integrate with your analytics database
  // For now, return structured data
  return {
    timeframe,
    groupBy,
    metric,
    data: await generateAnalyticsData(startDate, groupBy, metric),
    trends: await calculateTrends(startDate, metric),
    summary: await getAnalyticsSummary(startDate)
  };
}

async function getPerformanceMetrics() {
  // Simulate performance metrics
  return {
    database: {
      mongodb: {
        avgQueryTime: 2.3,
        slowQueries: 0,
        connectionPool: 'healthy'
      }
    },
    api: {
      avgResponseTime: 145,
      requestsPerMinute: 235,
      errorRate: 0.02
    },
    memory: {
      usage: '68%',
      available: '2.1GB'
    },
    storage: {
      usage: '45%',
      growth: '+2.3GB/month'
    }
  };
}

async function getContentHealthMetrics() {
  const categories = await Category.find({
    status: { $ne: 'archived' }
  }).lean();

  let totalItems = 0;
  let approvedItems = 0;
  let pendingItems = 0;
  let rejectedItems = 0;
  let qualityScores = [];

  categories.forEach(category => {
    const items = category.items || {};
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    alphabet.forEach(letter => {
      const letterItems = items[letter] || [];
      letterItems.forEach(item => {
        totalItems++;
        const status = item.quality?.status;
        if (status === 'approved' || status === 'active') approvedItems++;
        else if (status === 'pending' || status === 'review') pendingItems++;
        else if (status === 'rejected') rejectedItems++;

        if (item.quality?.score) {
          qualityScores.push(item.quality.score);
        }
      });
    });
  });

  const avgQuality = qualityScores.length > 0 ?
    qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 0;

  return {
    overview: {
      totalItems,
      approvedItems,
      pendingItems,
      rejectedItems,
      approvalRate: totalItems > 0 ? Math.round((approvedItems / totalItems) * 100) : 0
    },
    quality: {
      averageScore: Math.round(avgQuality * 10) / 10,
      distribution: calculateQualityDistribution(qualityScores)
    },
    completeness: {
      categoriesComplete: categories.filter(c => (c.metadata?.completenessScore || 0) === 26).length,
      averageCompletion: Math.round(
        categories.reduce((sum, c) => sum + (c.metadata?.completenessScore || 0), 0) / categories.length
      )
    }
  };
}

async function getPlatformGapsAnalysis() {
  const categories = await Category.find({
    status: { $ne: 'archived' }
  }).lean();

  const letterStats = {};
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
    letterStats[letter] = {
      totalCategories: 0,
      categoriesWithItems: 0,
      totalItems: 0,
      criticalGaps: []
    };
  });

  categories.forEach(category => {
    const items = category.items || {};

    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
      letterStats[letter].totalCategories++;

      const letterItems = items[letter] || [];
      const activeItems = letterItems.filter(item =>
        item.quality?.status === 'approved' || item.quality?.status === 'active'
      );

      if (activeItems.length > 0) {
        letterStats[letter].categoriesWithItems++;
        letterStats[letter].totalItems += activeItems.length;
      } else {
        letterStats[letter].criticalGaps.push({
          categoryId: category._id,
          categoryName: category.name
        });
      }
    });
  });

  // Identify problem letters
  const problemLetters = Object.entries(letterStats)
    .filter(([letter, stats]) => {
      const completionRate = stats.categoriesWithItems / stats.totalCategories;
      return completionRate < 0.5; // Less than 50% completion
    })
    .sort((a, b) => {
      const aRate = a[1].categoriesWithItems / a[1].totalCategories;
      const bRate = b[1].categoriesWithItems / b[1].totalCategories;
      return aRate - bRate; // Sort by completion rate (lowest first)
    });

  return {
    letterStats,
    problemLetters: problemLetters.slice(0, 10),
    recommendations: generateGapRecommendations(problemLetters),
    summary: {
      totalCategories: categories.length,
      avgCompletionRate: Object.values(letterStats).reduce((sum, stats) =>
        sum + (stats.categoriesWithItems / stats.totalCategories), 0
      ) / 26
    }
  };
}

async function getActivityFeed(limit, type) {
  const filter = {};
  if (type) {
    filter.action = type;
  }

  const activities = await AuditLog.find(filter)
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .lean();

  return activities.map(activity => ({
    id: activity._id,
    timestamp: activity.timestamp,
    action: activity.action,
    resourceType: activity.resourceType,
    description: generateActivityDescription(activity),
    user: activity.userId,
    metadata: activity.metadata
  }));
}

// Utility functions
function determinePriority(item, category) {
  // Determine priority based on item age, category importance, etc.
  const daysOld = (new Date() - new Date(item.audit?.createdAt)) / (1000 * 60 * 60 * 24);
  if (daysOld > 7) return 'high';
  if (daysOld > 3) return 'medium';
  return 'low';
}

function generateActivityDescription(activity) {
  const { action, resourceType, resourceId } = activity;
  const actionMap = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    approve: 'Approved',
    reject: 'Rejected'
  };

  return `${actionMap[action] || action} ${resourceType} ${resourceId}`;
}

async function generateAnalyticsData(startDate, groupBy, metric) {
  // This would query your analytics database
  // For now, return sample data
  return {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      label: metric,
      data: [65, 70, 75, 80]
    }]
  };
}

async function calculateTrends(startDate, metric) {
  // Calculate trends for the metric
  return {
    direction: 'up', // up, down, stable
    percentage: 12.5,
    period: 'vs last month'
  };
}

async function getAnalyticsSummary(startDate) {
  return {
    totalActions: 1247,
    newItems: 89,
    approvals: 156,
    qualityImprovements: 23
  };
}

function calculateQualityDistribution(scores) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  scores.forEach(score => {
    const rounded = Math.round(score);
    if (distribution[rounded] !== undefined) {
      distribution[rounded]++;
    }
  });
  return distribution;
}

function generateGapRecommendations(problemLetters) {
  return problemLetters.slice(0, 5).map(([letter, stats]) => ({
    letter,
    priority: 'high',
    action: 'bulk_content_generation',
    description: `Generate content for letter ${letter} across ${stats.criticalGaps.length} categories`,
    impact: `Would improve completion by ${Math.round((1/26) * 100)}%`
  }));
}

async function generateDashboardExport(sections) {
  const exportData = {
    generatedAt: new Date(),
    sections: {}
  };

  if (sections === 'all' || sections.includes('overview')) {
    exportData.sections.overview = await getCategoriesStatistics();
  }

  if (sections === 'all' || sections.includes('gaps')) {
    exportData.sections.gaps = await getPlatformGapsAnalysis();
  }

  if (sections === 'all' || sections.includes('health')) {
    exportData.sections.contentHealth = await getContentHealthMetrics();
  }

  return exportData;
}

function convertToCSV(data) {
  // Simple CSV conversion - would need more sophisticated implementation
  return JSON.stringify(data, null, 2);
}

module.exports = router;