// Quick seed script to populate database with sample data
require('dotenv').config();
const database = require('../db');
const Category = require('../models/Category');

const sampleCategories = [
  {
    id: 'animals',
    name: 'Animals',
    icon: '🐾',
    color: 'from-blue-400 to-cyan-300',
    difficulty: 'Easy',
    description: 'Meet amazing creatures from around the world!',
    status: 'active',
    tags: ['educational', 'nature', 'popular'],
    ageRange: '2-8',
    learningObjectives: [
      'Animal recognition',
      'Vocabulary building',
      'Letter-sound association'
    ],
    items: {
      A: [
        {
          id: 'alligator',
          name: 'Alligator',
          image: '/images/animals/alligator.webp',
          imageAlt: 'A large green alligator resting by water',
          difficulty: 2,
          pronunciation: 'al-li-ga-tor',
          description: 'Large reptiles that live in water and on land',
          facts: ['Alligators can hold their breath for up to 20 minutes'],
          tags: ['reptile', 'water', 'large']
        }
      ],
      B: [
        {
          id: 'bear',
          name: 'Bear',
          image: '/images/animals/bear.webp',
          imageAlt: 'A brown bear standing in a forest',
          difficulty: 1,
          pronunciation: 'bear',
          description: 'Large, furry mammals that live in forests',
          facts: ['Bears can run up to 35 mph'],
          tags: ['mammal', 'forest', 'large']
        }
      ],
      C: [
        {
          id: 'cat',
          name: 'Cat',
          image: '/images/animals/cat.webp',
          imageAlt: 'A fluffy orange cat sitting gracefully',
          difficulty: 1,
          pronunciation: 'cat',
          description: 'Furry pets that purr and like to play',
          facts: ['Cats sleep 12-16 hours per day'],
          tags: ['pet', 'domestic', 'small']
        }
      ],
      D: [
        {
          id: 'dog',
          name: 'Dog',
          image: '/images/animals/dog.webp',
          imageAlt: 'A friendly dog with its tongue out',
          difficulty: 1,
          pronunciation: 'dog',
          description: 'Loyal pets that love to play and protect their families',
          facts: ['Dogs can understand up to 250 words'],
          tags: ['pet', 'domestic', 'loyal']
        }
      ]
    }
  },
  {
    id: 'fruits',
    name: 'Fruits & Vegetables',
    icon: '🍎',
    color: 'from-green-400 to-emerald-300',
    difficulty: 'Easy',
    description: 'Discover delicious and healthy foods!',
    status: 'active',
    tags: ['educational', 'healthy', 'popular'],
    ageRange: '2-6',
    learningObjectives: [
      'Healthy food recognition',
      'Color identification',
      'Nutritional awareness'
    ],
    items: {
      A: [
        {
          id: 'apple',
          name: 'Apple',
          image: '/images/fruits/apple.webp',
          imageAlt: 'A red apple with a green leaf',
          difficulty: 1,
          pronunciation: 'ap-ple',
          description: 'Sweet, crunchy fruit that grows on trees',
          facts: ['Apples float in water because they are 25% air'],
          tags: ['fruit', 'sweet', 'healthy'],
          nutritionFacts: {
            vitamins: ['Vitamin C', 'Vitamin A'],
            minerals: ['Potassium'],
            benefits: ['Good for teeth', 'High in fiber']
          }
        }
      ],
      B: [
        {
          id: 'banana',
          name: 'Banana',
          image: '/images/fruits/banana.webp',
          imageAlt: 'A yellow banana with brown spots',
          difficulty: 1,
          pronunciation: 'ba-na-na',
          description: 'Yellow fruit that monkeys love to eat',
          facts: ['Bananas are berries, but strawberries are not!'],
          tags: ['fruit', 'tropical', 'sweet'],
          nutritionFacts: {
            vitamins: ['Vitamin B6', 'Vitamin C'],
            minerals: ['Potassium'],
            benefits: ['Good for energy', 'Helps muscles work']
          }
        }
      ]
    }
  },
  {
    id: 'transportation',
    name: 'Transportation',
    icon: '🚗',
    color: 'from-purple-400 to-pink-300',
    difficulty: 'Medium',
    description: 'Explore vehicles that take us places!',
    status: 'active',
    tags: ['educational', 'vehicles', 'travel'],
    ageRange: '3-8',
    learningObjectives: [
      'Vehicle recognition',
      'Transportation methods',
      'How things move'
    ],
    items: {
      A: [
        {
          id: 'airplane',
          name: 'Airplane',
          image: '/images/transportation/airplane.webp',
          imageAlt: 'A white airplane flying in blue sky',
          difficulty: 2,
          pronunciation: 'air-plane',
          description: 'Flying machines that carry people across the sky',
          facts: ['The first airplane flight lasted only 12 seconds'],
          tags: ['air', 'fast', 'travel'],
          technicalFacts: {
            speed: 'Very fast (500+ mph)',
            environment: 'Air/Sky',
            passengers: 'Many people'
          }
        }
      ],
      B: [
        {
          id: 'bus',
          name: 'Bus',
          image: '/images/transportation/bus.webp',
          imageAlt: 'A yellow school bus on a street',
          difficulty: 1,
          pronunciation: 'bus',
          description: 'Big vehicles that carry lots of people',
          facts: ['School buses are painted yellow to be easily seen'],
          tags: ['road', 'public', 'large'],
          technicalFacts: {
            speed: 'Medium speed',
            environment: 'Roads',
            passengers: 'Many people'
          }
        }
      ]
    }
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    await database.connect();
    console.log('✅ Connected to database');

    // Clear existing data
    await Category.deleteMany({});
    console.log('🗑️  Cleared existing categories');

    // Insert seed data
    for (const categoryData of sampleCategories) {
      const category = new Category(categoryData);
      await category.save();
      console.log(`✅ Created category: ${category.name} (${category.metadata.totalItems} items)`);
    }

    console.log(`\\n🎉 Seeding completed successfully!`);
    console.log(`📊 Database now contains ${sampleCategories.length} categories`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await database.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, sampleCategories };