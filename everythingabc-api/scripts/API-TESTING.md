# V2 API Testing Suite

Comprehensive testing scripts for validating V2 API endpoints and rich linking functionality.

## Available Test Scripts

### 1. Quick Test (`test:v2:quick`)
**Purpose**: Fast validation of key V2 endpoints
**Duration**: ~1-2 seconds
**Use case**: CI/CD pipelines, quick smoke tests

```bash
npm run test:v2:quick
```

Tests core endpoints:
- Categories list and detail
- Search functionality
- Item endpoints
- Letter browsing
- Global stats

### 2. Comprehensive Test (`test:v2`)
**Purpose**: Full URL validation with recursion
**Duration**: 2-5 minutes (with rate limiting protection)
**Use case**: Regression testing, thorough validation

```bash
npm run test:v2:local
# or for custom URL
npm run test:v2 http://production-url.com
```

Features:
- Extracts ALL URLs from API responses
- Tests each URL recursively
- Rate limiting protection (100ms delays)
- Filters out problematic URLs automatically
- Detailed failure reporting

### 3. Bash Version (`test:v2:bash`)
**Purpose**: Shell-based testing without Node.js dependencies
**Duration**: ~30 seconds
**Use case**: Server environments, simple validation

```bash
npm run test:v2:bash
# or directly
./scripts/test-v2-urls.sh http://localhost:3003
```

## Test Output

### Success Indicators
- ✅ **Green checkmarks**: Passing endpoints
- 📊 **Success rate**: Percentage of working URLs
- 🎉 **100% success**: All critical endpoints working

### Warnings & Issues
- ⚠️  **Yellow warnings**: Limited URLs due to rate limiting
- ⏭️  **Skipped URLs**: Filtered out (undefined, malformed)
- ❌ **Red failures**: Broken endpoints

### Common Issues Detected

1. **Rate Limiting (HTTP 429)**
   - Expected during comprehensive testing
   - Shows rate limiting is working correctly

2. **Search URL Issues**
   - `/search/?categories=animals` without `q` parameter
   - Returns 400 - requires search query

3. **Undefined URLs**
   - `/items/undefined/images/`
   - Indicates data quality issues

## Regression Testing Workflow

### Daily Testing
```bash
# Quick smoke test (1-2 seconds)
npm run test:v2:quick
```

### Before Deployment
```bash
# Comprehensive validation (2-5 minutes)
npm run test:v2:local
```

### CI/CD Integration
```bash
# Add to GitHub Actions / CI pipeline
npm run test:v2:quick || exit 1
```

## Configuration

### Environment Variables
```bash
# Test against different environments
npm run test:v2 http://staging.example.com
npm run test:v2 https://production.example.com
```

### Customizing Tests

Edit `scripts/test-v2-quick.js` to modify endpoints:
```javascript
const ENDPOINTS = [
  { url: `${API_BASE}/categories/`, name: 'Categories List' },
  { url: `${API_BASE}/new-endpoint/`, name: 'New Feature' },
  // Add your endpoints here
];
```

## Script Details

### In-Memory URL Caching
- Stores tested URLs in memory during test run
- Avoids retesting duplicate URLs that appear in multiple responses
- Cache hit rate displayed in results (typically 30-50% for large tests)
- Saves significant time on comprehensive tests

### Rate Limiting Protection
- 100ms delays between requests
- Maximum 5 URLs tested per response
- Automatic retry logic for 429 errors

### URL Filtering
Automatically skips:
- URLs with `undefined`, `null`, or empty parameters
- Search URLs without required `q` parameter
- Malformed URLs with double slashes

### Performance Optimizations
- Limited recursion depth (2 levels)
- Configurable timeouts (5 seconds)
- Parallel testing where safe
- Smart caching to avoid duplicate tests

## Troubleshooting

### High Failure Rates
1. Check if server is running: `npm start`
2. Verify base URL is correct
3. Look for rate limiting (HTTP 429)
4. Check network connectivity

### Search Endpoint Failures
- Expected for URLs like `/search/?categories=animals`
- These require `q` parameter: `/search/?q=term&categories=animals`

### Rate Limiting Issues
- Use quick test instead: `npm run test:v2:quick`
- Wait a few minutes between comprehensive tests
- Consider increasing `DELAY_MS` in the script

## Integration Examples

### GitHub Actions
```yaml
- name: Test V2 API
  run: npm run test:v2:quick
```

### Docker Health Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s \
  CMD npm run test:v2:quick || exit 1
```

### Monitoring Script
```bash
#!/bin/bash
if npm run test:v2:quick; then
  echo "API healthy"
else
  echo "API issues detected" | mail admin@example.com
fi
```

This testing suite ensures your V2 API rich linking remains functional and catches regressions before they reach production.