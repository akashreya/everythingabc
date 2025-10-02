const mongoose = require('mongoose');
const Category = require('../models/Category');
require('dotenv').config();

const vocabularyData = {
  animals: {
    id: 'animals',
    name: 'Animals',
    icon: '🐾',
    color: '#4F46E5',
    difficulty: 'Easy',
    description: 'Discover amazing animals from around the world, from tiny ants to enormous elephants!',
    tags: ['nature', 'wildlife', 'educational'],
    ageRange: '3-12 years',
    learningObjectives: [
      'Identify common animals and their names',
      'Learn about animal habitats and behaviors',
      'Develop vocabulary and pronunciation skills'
    ],
    items: {
      A: [
        {
          id: 'ant',
          name: 'Ant',
          image: 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=400',
          description: 'Small insects that live in colonies and work together to find food.',
          facts: ['Ants can carry 50 times their own body weight', 'Some ant colonies have millions of ants'],
          tags: ['insect', 'small', 'colony']
        },
        {
          id: 'alligator',
          name: 'Alligator',
          image: 'https://images.unsplash.com/photo-1596195689404-24d8a8d1c6ea?w=400',
          description: 'Large reptiles that live in water and have powerful jaws with sharp teeth.',
          facts: ['Alligators can hold their breath underwater for up to 24 hours', 'They are excellent swimmers'],
          tags: ['reptile', 'water', 'predator']
        }
      ],
      B: [
        {
          id: 'bear',
          name: 'Bear',
          image: 'https://images.unsplash.com/photo-1446066877558-5c1b9d95255c?w=400',
          description: 'Large mammals with thick fur that can be found in forests and mountains.',
          facts: ['Bears can run up to 30 mph', 'They have an excellent sense of smell'],
          tags: ['mammal', 'forest', 'large']
        },
        {
          id: 'butterfly',
          name: 'Butterfly',
          image: 'https://images.unsplash.com/photo-1444927714506-8492d94b5ba0?w=400',
          description: 'Beautiful insects with colorful wings that fly from flower to flower.',
          facts: ['Butterflies taste with their feet', 'They start life as caterpillars'],
          tags: ['insect', 'colorful', 'flying']
        }
      ],
      C: [
        {
          id: 'cat',
          name: 'Cat',
          image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400',
          description: 'Furry pets that purr, meow, and love to play with toys and sleep in sunny spots.',
          facts: ['Cats sleep 12-16 hours per day', 'They have excellent night vision'],
          tags: ['pet', 'domestic', 'furry']
        },
        {
          id: 'cow',
          name: 'Cow',
          image: 'https://images.unsplash.com/photo-1561133622-43c2bfdaad1e?w=400',
          description: 'Large farm animals that give us milk and say "moo".',
          facts: ['Cows have four stomachs', 'They can produce up to 7 gallons of milk per day'],
          tags: ['farm', 'domestic', 'milk']
        }
      ],
      D: [
        {
          id: 'dog',
          name: 'Dog',
          image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
          description: 'Loyal pets that bark, wag their tails, and love to play fetch with humans.',
          facts: ['Dogs have a sense of smell 10,000 times stronger than humans', 'They can learn over 150 words'],
          tags: ['pet', 'domestic', 'loyal']
        },
        {
          id: 'duck',
          name: 'Duck',
          image: 'https://images.unsplash.com/photo-1518107616985-bd48568d5c0c?w=400',
          description: 'Water birds with webbed feet that swim in ponds and quack loudly.',
          facts: ['Ducks are waterproof thanks to special oils in their feathers', 'They can sleep with one eye open'],
          tags: ['bird', 'water', 'swimming']
        }
      ],
      E: [
        {
          id: 'elephant',
          name: 'Elephant',
          image: 'https://images.unsplash.com/photo-1549366021-9f761d040a94?w=400',
          description: 'The largest land animals with long trunks they use like hands.',
          facts: ['Elephants can remember friends after decades apart', 'They use their trunks for breathing, drinking, and grabbing'],
          tags: ['mammal', 'large', 'trunk']
        },
        {
          id: 'eagle',
          name: 'Eagle',
          image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
          description: 'Powerful birds with sharp talons and excellent eyesight that soar high in the sky.',
          facts: ['Eagles can see up to 8 times better than humans', 'They can fly at speeds up to 100 mph'],
          tags: ['bird', 'predator', 'flying']
        }
      ]
    }
  },
  fruits: {
    id: 'fruits',
    name: 'Fruits & Vegetables',
    icon: '🍎',
    color: '#059669',
    difficulty: 'Easy',
    description: 'Learn about delicious and nutritious fruits and vegetables from around the world!',
    tags: ['food', 'healthy', 'nutrition'],
    ageRange: '2-10 years',
    learningObjectives: [
      'Identify common fruits and vegetables',
      'Learn about healthy eating habits',
      'Understand colors, shapes, and sizes'
    ],
    items: {
      A: [
        {
          id: 'apple',
          name: 'Apple',
          image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400',
          description: 'Sweet, crunchy fruit that comes in red, green, and yellow varieties.',
          facts: ['Apples float in water because they are 25% air', 'There are over 7,500 varieties of apples'],
          tags: ['fruit', 'sweet', 'crunchy'],
          nutritionFacts: {
            vitamins: ['Vitamin C', 'Vitamin A'],
            minerals: ['Potassium'],
            benefits: ['Good for teeth', 'High in fiber', 'Antioxidants']
          }
        },
        {
          id: 'avocado',
          name: 'Avocado',
          image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400',
          description: 'Creamy, green fruit that is healthy and delicious in salads and sandwiches.',
          facts: ['Avocados are technically berries', 'They ripen after being picked from the tree'],
          tags: ['fruit', 'creamy', 'healthy'],
          nutritionFacts: {
            vitamins: ['Vitamin K', 'Vitamin E'],
            minerals: ['Potassium'],
            benefits: ['Healthy fats', 'Good for heart', 'Helps absorb nutrients']
          }
        }
      ],
      B: [
        {
          id: 'banana',
          name: 'Banana',
          image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400',
          description: 'Yellow, curved fruit that is sweet and perfect for snacks or smoothies.',
          facts: ['Bananas are berries, but strawberries are not', 'They are naturally radioactive'],
          tags: ['fruit', 'sweet', 'yellow'],
          nutritionFacts: {
            vitamins: ['Vitamin B6', 'Vitamin C'],
            minerals: ['Potassium'],
            benefits: ['Quick energy', 'Good for muscles', 'Helps with sleep']
          }
        },
        {
          id: 'broccoli',
          name: 'Broccoli',
          image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400',
          description: 'Green vegetable that looks like a tiny tree and is packed with vitamins.',
          facts: ['Broccoli contains more vitamin C than oranges', 'It belongs to the cabbage family'],
          tags: ['vegetable', 'green', 'healthy'],
          nutritionFacts: {
            vitamins: ['Vitamin C', 'Vitamin K', 'Folate'],
            minerals: ['Iron', 'Calcium'],
            benefits: ['Boosts immunity', 'Strong bones', 'Good for brain']
          }
        }
      ],
      C: [
        {
          id: 'carrot',
          name: 'Carrot',
          image: 'https://images.unsplash.com/photo-1445282768818-728615cc910a?w=400',
          description: 'Orange root vegetable that is crunchy and sweet, great for healthy snacking.',
          facts: ['Carrots were originally purple, not orange', 'They can help improve night vision'],
          tags: ['vegetable', 'orange', 'crunchy'],
          nutritionFacts: {
            vitamins: ['Vitamin A', 'Beta-carotene'],
            minerals: ['Potassium'],
            benefits: ['Good for eyes', 'Healthy skin', 'Immune support']
          }
        },
        {
          id: 'corn',
          name: 'Corn',
          image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400',
          description: 'Yellow kernels on a cob that taste sweet and are fun to eat.',
          facts: ['Each ear of corn has about 800 kernels in 16 rows', 'Corn is used to make many products'],
          tags: ['vegetable', 'yellow', 'sweet'],
          nutritionFacts: {
            vitamins: ['Vitamin C', 'Thiamine'],
            minerals: ['Magnesium'],
            benefits: ['Energy source', 'Fiber for digestion', 'Antioxidants']
          }
        }
      ]
    }
  },
  transportation: {
    id: 'transportation',
    name: 'Transportation',
    icon: '🚗',
    color: '#DC2626',
    difficulty: 'Easy',
    description: 'Explore different ways people and things travel from place to place!',
    tags: ['vehicles', 'travel', 'technology'],
    ageRange: '3-10 years',
    learningObjectives: [
      'Identify different modes of transportation',
      'Learn about how vehicles work',
      'Understand travel and movement concepts'
    ],
    items: {
      A: [
        {
          id: 'airplane',
          name: 'Airplane',
          image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400',
          description: 'Flying machines that carry people and cargo through the sky using wings and engines.',
          facts: ['Airplanes can fly at over 500 mph', 'The Wright brothers made the first flight in 1903'],
          tags: ['air', 'flying', 'fast'],
          technicalFacts: {
            speed: 'Up to 600 mph',
            environment: 'Air',
            passengers: '100-400 people'
          }
        },
        {
          id: 'ambulance',
          name: 'Ambulance',
          image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400',
          description: 'Special vehicles that quickly transport sick or injured people to hospitals.',
          facts: ['Ambulances have sirens and flashing lights to clear traffic', 'They carry medical equipment'],
          tags: ['emergency', 'medical', 'rescue'],
          technicalFacts: {
            speed: 'Up to 80 mph (emergency)',
            environment: 'Road',
            passengers: '1-2 patients + crew'
          }
        }
      ],
      B: [
        {
          id: 'bicycle',
          name: 'Bicycle',
          image: 'https://images.unsplash.com/photo-1502744688674-c619d1586c9e?w=400',
          description: 'Two-wheeled vehicles powered by pedaling that are fun to ride and eco-friendly.',
          facts: ['Bicycles are the most efficient form of human transportation', 'They were invented in the 1880s'],
          tags: ['pedal', 'eco-friendly', 'exercise'],
          technicalFacts: {
            speed: '10-20 mph',
            environment: 'Road/path',
            passengers: '1-2 people'
          }
        },
        {
          id: 'bus',
          name: 'Bus',
          image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
          description: 'Large vehicles that carry many passengers along set routes in cities and towns.',
          facts: ['School buses are yellow for safety and visibility', 'City buses can carry 40-60 people'],
          tags: ['public', 'large', 'passengers'],
          technicalFacts: {
            speed: '25-55 mph',
            environment: 'Road',
            passengers: '40-80 people'
          }
        }
      ],
      C: [
        {
          id: 'car',
          name: 'Car',
          image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400',
          description: 'Personal vehicles with four wheels that families use to travel around town.',
          facts: ['The first cars were built in the 1880s', 'Modern cars have computers and safety features'],
          tags: ['personal', 'family', 'wheels'],
          technicalFacts: {
            speed: '25-80 mph',
            environment: 'Road',
            passengers: '2-8 people'
          }
        },
        {
          id: 'canoe',
          name: 'Canoe',
          image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
          description: 'Small boats powered by paddles, perfect for exploring rivers and lakes.',
          facts: ['Canoes have been used for thousands of years', 'They are very quiet on the water'],
          tags: ['water', 'paddle', 'quiet'],
          technicalFacts: {
            speed: '3-6 mph',
            environment: 'Water',
            passengers: '1-3 people'
          }
        }
      ]
    }
  }
};

async function populateVocabularyData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/everythingabc');
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Clearing existing category data...');
    await Category.deleteMany({});
    console.log('✅ Cleared existing data');

    console.log('📝 Inserting vocabulary data...');
    const categories = Object.values(vocabularyData);

    for (const categoryData of categories) {
      console.log(`📁 Creating category: ${categoryData.name}`);
      const category = new Category(categoryData);
      await category.save();
      console.log(`   ✅ Created ${categoryData.name} with ${category.metadata.totalItems} items`);
    }

    console.log('🎉 Successfully populated vocabulary data!');
    console.log(`📊 Summary:`);
    console.log(`   • ${categories.length} categories created`);

    const totalItems = categories.reduce((sum, cat) => {
      return sum + Object.values(cat.items).reduce((letterSum, items) => letterSum + items.length, 0);
    }, 0);
    console.log(`   • ${totalItems} total items created`);

    // Show category stats
    for (const cat of categories) {
      const itemCount = Object.values(cat.items).reduce((sum, items) => sum + items.length, 0);
      const letterCount = Object.keys(cat.items).filter(letter => cat.items[letter].length > 0).length;
      console.log(`   • ${cat.name}: ${itemCount} items across ${letterCount} letters`);
    }

  } catch (error) {
    console.error('❌ Error populating data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  populateVocabularyData();
}

module.exports = { vocabularyData, populateVocabularyData };