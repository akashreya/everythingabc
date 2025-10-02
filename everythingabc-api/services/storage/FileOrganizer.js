const fs = require('fs-extra');
const path = require('path');
const logger = require('../../utils/logger');

class FileOrganizer {
  constructor() {
    this.initialized = false;

    // Default configuration
    this.config = {
      storage: {
        basePath: process.env.STORAGE_BASE_PATH || path.join(process.cwd(), 'storage'),
        structure: {
          categories: 'categories',
          generated: 'generated',
          rejected: 'rejected',
          temp: 'temp'
        }
      }
    };

    this.basePath = this.config.storage.basePath;
    this.structure = this.config.storage.structure;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Create base directory structure
      await this.createBaseStructure();

      this.initialized = true;
      logger.info('FileOrganizer initialized successfully', {
        basePath: this.basePath
      });
    } catch (error) {
      logger.error('Failed to initialize FileOrganizer', error);
      throw error;
    }
  }

  async createBaseStructure() {
    const requiredDirs = [
      this.basePath,
      path.join(this.basePath, this.structure.categories),
      path.join(this.basePath, this.structure.generated),
      path.join(this.basePath, this.structure.rejected),
      path.join(this.basePath, this.structure.temp)
    ];

    for (const dir of requiredDirs) {
      await fs.ensureDir(dir);
      logger.debug(`Ensured directory exists: ${dir}`);
    }
  }

  async organizeImage(processedPath, processedSizes, category, letter, itemName, source, sourceId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      logger.debug(`Organizing image for ${category}/${letter}/${itemName}`);

      // Create category structure
      const categoryPath = await this.createCategoryStructure(category, letter, itemName);

      // Generate unique filename
      const fileName = this.generateFileName(itemName, source, sourceId);

      // Organize main processed image
      const primaryPath = path.join(categoryPath, `${fileName}.jpg`);
      await fs.copy(processedPath, primaryPath);

      // Organize different sizes
      const organizedSizes = [];
      for (const sizeInfo of processedSizes) {
        const sizePath = path.join(categoryPath, `${fileName}_${sizeInfo.name}.${sizeInfo.format || 'webp'}`);
        await fs.copy(sizeInfo.path, sizePath);

        organizedSizes.push({
          name: sizeInfo.name,
          path: sizePath,
          width: sizeInfo.width,
          height: sizeInfo.height,
          fileSize: sizeInfo.fileSize,
          format: sizeInfo.format
        });
      }

      const result = {
        primaryPath,
        fileName,
        categoryPath,
        sizes: organizedSizes,
        metadata: {
          category,
          letter,
          itemName,
          source,
          sourceId,
          organizedAt: new Date()
        }
      };

      logger.debug(`Image organized successfully`, {
        primaryPath,
        sizesCount: organizedSizes.length
      });

      return result;

    } catch (error) {
      logger.error(`Failed to organize image for ${category}/${letter}/${itemName}`, error);
      throw error;
    }
  }

  async createCategoryStructure(category, letter, itemName) {
    const categoryPath = path.join(
      this.basePath,
      this.structure.categories,
      category.toLowerCase(),
      letter.toLowerCase(),
      itemName.toLowerCase().replace(/[^a-z0-9]/g, '_')
    );

    await fs.ensureDir(categoryPath);
    return categoryPath;
  }

  generateFileName(itemName, source, sourceId) {
    const cleanItemName = itemName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const timestamp = Date.now();
    return `${cleanItemName}_${source}_${sourceId}_${timestamp}`;
  }

  async moveToRejected(imagePath, reason = 'quality') {
    const rejectedDir = path.join(this.basePath, this.structure.rejected, reason);
    await fs.ensureDir(rejectedDir);

    const fileName = path.basename(imagePath);
    const rejectedPath = path.join(rejectedDir, fileName);

    await fs.move(imagePath, rejectedPath);

    logger.debug(`Moved image to rejected folder`, {
      originalPath: imagePath,
      rejectedPath,
      reason
    });

    return rejectedPath;
  }

  async archiveImage(imagePath, archiveReason = 'duplicate') {
    const archiveDir = path.join(this.basePath, 'archive', archiveReason);
    await fs.ensureDir(archiveDir);

    const fileName = path.basename(imagePath);
    const timestamp = new Date().toISOString().split('T')[0];
    const archivedPath = path.join(archiveDir, `${timestamp}_${fileName}`);

    await fs.move(imagePath, archivedPath);

    logger.debug(`Archived image`, {
      originalPath: imagePath,
      archivedPath,
      reason: archiveReason
    });

    return archivedPath;
  }

  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) {
    const tempDir = path.join(this.basePath, this.structure.temp);

    if (!await fs.pathExists(tempDir)) {
      return { cleaned: 0, errors: 0 };
    }

    try {
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      let cleaned = 0;
      let errors = 0;

      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);

          if (now - stats.mtime.getTime() > maxAge) {
            await fs.remove(filePath);
            cleaned++;
          }
        } catch (error) {
          logger.warn(`Failed to clean temp file: ${file}`, error);
          errors++;
        }
      }

      logger.info(`Temp file cleanup completed`, {
        totalFiles: files.length,
        cleaned,
        errors,
        maxAgeHours: maxAge / (60 * 60 * 1000)
      });

      return { cleaned, errors };

    } catch (error) {
      logger.error('Failed to cleanup temp files', error);
      throw error;
    }
  }

  async getStorageStats() {
    try {
      const stats = {
        basePath: this.basePath,
        directories: {},
        totalSize: 0,
        totalFiles: 0
      };

      const directories = [
        this.structure.categories,
        this.structure.generated,
        this.structure.rejected,
        this.structure.temp
      ];

      for (const dir of directories) {
        const dirPath = path.join(this.basePath, dir);
        if (await fs.pathExists(dirPath)) {
          const dirStats = await this.getDirectoryStats(dirPath);
          stats.directories[dir] = dirStats;
          stats.totalSize += dirStats.size;
          stats.totalFiles += dirStats.files;
        }
      }

      stats.totalSizeFormatted = this.formatFileSize(stats.totalSize);

      return stats;

    } catch (error) {
      logger.error('Failed to get storage stats', error);
      throw error;
    }
  }

  async getDirectoryStats(dirPath) {
    let size = 0;
    let files = 0;

    const walk = async (currentPath) => {
      const items = await fs.readdir(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          await walk(itemPath);
        } else {
          size += stats.size;
          files++;
        }
      }
    };

    await walk(dirPath);

    return {
      size,
      files,
      sizeFormatted: this.formatFileSize(size)
    };
  }

  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Configuration update method
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.basePath = this.config.storage.basePath;
    this.structure = this.config.storage.structure;

    // Reset initialization if config changes
    if (this.initialized) {
      this.initialized = false;
    }
  }

  // Check if service is available
  isAvailable() {
    return this.initialized;
  }
}

module.exports = FileOrganizer;