# Test Database Configuration

This document explains how to set up and use different database environments for development and testing of the EverythingABC API.

## Quick Start

### 1. Development with In-Memory Database (Fastest)
```bash
# Switch to development environment and start with memory database
npm run dev:memory

# This runs:
# 1. npm run env:dev (switches to .env.development)
# 2. npm run db:setup:dev (creates sample data)
# 3. npm run dev (starts the server)
```

### 2. Testing Environment
```bash
# Setup test environment
npm run test:setup

# This runs:
# 1. npm run env:test (switches to .env.test)
# 2. npm run db:setup:test (creates test data)
# 3. npm test (runs the test suite)
```

### 3. Local Development with External MongoDB
```bash
# Switch to local environment (requires MongoDB running)
npm run env:local
npm run db:setup:local
npm start
```

## Environment Configurations

### `.env.development` - Fast Development
- **Database**: In-memory MongoDB (no external dependencies)
- **Use case**: Quick development, prototyping, feature testing
- **Startup time**: ~2-3 seconds
- **Data**: Temporary (lost on restart)
- **Features**: Debug logging, auth disabled, relaxed limits

### `.env.test` - Isolated Testing
- **Database**: In-memory MongoDB (isolated per test run)
- **Use case**: Automated testing, CI/CD pipelines
- **Startup time**: ~1-2 seconds
- **Data**: Clean state for each test
- **Features**: Error logging only, no external APIs

### `.env.local` - Production-like Development
- **Database**: External MongoDB (localhost:27017)
- **Use case**: Full feature testing, performance testing
- **Prerequisites**: MongoDB and Redis running locally
- **Data**: Persistent across restarts
- **Features**: All features enabled, AWS integration

## Available Commands

### Environment Management
```bash
# Switch environments
npm run env:dev          # Switch to development
npm run env:test         # Switch to test
npm run env:local        # Switch to local

# Environment utilities
npm run env:current      # Show current environment
npm run env:switch       # Interactive environment switcher
```

### Database Setup
```bash
# Setup databases with sample data
npm run db:setup:dev     # Development database
npm run db:setup:test    # Test database
npm run db:setup:local   # Local database

# Combined workflows
npm run dev:memory       # Setup dev environment and start
npm run test:setup       # Setup test environment and run tests
```

### Testing Commands
```bash
# V2 API testing
npm run test:v2:quick    # Quick smoke tests (1-2 seconds)
npm run test:v2:local    # Comprehensive regression tests
npm run test:v2          # Test against custom URL

# Standard tests
npm test                 # Run Jest test suite
```

## Database Structure

Each environment creates the following sample data:

### Categories Collection
- `test-animals`: Sample category with A-Z structure
- Contains items: ant, apple, bird
- Demonstrates both V1 (embedded) and V2 (separated) data structures

### Items Collection (V2 API)
- Individual item documents for V2 rich-linked API
- Cross-references with categories
- Supports letter browsing across categories

### CategoryImages Collection
- Image metadata for items
- Quality scores and AI generation flags
- Multiple format support

## Development Workflows

### Daily Development
```bash
# Quick start with memory database
npm run dev:memory

# Test your changes
npm run test:v2:quick

# Check API endpoints
curl http://localhost:3003/api/v2/categories/
```

### Feature Development
```bash
# Start with clean test environment
npm run env:test
npm run db:setup:test
npm run dev

# Develop and test features...

# Run comprehensive tests
npm run test:v2:local
```

### Integration Testing
```bash
# Use local database for persistence
npm run env:local
npm run db:setup:local
npm start

# Run full test suite
npm run test:v2
npm test
```

## Environment Variables

### Key Configuration Options

| Variable | Development | Test | Local |
|----------|-------------|------|-------|
| `USE_MEMORY_DB` | `true` | `true` | `false` |
| `NODE_ENV` | `development` | `test` | `development` |
| `PORT` | `3003` | `3004` | `3003` |
| `LOG_LEVEL` | `debug` | `error` | `info` |
| `SKIP_AUTH` | `true` | `true` | `true` |

### Database Configuration
- **Memory DB**: Uses `mongodb-memory-server` package
- **External DB**: Connects to `mongodb://localhost:27017`
- **Database names**: Environment-specific (e.g., `everythingabc_test`)

## Troubleshooting

### Memory Database Issues
```bash
# If memory database fails to start
npm install mongodb-memory-server

# Check Node.js version (requires 18+)
node --version
```

### External Database Issues
```bash
# Check if MongoDB is running
mongosh --eval "db.runCommand('ping')"

# Start MongoDB (if using Docker)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Check connection
npm run env:current
```

### Environment Switching Issues
```bash
# Reset to development environment
npm run env:dev

# Check current configuration
npm run env:current

# List all available environments
node scripts/env-switch.js list
```

### Testing Issues
```bash
# Clean test setup
npm run env:test
rm -rf node_modules/.cache
npm run db:setup:test

# Verify test database
npm run test:v2:quick
```

## Performance Comparison

| Environment | Startup Time | Memory Usage | Test Speed | Data Persistence |
|-------------|--------------|--------------|------------|------------------|
| Development | 2-3 seconds | 50-80 MB | Fast | No |
| Test | 1-2 seconds | 30-50 MB | Fastest | No |
| Local | 5-10 seconds | 100-150 MB | Moderate | Yes |

## Best Practices

### Development
1. Use `npm run dev:memory` for daily development
2. Switch to local environment for performance testing
3. Use `npm run test:v2:quick` for quick validation

### Testing
1. Always use test environment for automated tests
2. Clean database state between test runs
3. Use in-memory database for faster test execution

### Integration
1. Use local environment for end-to-end testing
2. Test against external MongoDB for production readiness
3. Run comprehensive regression tests before deployment

## Integration with IDE

### VS Code Configuration
Add to `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Dev Environment",
      "type": "shell",
      "command": "npm run dev:memory",
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ]
}
```

### Environment Variables in IDE
Create `.vscode/launch.json` for debugging:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API (Memory DB)",
      "type": "node",
      "request": "launch",
      "program": "server.js",
      "envFile": "${workspaceFolder}/.env.development",
      "console": "integratedTerminal"
    }
  ]
}
```

This setup provides a flexible, fast, and reliable development environment for the EverythingABC API with proper separation between development, testing, and local environments.