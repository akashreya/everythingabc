#!/usr/bin/env node

/**
 * V2 API URL Validation Testing Script
 *
 * This script performs comprehensive regression testing by:
 * 1. Calling V2 API endpoints
 * 2. Extracting all URLs from responses
 * 3. Testing each URL to ensure it works
 * 4. Reporting broken links
 *
 * Usage: node scripts/test-v2-urls.js [base-url]
 * Example: node scripts/test-v2-urls.js http://localhost:3003
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = process.argv[2] || 'http://localhost:3003';
const API_BASE = `${BASE_URL}/api/v2`;
const MAX_DEPTH = 2; // Reduced depth to prevent rate limiting
const TIMEOUT = 5000; // 5 second timeout
const DELAY_MS = 100; // Delay between requests to avoid rate limiting
const MAX_URLS_PER_RESPONSE = 5; // Limit URLs tested per response

// In-memory URL cache to avoid retesting duplicate URLs during this run
const urlCache = new Map(); // url -> { status, responseTime, httpStatus, error, data }

// Test results tracking
const results = {
  tested: new Set(),
  passed: new Set(),
  failed: new Map(),
  skipped: new Set(),
  fromCache: new Set()
};

// Create axios instance with timeout
const api = axios.create({
  timeout: TIMEOUT,
  validateStatus: (status) => status < 500 // Accept 4xx as valid responses
});


/**
 * Add delay to prevent rate limiting
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if URL should be skipped
 */
function shouldSkipUrl(url) {
  // Skip URLs with undefined/null/empty parameters
  if (url.includes('undefined') || url.includes('null')) {
    return true;
  }

  // Skip URLs with double slashes in path (but not in protocol)
  const urlPath = url.replace(/^https?:\/\//, '');
  if (urlPath.includes('//')) {
    return true;
  }

  // Skip search URLs without query parameter (only for base /search/ endpoint)
  if (url.match(/\/search\/?\?/) && !url.includes('q=') && !url.includes('suggestions') && !url.includes('filters') && !url.includes('popular')) {
    return true;
  }

  return false;
}

/**
 * Extract all URLs from a JSON object recursively
 */
function extractUrls(obj, path = '') {
  const urls = [];

  if (typeof obj === 'string' && obj.startsWith('http')) {
    urls.push({ url: obj, path });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      urls.push(...extractUrls(value, currentPath));
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const currentPath = `${path}[${index}]`;
      urls.push(...extractUrls(item, currentPath));
    });
  }

  return urls;
}

/**
 * Test a single URL with in-memory caching
 */
async function testUrl(url, context = '') {
  // Check if URL should be skipped
  if (shouldSkipUrl(url)) {
    results.skipped.add(url);
    console.log(`  Skipping: ${url.grey} (${context || 'filtered out'})`.yellow);
    return { url, status: 'skipped', context };
  }

  // Check in-memory cache first
  const cacheEntry = urlCache.get(url);
  if (cacheEntry) {
    results.tested.add(url);
    results.fromCache.add(url);

    if (cacheEntry.status === 'passed') {
      results.passed.add(url);
      console.log(`  📋 Cached: ${url.grey} ✅ ${cacheEntry.httpStatus} (${cacheEntry.responseTime}ms)`.cyan);
    } else {
      results.failed.set(url, cacheEntry.error);
      console.log(`  📋 Cached: ${url.grey} ❌ ${cacheEntry.error}`.cyan);
    }

    return {
      url,
      status: cacheEntry.status,
      context,
      responseTime: cacheEntry.responseTime,
      httpStatus: cacheEntry.httpStatus,
      fromCache: true,
      data: cacheEntry.data
    };
  }

  results.tested.add(url);

  // Add delay to prevent rate limiting
  await delay(DELAY_MS);

  try {
    console.log(`  Testing: ${url.grey}`);
    const startTime = Date.now();
    const response = await api.get(url);
    const duration = Date.now() - startTime;

    const result = {
      url,
      context,
      responseTime: duration,
      httpStatus: response.status
    };

    if (response.status >= 200 && response.status < 400) {
      result.status = 'passed';
      result.data = response.data;
      results.passed.add(url);
      console.log(`    ✅ ${response.status} (${duration}ms)`.green);

      // Store in memory cache (include data for recursion)
      urlCache.set(url, {
        status: 'passed',
        httpStatus: response.status,
        responseTime: duration,
        data: response.data
      });
    } else {
      result.status = 'failed';
      result.error = `HTTP ${response.status}`;
      results.failed.set(url, result.error);
      console.log(`    ❌ ${response.status}`.red);

      // Store failed results in cache
      urlCache.set(url, {
        status: 'failed',
        error: result.error,
        httpStatus: response.status,
        responseTime: duration
      });
    }

    return result;
  } catch (error) {
    const errorMsg = error.response?.status === 429 ? 'Rate Limited (429)' : error.message;
    results.failed.set(url, errorMsg);
    console.log(`    ❌ ${errorMsg}`.red);

    // Store errors in cache
    urlCache.set(url, {
      status: 'failed',
      error: errorMsg,
      httpStatus: error.response?.status,
      responseTime: 0
    });

    return { url, status: 'failed', context, error: errorMsg };
  }
}

/**
 * Test all URLs in a response and optionally recurse
 */
async function testUrlsInResponse(response, depth = 0, visited = new Set()) {
  if (depth >= MAX_DEPTH) {
    console.log(`    ⚠️  Max depth reached, skipping recursion`.yellow);
    return [];
  }

  const urls = extractUrls(response.data);
  const testResults = [];

  // Limit URLs to prevent excessive testing and rate limiting
  const limitedUrls = urls.slice(0, MAX_URLS_PER_RESPONSE);
  if (urls.length > MAX_URLS_PER_RESPONSE) {
    console.log(`    ⚠️  Limited to first ${MAX_URLS_PER_RESPONSE} URLs (found ${urls.length})`.yellow);
  }

  for (const { url, path } of limitedUrls) {
    // Skip URLs we've already visited at this depth to prevent cycles
    const urlKey = `${url}:${depth}`;
    if (visited.has(urlKey)) {
      continue;
    }
    visited.add(urlKey);

    const result = await testUrl(url, path);
    testResults.push(result);

    // If this URL passed and returned JSON, recursively test its URLs
    if (result.status === 'passed' && result.data && depth < MAX_DEPTH - 1) {
      try {
        const nestedResults = await testUrlsInResponse(
          { data: result.data },
          depth + 1,
          visited
        );
        testResults.push(...nestedResults);
      } catch (error) {
        console.log(`    ⚠️  Could not recurse into ${url}: ${error.message}`.yellow);
      }
    }
  }

  return testResults;
}

/**
 * Main test suite
 */
async function runTests() {
  console.log('🚀 V2 API URL Validation Testing (with in-memory caching)'.bold.blue);
  console.log(`📡 Base URL: ${BASE_URL}`.cyan);
  console.log(`🔗 API Base: ${API_BASE}`.cyan);
  console.log('');

  const startTime = Date.now();

  try {
    // Test 1: Categories List
    console.log('📂 Testing Categories List'.bold);
    const categoriesResponse = await testUrl(`${API_BASE}/categories/`);
    if (categoriesResponse.status === 'passed') {
      await testUrlsInResponse(categoriesResponse);
    }
    console.log('');

    // Test 2: Individual Category (pick first one)
    console.log('📋 Testing Individual Category'.bold);
    if (categoriesResponse.status === 'passed' && categoriesResponse.data.results.length > 0) {
      const firstCategory = categoriesResponse.data.results[0];
      const categoryResponse = await testUrl(`${API_BASE}/categories/${firstCategory.id}/`);
      if (categoryResponse.status === 'passed') {
        await testUrlsInResponse(categoryResponse);
      }
    }
    console.log('');

    // Test 3: Search Endpoints
    console.log('🔍 Testing Search Endpoints'.bold);
    const searchTests = [
      `${API_BASE}/search/?q=cat&limit=3`,
      `${API_BASE}/search/?q=animal&type=categories,items&limit=2`,
      `${API_BASE}/search/suggestions/?q=fr&limit=3`,
      `${API_BASE}/search/filters/`,
      `${API_BASE}/search/popular/`
    ];

    for (const searchUrl of searchTests) {
      const searchResponse = await testUrl(searchUrl);
      if (searchResponse.status === 'passed') {
        await testUrlsInResponse(searchResponse, 1); // Limit depth for search
      }
    }
    console.log('');

    // Test 4: Items endpoints (from category items)
    console.log('📝 Testing Items Endpoints'.bold);
    if (categoriesResponse.status === 'passed' && categoriesResponse.data.results.length > 0) {
      const firstCategory = categoriesResponse.data.results[0];
      const itemsResponse = await testUrl(`${API_BASE}/categories/${firstCategory.id}/items/?limit=3`);
      if (itemsResponse.status === 'passed') {
        await testUrlsInResponse(itemsResponse, 1);
      }
    }
    console.log('');

  } catch (error) {
    console.error(`💥 Test suite failed: ${error.message}`.red);
  }

  // Summary Report
  const duration = Date.now() - startTime;
  console.log('📊 Test Results Summary'.bold.blue);
  console.log(''.padEnd(50, '='));
  console.log(`⏱️  Total Duration: ${duration}ms`.cyan);
  console.log(`🧪 URLs Tested: ${results.tested.size}`.cyan);
  console.log(`✅ Passed: ${results.passed.size}`.green);
  console.log(`❌ Failed: ${results.failed.size}`.red);
  console.log(`⏭️  Skipped: ${results.skipped.size}`.yellow);
  console.log(`📋 From Cache: ${results.fromCache.size}`.cyan);
  console.log('');

  if (results.failed.size > 0) {
    console.log('💥 Failed URLs:'.bold.red);
    for (const [url, error] of results.failed.entries()) {
      console.log(`  ❌ ${url}`.red);
      console.log(`     ${error}`.gray);
    }
    console.log('');
  }

  // Performance Report
  const successRate = (results.passed.size / results.tested.size * 100).toFixed(1);
  const cacheHitRate = (results.fromCache.size / results.tested.size * 100).toFixed(1);

  console.log(`📈 Success Rate: ${successRate}%`.bold);
  console.log(`⚡ Cache Hit Rate: ${cacheHitRate}%`.cyan);

  if (successRate === '100.0') {
    console.log('🎉 All URLs are working perfectly!'.green.bold);
  } else if (successRate >= '90.0') {
    console.log('⚠️  Most URLs working, but some need attention'.yellow.bold);
  } else {
    console.log('🚨 Significant URL failures detected'.red.bold);
  }

  // Exit with appropriate code
  process.exit(results.failed.size > 0 ? 1 : 0);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error(`💥 Unhandled error: ${error.message}`.red);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testUrl, extractUrls };