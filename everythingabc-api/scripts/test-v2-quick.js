#!/usr/bin/env node

/**
 * Quick V2 API Validation Script
 *
 * Fast regression test that checks key V2 endpoints without recursion
 * Perfect for CI/CD and quick validation
 *
 * Usage: node scripts/test-v2-quick.js [base-url]
 */

const axios = require('axios');
const colors = require('colors');

const BASE_URL = process.argv[2] || 'http://localhost:3003';
const API_BASE = `${BASE_URL}/api/v2`;

// Test endpoints to validate
const ENDPOINTS = [
  // Core categories
  { url: `${API_BASE}/categories/`, name: 'Categories List' },
  { url: `${API_BASE}/categories/animals/`, name: 'Animals Category' },
  { url: `${API_BASE}/categories/animals/items/?limit=3`, name: 'Animals Items' },
  { url: `${API_BASE}/categories/animals/items/?format=grouped`, name: 'Animals Items Grouped' },

  // Search
  { url: `${API_BASE}/search/?q=cat&limit=3`, name: 'Search Items' },
  { url: `${API_BASE}/search/suggestions/?q=fr&limit=3`, name: 'Search Suggestions' },
  { url: `${API_BASE}/search/filters/`, name: 'Search Filters' },

  // Other key endpoints
  { url: `${API_BASE}/stats/`, name: 'Global Stats' },
  { url: `${API_BASE}/letters/A/items/?limit=3`, name: 'Letter Browsing' },

  // Test one item endpoint
  { url: `${API_BASE}/items/cat/`, name: 'Cat Item Detail' },
];

const api = axios.create({
  timeout: 5000,
  validateStatus: (status) => status < 500
});

async function testEndpoint(endpoint) {
  try {
    const startTime = Date.now();
    const response = await api.get(endpoint.url);
    const duration = Date.now() - startTime;

    if (response.status >= 200 && response.status < 400) {
      console.log(`✅ ${endpoint.name.padEnd(20)} ${response.status} (${duration}ms)`.green);
      return { passed: true, duration };
    } else {
      console.log(`❌ ${endpoint.name.padEnd(20)} ${response.status}`.red);
      return { passed: false, status: response.status };
    }
  } catch (error) {
    const status = error.response?.status || 'TIMEOUT';
    console.log(`❌ ${endpoint.name.padEnd(20)} ${status}`.red);
    return { passed: false, error: error.message };
  }
}

async function runQuickTest() {
  console.log('⚡ Quick V2 API Validation'.bold.blue);
  console.log(`🔗 Testing: ${API_BASE}`.cyan);
  console.log('');

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    if (result.passed) {
      passed++;
    } else {
      failed++;
    }

    // Small delay to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const totalTime = Date.now() - startTime;
  const total = passed + failed;
  const successRate = (passed / total * 100).toFixed(1);

  console.log('');
  console.log('📊 Quick Test Results'.bold.blue);
  console.log('='.repeat(30));
  console.log(`⏱️  Duration: ${totalTime}ms`.cyan);
  console.log(`✅ Passed: ${passed}/${total}`.green);
  console.log(`❌ Failed: ${failed}/${total}`.red);
  console.log(`📈 Success Rate: ${successRate}%`.bold);

  if (successRate === '100.0') {
    console.log('🎉 All key endpoints working!'.green.bold);
    process.exit(0);
  } else if (successRate >= '80.0') {
    console.log('⚠️  Most endpoints working'.yellow.bold);
    process.exit(1);
  } else {
    console.log('🚨 Critical failures detected'.red.bold);
    process.exit(1);
  }
}

if (require.main === module) {
  runQuickTest().catch(error => {
    console.error(`💥 Test failed: ${error.message}`.red);
    process.exit(1);
  });
}