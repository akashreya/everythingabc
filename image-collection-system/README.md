# Automated Image Collection System

Industrial-scale image collection system for the Visual Vocabulary Platform. This system automatically searches, downloads, processes, and organizes high-quality images from multiple sources with AI-powered quality control and fallback generation.

## 🚀 Features

### Multi-Source Collection
- **Unsplash API**: High-quality professional photography
- **Pixabay API**: Diverse stock images with editorial selection
- **Pexels API**: Curated photography with color analysis
- **AI Generation**: DALL-E 3 fallback for missing items
- **Rate Limiting**: Intelligent API management and queue systems

### Quality Control
- **Automated Scoring**: Multi-dimensional quality analysis
- **Technical Analysis**: Resolution, format, compression, sharpness
- **Relevance Detection**: AI-powered content matching
- **Aesthetic Evaluation**: Composition, color harmony, contrast
- **Usability Assessment**: Background, subject isolation, thumbnail suitability

### Image Processing
- **Format Optimization**: WebP conversion with quality control
- **Multi-Size Generation**: Original, large, medium, small, thumbnail
- **Compression**: Lossless optimization with Sharp.js
- **Color Analysis**: Dominant color extraction and analysis
- **Enhancement**: Brightness, contrast, saturation adjustments

### File Organization
- **Structured Storage**: `categories/letter/item/size/` hierarchy
- **Metadata Tracking**: JSON metadata for each image
- **Automatic Cleanup**: Temporary file management
- **Backup Systems**: Organized archival and recovery

### Database Management
- **MongoDB Integration**: Comprehensive tracking and indexing
- **Progress Monitoring**: Real-time collection status
- **Quality Metrics**: Statistical analysis and reporting
- **Search Capabilities**: Advanced filtering and queries

### Admin Dashboard
- **React Interface**: Modern, responsive web dashboard
- **Real-time Monitoring**: Live progress tracking
- **Manual Controls**: Override and quality review tools
- **Analytics**: Performance metrics and cost tracking

## 📋 Prerequisites

- **Node.js**: Version 18+ with npm
- **MongoDB**: Local or cloud instance
- **Redis**: For job queuing (optional but recommended)
- **API Keys**: Unsplash, Pixabay, Pexels, OpenAI (optional)

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd image-collection-system

# Install backend dependencies
npm install

# Install dashboard dependencies
cd dashboard
npm install
cd ..
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# API Keys (required)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
PIXABAY_API_KEY=your_pixabay_api_key
PEXELS_API_KEY=your_pexels_api_key
OPENAI_API_KEY=your_openai_api_key

# Database (required)
MONGODB_URI=mongodb://localhost:27017/image_collection
REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=3001
NODE_ENV=development

# Storage Configuration
IMAGES_PATH=./images
MAX_FILE_SIZE=10485760

# Quality Control
MIN_QUALITY_SCORE=7.0
MAX_IMAGES_PER_ITEM=5
ENABLE_AI_GENERATION=true
```

### 3. Database Setup

```bash
# Start MongoDB (if local)
mongod

# The system will automatically create indexes on first run
```

## 🚀 Usage

### Starting the System

```bash
# Start the main server
npm start

# Or run in development mode
npm run dev

# Build and serve dashboard
cd dashboard
npm run build
cd ..
npm start
```

Access the dashboard at: `http://localhost:3001/dashboard`

### Command Line Operations

#### Seed Categories
```bash
# Seed all categories
node src/scripts/seed-categories.js

# Seed specific category
node src/scripts/seed-categories.js --category animals
```

#### Test Collection
```bash
# Test single item collection
npm run test single fruits A Apple

# Test search functionality
npm run test search "Red Apple" fruits

# Run comprehensive test suite
npm run test all
```

#### Manual Collection
```bash
# Collect images for specific item
node src/scripts/collect-item.js --category fruits --letter A --item Apple --count 5

# Collect entire category
node src/scripts/collect-category.js --category animals --max-concurrent 3
```

## 📊 API Endpoints

### Collection Endpoints
- `POST /api/collect/item` - Collect images for single item
- `POST /api/collect/category` - Collect images for entire category

### Search Endpoints
- `POST /api/search` - Multi-source image search
- `POST /api/search/enhanced` - Enhanced search with ranking

### Database Management
- `POST /api/seed/categories` - Seed category data
- `DELETE /api/seed/categories` - Clear category data

### Monitoring
- `GET /api/stats` - System statistics
- `GET /api/progress` - Collection progress
- `GET /api/images` - Image management
- `GET /api/clients` - API client status

### Health Checks
- `GET /health` - Basic health check
- `GET /health/detailed` - Comprehensive system status

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Sources  │    │  Collection     │    │  Processing     │
│                 │    │  Engine         │    │  Pipeline       │
│ • Unsplash API  │───▶│                 │───▶│                 │
│ • Pixabay API   │    │ • Search Logic  │    │ • Quality Check │
│ • Pexels API    │    │ • Rate Limiting │    │ • Optimization  │
│ • DALL-E API    │    │ • Error Handle  │    │ • Organization  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │
                                 ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │   Database      │    │   File System   │
                    │                 │    │                 │
                    │ • Metadata      │    │ • Organized     │
                    │ • Progress      │    │   Structure     │
                    │ • Quality Score │    │ • Multiple      │
                    │ • Status Track  │    │   Sizes         │
                    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Search Phase**: Query multiple APIs with enhanced search strategies
2. **Download Phase**: Parallel download with retry logic and validation
3. **Quality Phase**: Multi-dimensional automated analysis
4. **Processing Phase**: Format optimization and size generation
5. **Organization Phase**: Structured file system placement
6. **Database Phase**: Metadata storage and progress tracking
7. **AI Fallback**: Generate missing images with DALL-E 3

### File Structure

```
images/
├── categories/
│   ├── animals/
│   │   ├── A/
│   │   │   ├── ant/
│   │   │   │   ├── original/
│   │   │   │   ├── large/
│   │   │   │   ├── medium/
│   │   │   │   ├── small/
│   │   │   │   └── thumbnail/
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── generated/     # AI-generated images
├── rejected/      # Failed quality checks
└── temp/          # Processing workspace
```

## 📈 Performance

### Benchmarks
- **Collection Speed**: 50+ images/hour automated
- **Quality Pass Rate**: 80%+ images meet standards
- **Processing Time**: <5 seconds per image
- **API Efficiency**: <5% failed requests
- **Storage**: <2MB average per processed image

### Scaling Configuration
- **Concurrent Downloads**: 5 (configurable)
- **Batch Processing**: 10 items per batch
- **Rate Limits**: Per-API intelligent limiting
- **Memory Usage**: ~200MB base + processing
- **Database**: Optimized indexes for queries

## 💰 Cost Management

### API Costs (Monthly Estimates)
- **Unsplash**: Free (50 requests/hour)
- **Pixabay**: Free (100 requests/hour) 
- **Pexels**: Free (200 requests/hour)
- **DALL-E 3**: $0.04 per image (usage-based)

### Infrastructure Costs
- **Server**: $50-200/month (Digital Ocean/AWS)
- **Database**: $50-150/month (MongoDB Atlas)
- **Storage**: $20-50/month (50GB + CDN)
- **Total Estimated**: $120-400/month

### Cost Optimization
- **Free API Priority**: Use free sources first
- **AI Generation**: Only for missing items
- **Batch Processing**: Minimize API calls
- **Caching**: Reduce redundant requests

## 🔧 Configuration

### Quality Control Settings

```javascript
// config/index.js
qualityControl: {
  minScore: 7.0,                    // Minimum approval score
  maxImagesPerItem: 5,              // Target images per item
  enableAiGeneration: true,         // Use AI fallback
  weights: {
    technical: 0.3,                 // Image quality weight
    relevance: 0.4,                 // Content relevance weight
    aesthetic: 0.2,                 // Visual appeal weight
    usability: 0.1                  // Practical use weight
  }
}
```

### Image Processing Settings

```javascript
imageProcessing: {
  formats: {
    output: 'webp',                 // Output format
    quality: 85                     // Compression quality
  },
  sizes: {
    original: { width: null },      // Keep original size
    large: { width: 1200 },        // Large display
    medium: { width: 600 },        // Standard display
    small: { width: 300 },         // Mobile display
    thumbnail: { width: 150 }      // Grid display
  }
}
```

## 🧪 Testing

### Test Categories
```bash
# Unit tests (service level)
npm test

# Integration tests (full workflow)
npm run test:integration

# Performance tests (load testing)
npm run test:performance

# API tests (endpoint validation)
npm run test:api
```

### Manual Testing
```bash
# Test single item collection
npm run test single fruits A Apple

# Test entire workflow
npm run test all

# Test search preview
npm run test search "Red Apple" fruits
```

## 🐛 Troubleshooting

### Common Issues

#### API Rate Limits
```bash
# Check API status
curl http://localhost:3001/api/clients

# Symptoms: Collection stops, rate limit errors
# Solution: Wait for reset or add more API keys
```

#### Database Connection
```bash
# Check database health
curl http://localhost:3001/health/database

# Symptoms: Connection errors, save failures
# Solution: Verify MongoDB is running and accessible
```

#### File System Permissions
```bash
# Check storage permissions
ls -la ./images/

# Symptoms: Save errors, organization failures
# Solution: Ensure write permissions on images directory
```

#### Memory Usage
```bash
# Monitor memory usage
curl http://localhost:3001/health/detailed

# Symptoms: Slow performance, crashes
# Solution: Reduce concurrent operations, increase RAM
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Monitor specific component
DEBUG=image-collector:* npm start
```

## 🔒 Security

### API Key Management
- Store API keys in environment variables
- Never commit keys to version control
- Use different keys for different environments
- Monitor API usage and costs

### File System Security
- Validate all uploaded/downloaded files
- Sanitize file names and paths
- Limit file sizes and types
- Regular cleanup of temporary files

### Database Security
- Use connection authentication
- Enable MongoDB security features
- Regular backups and recovery testing
- Monitor for unusual access patterns

## 📚 Development

### Adding New API Sources

1. Create client class extending `BaseClient`
2. Implement required methods: `search()`, `downloadImage()`
3. Add to `ApiClientManager` initialization
4. Update configuration and environment variables

### Custom Quality Analyzers

1. Extend `QualityAnalyzer` class
2. Implement analysis methods
3. Update quality scoring weights
4. Add custom thresholds and criteria

### Dashboard Extensions

1. Add new React components in `dashboard/src/components`
2. Create API endpoints for data
3. Update navigation and routing
4. Add real-time updates with WebSocket

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For questions, issues, or contributions:
- Create an issue on GitHub
- Check the troubleshooting guide
- Review the API documentation
- Join the developer community

---

**Built for the Visual Vocabulary Platform** - Enabling industrial-scale content creation with AI-powered automation and quality control.