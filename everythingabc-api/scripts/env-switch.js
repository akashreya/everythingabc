#!/usr/bin/env node

/**
 * Environment Switching Script
 *
 * This script helps developers quickly switch between different environment configurations.
 * Usage: node scripts/env-switch.js [development|test|local]
 */

const fs = require('fs');
const path = require('path');

const environments = {
  development: {
    file: '.env.development',
    description: 'In-memory MongoDB for fast development',
    features: ['Memory DB', 'Debug logging', 'Auth disabled', 'Fast startup']
  },
  test: {
    file: '.env.test',
    description: 'Isolated testing environment',
    features: ['Memory DB', 'Error logging only', 'Relaxed limits', 'No external APIs']
  },
  local: {
    file: '.env.local',
    description: 'External MongoDB with production-like settings',
    features: ['External MongoDB', 'Redis enabled', 'AWS enabled', 'Full features']
  },
  production: {
    file: '.env.production',
    description: 'Production environment settings',
    features: ['External DB required', 'Security enabled', 'All APIs enabled', 'Monitoring']
  }
};

function switchEnvironment(envName) {
  const envConfig = environments[envName];
  if (!envConfig) {
    console.error(`❌ Unknown environment: ${envName}`);
    console.log('Available environments:');
    Object.keys(environments).forEach(env => {
      console.log(`  - ${env}: ${environments[env].description}`);
    });
    process.exit(1);
  }

  const sourceFile = path.join(__dirname, '..', envConfig.file);
  const targetFile = path.join(__dirname, '..', '.env');

  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Environment file not found: ${envConfig.file}`);
    process.exit(1);
  }

  try {
    // Backup current .env if it exists
    if (fs.existsSync(targetFile)) {
      const backupFile = path.join(__dirname, '..', `.env.backup.${Date.now()}`);
      fs.copyFileSync(targetFile, backupFile);
      console.log(`💾 Backed up current .env to: ${path.basename(backupFile)}`);
    }

    // Copy the new environment file
    fs.copyFileSync(sourceFile, targetFile);

    console.log(`✅ Switched to ${envName} environment`);
    console.log(`📝 Description: ${envConfig.description}`);
    console.log(`🔧 Features:`);
    envConfig.features.forEach(feature => {
      console.log(`   - ${feature}`);
    });

    // Show key configuration
    const envContent = fs.readFileSync(targetFile, 'utf8');
    const useMemoryDb = envContent.includes('USE_MEMORY_DB=true');
    const nodeEnv = envContent.match(/NODE_ENV=(.+)/)?.[1] || 'unknown';
    const port = envContent.match(/PORT=(.+)/)?.[1] || '3003';

    console.log(`\n📊 Key Settings:`);
    console.log(`   Environment: ${nodeEnv}`);
    console.log(`   Port: ${port}`);
    console.log(`   Memory DB: ${useMemoryDb ? 'Yes' : 'No'}`);

    if (envName === 'development' || envName === 'test') {
      console.log(`\n🚀 Quick start:`);
      console.log(`   npm run dev`);
      console.log(`   npm run test:v2:quick`);
    } else if (envName === 'local') {
      console.log(`\n⚠️  Prerequisites:`);
      console.log(`   - MongoDB running on localhost:27017`);
      console.log(`   - Redis running on localhost:6379 (optional)`);
      console.log(`\n🚀 Quick start:`);
      console.log(`   npm start`);
    }

  } catch (error) {
    console.error(`❌ Failed to switch environment: ${error.message}`);
    process.exit(1);
  }
}

function showCurrentEnvironment() {
  const envFile = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envFile)) {
    console.log('❌ No .env file found');
    return;
  }

  const envContent = fs.readFileSync(envFile, 'utf8');
  const useMemoryDb = envContent.includes('USE_MEMORY_DB=true');
  const nodeEnv = envContent.match(/NODE_ENV=(.+)/)?.[1] || 'unknown';
  const port = envContent.match(/PORT=(.+)/)?.[1] || '3003';
  const mongoUri = envContent.match(/MONGODB_URI=(.+)/)?.[1] || 'unknown';

  console.log('📋 Current Environment Configuration:');
  console.log(`   Environment: ${nodeEnv}`);
  console.log(`   Port: ${port}`);
  console.log(`   Memory DB: ${useMemoryDb ? 'Yes' : 'No'}`);
  console.log(`   MongoDB URI: ${mongoUri}`);

  // Try to detect which preset this matches
  const detectedEnv = Object.keys(environments).find(env => {
    const envConfigFile = path.join(__dirname, '..', environments[env].file);
    if (fs.existsSync(envConfigFile)) {
      const configContent = fs.readFileSync(envConfigFile, 'utf8');
      return configContent.includes(`NODE_ENV=${nodeEnv}`) &&
             configContent.includes(`USE_MEMORY_DB=${useMemoryDb}`);
    }
    return false;
  });

  if (detectedEnv) {
    console.log(`   Preset: ${detectedEnv} (${environments[detectedEnv].description})`);
  }
}

function listEnvironments() {
  console.log('🌍 Available Environment Configurations:\n');

  Object.keys(environments).forEach(envName => {
    const env = environments[envName];
    const envFile = path.join(__dirname, '..', env.file);
    const exists = fs.existsSync(envFile);

    console.log(`${envName.toUpperCase()}:`);
    console.log(`  Description: ${env.description}`);
    console.log(`  File: ${env.file} ${exists ? '✅' : '❌'}`);
    console.log(`  Features: ${env.features.join(', ')}`);
    console.log('');
  });
}

// CLI Interface
const command = process.argv[2];

if (!command) {
  console.log('🔄 Environment Switcher\n');
  console.log('Usage: node scripts/env-switch.js <command>\n');
  console.log('Commands:');
  console.log('  development  - Switch to development environment');
  console.log('  test         - Switch to test environment');
  console.log('  local        - Switch to local environment');
  console.log('  current      - Show current environment');
  console.log('  list         - List all available environments');
  console.log('');
  showCurrentEnvironment();
} else if (command === 'current') {
  showCurrentEnvironment();
} else if (command === 'list') {
  listEnvironments();
} else if (environments[command]) {
  switchEnvironment(command);
} else {
  console.error(`❌ Unknown command: ${command}`);
  console.log('Available commands: development, test, local, current, list');
  process.exit(1);
}