const Queue = require('bull');
const logger = require('../../utils/logger');

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.initialized = false;

    // Queue configuration
    this.config = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0
      },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 50,
        attempts: 3,
        backoff: 'exponential',
        delay: 0
      }
    };

    // Queue definitions
    this.queueDefinitions = {
      'image-collection': {
        name: 'image-collection',
        processor: require('./processors/ImageCollectionProcessor'),
        concurrency: 3,
        jobOptions: {
          removeOnComplete: 100,
          removeOnFail: 100,
          attempts: 3,
          backoff: 'exponential'
        }
      },
      'image-processing': {
        name: 'image-processing',
        processor: require('./processors/ImageProcessingProcessor'),
        concurrency: 5,
        jobOptions: {
          removeOnComplete: 50,
          removeOnFail: 50,
          attempts: 2,
          backoff: 'fixed'
        }
      },
      'cloud-upload': {
        name: 'cloud-upload',
        processor: require('./processors/CloudUploadProcessor'),
        concurrency: 10,
        jobOptions: {
          removeOnComplete: 50,
          removeOnFail: 50,
          attempts: 5,
          backoff: 'exponential'
        }
      },
      'quality-analysis': {
        name: 'quality-analysis',
        processor: require('./processors/QualityAnalysisProcessor'),
        concurrency: 8,
        jobOptions: {
          removeOnComplete: 50,
          removeOnFail: 50,
          attempts: 2,
          backoff: 'fixed'
        }
      }
    };
  }

  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('Initializing queue manager...');

      // Test Redis connection
      await this.testRedisConnection();

      // Initialize all queues
      for (const [queueName, queueDef] of Object.entries(this.queueDefinitions)) {
        await this.initializeQueue(queueName, queueDef);
      }

      // Set up global error handlers
      this.setupGlobalErrorHandlers();

      this.initialized = true;
      logger.info('Queue manager initialized successfully', {
        queues: Array.from(this.queues.keys()),
        redis: {
          host: this.config.redis.host,
          port: this.config.redis.port
        }
      });
    } catch (error) {
      logger.error('Failed to initialize queue manager', error);
      throw error;
    }
  }

  async testRedisConnection() {
    const testQueue = new Queue('test-connection', {
      redis: this.config.redis,
      defaultJobOptions: this.config.defaultJobOptions
    });

    try {
      await testQueue.add('test', {}, { removeOnComplete: 1, removeOnFail: 1 });
      await testQueue.clean(0); // Clean immediately
      await testQueue.close();
      logger.debug('Redis connection test successful');
    } catch (error) {
      throw new Error(`Redis connection failed: ${error.message}`);
    }
  }

  async initializeQueue(queueName, queueDef) {
    try {
      const queue = new Queue(queueDef.name, {
        redis: this.config.redis,
        defaultJobOptions: {
          ...this.config.defaultJobOptions,
          ...queueDef.jobOptions
        }
      });

      // Set up queue processor
      if (queueDef.processor) {
        queue.process(queueDef.concurrency || 1, queueDef.processor);
      }

      // Set up queue event handlers
      this.setupQueueEventHandlers(queue, queueName);

      this.queues.set(queueName, queue);
      logger.info(`Initialized queue: ${queueName}`, {
        concurrency: queueDef.concurrency || 1,
        hasProcessor: !!queueDef.processor
      });
    } catch (error) {
      logger.error(`Failed to initialize queue: ${queueName}`, error);
      throw error;
    }
  }

  setupQueueEventHandlers(queue, queueName) {
    queue.on('completed', (job, result) => {
      logger.info(`Job completed in queue ${queueName}`, {
        jobId: job.id,
        jobType: job.name,
        duration: Date.now() - job.timestamp,
        result: typeof result === 'object' ? JSON.stringify(result).slice(0, 200) : result
      });
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job failed in queue ${queueName}`, {
        jobId: job.id,
        jobType: job.name,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: error.message,
        data: job.data
      });
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job stalled in queue ${queueName}`, {
        jobId: job.id,
        jobType: job.name
      });
    });

    queue.on('progress', (job, progress) => {
      logger.debug(`Job progress in queue ${queueName}`, {
        jobId: job.id,
        jobType: job.name,
        progress
      });
    });
  }

  setupGlobalErrorHandlers() {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception in queue process', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection in queue process', {
        reason,
        promise
      });
    });
  }

  getQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found. Available queues: ${Array.from(this.queues.keys()).join(', ')}`);
    }
    return queue;
  }

  async addJob(queueName, jobType, data, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const queue = this.getQueue(queueName);

    try {
      const job = await queue.add(jobType, data, {
        ...this.config.defaultJobOptions,
        ...options
      });

      logger.info(`Job added to queue ${queueName}`, {
        jobId: job.id,
        jobType,
        priority: options.priority || 0,
        delay: options.delay || 0
      });

      return job;
    } catch (error) {
      logger.error(`Failed to add job to queue ${queueName}`, {
        jobType,
        data,
        error: error.message
      });
      throw error;
    }
  }

  async getJobCounts(queueName) {
    const queue = this.getQueue(queueName);

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ]);

      // Check if queue is paused
      const isPaused = await queue.isPaused();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: isPaused ? waiting.length : 0,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      };
    } catch (error) {
      logger.error(`Failed to get job counts for queue ${queueName}`, error);
      throw error;
    }
  }

  async getQueueStats() {
    const stats = {};

    for (const queueName of this.queues.keys()) {
      try {
        const counts = await this.getJobCounts(queueName);
        stats[queueName] = counts;
      } catch (error) {
        stats[queueName] = { error: error.message };
      }
    }

    return {
      queues: stats,
      totalQueues: this.queues.size,
      redis: {
        host: this.config.redis.host,
        port: this.config.redis.port,
        connected: true
      },
      timestamp: new Date()
    };
  }

  async pauseQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.pause();
    logger.info(`Queue paused: ${queueName}`);
  }

  async resumeQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.resume();
    logger.info(`Queue resumed: ${queueName}`);
  }

  async cleanQueue(queueName, maxAge = 24 * 60 * 60 * 1000) {
    const queue = this.getQueue(queueName);

    try {
      const cleanedJobs = await queue.clean(maxAge, 'completed');
      const cleanedFailedJobs = await queue.clean(maxAge, 'failed');

      logger.info(`Cleaned queue ${queueName}`, {
        completedJobs: cleanedJobs.length,
        failedJobs: cleanedFailedJobs.length,
        maxAge: `${maxAge / 1000 / 60 / 60}h`
      });

      return {
        completed: cleanedJobs.length,
        failed: cleanedFailedJobs.length
      };
    } catch (error) {
      logger.error(`Failed to clean queue ${queueName}`, error);
      throw error;
    }
  }

  async retryFailedJobs(queueName, maxJobs = 10) {
    const queue = this.getQueue(queueName);

    try {
      const failedJobs = await queue.getFailed(0, maxJobs - 1);
      const retryPromises = failedJobs.map(job => job.retry());

      await Promise.all(retryPromises);

      logger.info(`Retried failed jobs in queue ${queueName}`, {
        jobsRetried: failedJobs.length
      });

      return failedJobs.length;
    } catch (error) {
      logger.error(`Failed to retry jobs in queue ${queueName}`, error);
      throw error;
    }
  }

  async closeAll() {
    logger.info('Closing all queues...');

    const closePromises = Array.from(this.queues.values()).map(queue =>
      queue.close().catch(error =>
        logger.error('Error closing queue', error)
      )
    );

    await Promise.all(closePromises);
    this.queues.clear();
    this.initialized = false;

    logger.info('All queues closed');
  }

  // Convenience methods for specific queues
  async addImageCollectionJob(data, options = {}) {
    return this.addJob('image-collection', 'collect-images', data, options);
  }

  async addImageProcessingJob(data, options = {}) {
    return this.addJob('image-processing', 'process-image', data, options);
  }

  async addCloudUploadJob(data, options = {}) {
    return this.addJob('cloud-upload', 'upload-to-cloud', data, options);
  }

  async addQualityAnalysisJob(data, options = {}) {
    return this.addJob('quality-analysis', 'analyze-quality', data, options);
  }

  // Get specific queue instances
  get collectionQueue() {
    return this.getQueue('image-collection');
  }

  get processingQueue() {
    return this.getQueue('image-processing');
  }

  get uploadQueue() {
    return this.getQueue('cloud-upload');
  }

  get qualityQueue() {
    return this.getQueue('quality-analysis');
  }
}

// Create singleton instance
const queueManager = new QueueManager();

module.exports = {
  QueueManager,
  queueManager
};