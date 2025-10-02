// Load environment variables first
require('dotenv').config();

const mongoose = require('mongoose');
const ImageCollector = require('../services/collection/ImageCollector');
const logger = require('../utils/logger');

async function testDirectS3Upload() {
  try {
    console.log('\n🚀 Testing Direct-to-S3 Upload Workflow\n');
    console.log('========================================\n');

    // Verify AWS credentials
    console.log('🔑 AWS Configuration:');
    console.log(`   Region: ${process.env.AWS_REGION || 'NOT SET'}`);
    console.log(`   Access Key: ${process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log(`   Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY ? '***' + process.env.AWS_SECRET_ACCESS_KEY.slice(-4) : 'NOT SET'}`);
    console.log(`   S3 Bucket: ${process.env.S3_IMAGES_BUCKET || 'NOT SET'}`);
    console.log(`   CloudFront: ${process.env.CLOUDFRONT_DOMAIN || 'NOT SET'}\n`);

    // Connect to database
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/everythingabc';
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB');

    // Initialize ImageCollector
    const imageCollector = new ImageCollector();
    await imageCollector.initialize();
    console.log('✅ ImageCollector initialized');

    // Test configuration
    const testConfig = {
      category: 'animals',
      letter: 'A',
      itemName: 'ant',
      targetCount: 1,
      uploadToCloud: true,
      minQualityScore: 6.0
    };

    console.log('\n📋 Test Configuration:');
    console.log(`   Category: ${testConfig.category}`);
    console.log(`   Letter: ${testConfig.letter}`);
    console.log(`   Item: ${testConfig.itemName}`);
    console.log(`   Target: ${testConfig.targetCount} image(s)`);
    console.log(`   Cloud Upload: ${testConfig.uploadToCloud ? 'Enabled' : 'Disabled'}`);
    console.log(`   Min Quality: ${testConfig.minQualityScore}\n`);

    // Run collection
    console.log('🔄 Starting image collection...\n');
    const startTime = Date.now();

    const result = await imageCollector.collectImagesForItem(
      testConfig.category,
      testConfig.letter,
      testConfig.itemName,
      {
        targetCount: testConfig.targetCount,
        uploadToCloud: testConfig.uploadToCloud,
        minQualityScore: testConfig.minQualityScore
      }
    );

    const duration = Date.now() - startTime;

    // Display results
    console.log('\n✅ Collection Complete!\n');
    console.log('========================================\n');
    console.log('📊 Results Summary:');
    console.log(`   Total Collected: ${result.collectedCount}`);
    console.log(`   Approved: ${result.approvedCount}`);
    console.log(`   Rejected: ${result.rejectedCount}`);
    console.log(`   Processing Time: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Avg Time/Image: ${(duration / result.collectedCount / 1000).toFixed(2)}s\n`);

    // Display image details
    if (result.images && result.images.length > 0) {
      console.log('🖼️  Image Details:\n');

      result.images.forEach((image, index) => {
        console.log(`   Image ${index + 1}:`);
        console.log(`     Source: ${image.sourceProvider}`);
        console.log(`     Quality Score: ${image.qualityScore?.overall?.toFixed(2) || 'N/A'}`);
        console.log(`     Status: ${image.status}`);

        if (image.cloud && image.cloud.uploadStatus === 'completed') {
          console.log(`     ✅ Cloud Upload: SUCCESS`);
          console.log(`     S3 Bucket: ${image.cloud.s3Bucket}`);
          if (image.files) {
            console.log(`     CDN URLs:`);
            Object.entries(image.files).forEach(([size, data]) => {
              console.log(`       ${size}: ${data.cdnUrl}`);
            });
          }
        } else if (image.processedSizes) {
          console.log(`     📁 Local Storage: ${image.processedSizes.length} sizes`);
        }

        console.log('');
      });
    }

    // Display errors if any
    if (result.errors && result.errors.length > 0) {
      console.log('⚠️  Errors Encountered:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.source}: ${error.error}`);
      });
      console.log('');
    }

    // Performance metrics
    console.log('⚡ Performance Metrics:');
    console.log(`   Method: Direct-to-S3 (Memory Buffer)`);
    console.log(`   Speed: ~${(result.collectedCount * 1000 / duration).toFixed(2)} images/second`);
    console.log(`   Efficiency: ${result.approvedCount > 0 ? 'HIGH' : 'LOW'}\n`);

    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run test
testDirectS3Upload();
