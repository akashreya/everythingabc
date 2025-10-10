# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "AtoZ" (everythingabc) - a visual vocabulary platform that helps users learn to identify and name items across hundreds of categories. The platform displays categories in A-Z grids where users can explore items starting with each letter.

### Business Context

- **Core Product**: Visual learning tool for vocabulary building across diverse categories
- **Target Users**: K-12 students, ESL learners, professionals, casual learners
- **Future Vision**: Foundation for social gaming features and multiplayer experiences
- **Monetization**: Freemium subscription model with institutional licensing

## Development Philosophy

### Lean Development Approach

- **MVP Focus**: Build minimal, validate, then scale
- **Solo Developer Optimized**: Designed for single developer with 10-20 hours/week capacity
- **Cost Conscious**: Minimal infrastructure costs during validation phase

### Technical Strategy

- Start with static implementation (no backend/database initially)
- Use free hosting and image resources
- Focus on core user experience over complex features
- Deploy early and iterate based on user feedback

## Recommended Technology Stack

### Frontend (Phase 1)

- **Framework**: React 18+ with Create React App
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Context + useReducer (avoid complex solutions initially)
- **Image Handling**: Lazy loading, WebP optimization
- **Search**: Client-side filtering with simple JavaScript

### Infrastructure (Phase 1)

- **Hosting**: Vercel or Netlify (free tier)
- **Images**: Unsplash, Pexels (free stock photos)
- **Analytics**: Google Analytics (free)
- **Domain**: Basic domain registration (~$10/year)

### Scaling Technology (Future Phases)

- **Backend**: Node.js + Express when needed
- **Database**: MongoDB for flexible category/item structure
- **File Storage**: AWS S3 + CloudFront for image delivery
- **Authentication**: Firebase Auth for premium features

## Content Strategy

### Category Structure

Categories are organized into groups:

- **Educational**: Animals, Fruits & Vegetables, Colors & Shapes, Numbers & Letters
- **Nature & Science**: Plants, Insects, Ocean Life, Space & Astronomy
- **Everyday Objects**: Household Items, Kitchen Tools, Clothing, School Supplies
- **Professional & Specialized**: Medical Equipment, Construction Tools, Art Supplies

### Content Creation Guidelines

- **Time Investment**: 3-5 hours per simple category, 8-15 hours per complex category
- **Image Standards**: Clear, bright, focused on the item, consistent style within categories
- **Naming**: Simple, commonly recognized terms
- **Completeness**: Aim for A-Z coverage, use placeholders for difficult letters

### Category Difficulty Levels

- **Easy (3-5 hours)**: Animals, Fruits, Colors, Transportation
- **Medium (5-8 hours)**: Household Items, Kitchen Tools, School Supplies
- **Hard (8-15 hours)**: Medical Equipment, Construction Tools, Technical categories

## Data Structure

### Core Category Schema

```javascript
{
  id: "animals",
  name: "Animals",
  group: "educational",
  icon: "🐾",
  color: "#4F46E5",
  status: "active",
  completeness: 23, // letters with items
  items: {
    A: [
      {
        id: "ant",
        name: "Ant",
        image: "/images/animals/ant.webp",
        difficulty: 1
      }
    ],
    B: [...],
    // continues for available letters
  }
}
```

## Development Phases

### Phase 1: Ultra-Lean MVP (60-90 hours)

- Basic React app with 20 simple categories
- Home page with category grid
- A-Z item display
- Static JSON data structure
- Simple search functionality

### Phase 2: Validate & Expand (40-60 hours)

- Add 5 more categories based on user feedback
- Implement user feedback collection
- Performance improvements
- Social media soft launch

### Phase 3: Monetization Test (20-30 hours)

- Simple premium tier with payment processing
- User accounts (Firebase Auth)
- Gate some categories behind paywall
- Basic landing page

## Success Metrics

### Technical Performance

- Page load speed: <2 seconds
- Image load time: <3 seconds with progressive loading
- Search response: <500ms
- 99.9% uptime

### User Engagement

- Session duration: 8+ minutes average
- Category exploration: 3+ categories per session
- Return rate: 60% weekly
- Content completion: 70% finish A-Z grids

### Business Validation

- Month 1: Working app with 30 categories
- Month 2: 50+ unique visitors, 2+ minute sessions
- Month 3: 200+ unique visitors with return visits
- Month 4: Decision point on scaling vs. pivoting

## Development Guidelines

### What to Build First

- Static JSON data files
- Simple React components
- Basic CSS with Tailwind
- Manual content creation
- Free hosting setup

### What to Avoid Initially

- Custom backend APIs
- Complex state management
- User authentication (until monetization)
- Automated testing (until proven)
- Performance optimization (until needed)

### Content Creation Workflow

1. **Planning**: Choose category, assess difficulty, identify challenging letters (15-30 min)
2. **Research**: Create A-Z item list (30-90 min)
3. **Image Sourcing**: Find appropriate images (90-300 min depending on category)
4. **Implementation**: Create JSON structure, test display (30-60 min)
5. **Quality Assurance**: Review completeness, accuracy, performance (30-60 min)

## Risk Management

### Technical Risks

- Keep architecture simple to avoid complexity
- Use proven tools and libraries
- Deploy early and often for quick feedback

### Content Risks

- Start with easy, well-known categories
- Use free, high-quality images with proper licensing
- Don't aim for perfection in initial version

### Business Risks

- Launch quickly to test market demand
- Collect user feedback early and often
- Be prepared to pivot or stop based on validation results

## Decision Points

### Continue Building If:

- Users spend 5+ minutes per session
- 100+ daily active users after 2 months
- Getting organic shares and mentions
- Making $100+ per month with basic monetization

### Consider Pivoting/Stopping If:

- Users consistently bounce within 30 seconds
- No organic growth after 2 months of promotion
- No revenue after payment options added
- Developer loses interest or motivation

### Scale Up Triggers:

- $500+ monthly recurring revenue
- 1000+ daily active users
- Strong user engagement metrics
- Feature requests indicating market demand

This approach prioritizes rapid validation over complex engineering, allowing for quick market testing while maintaining the option to scale significantly if the concept proves successful.