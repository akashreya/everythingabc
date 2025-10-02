// Category data structure designed for future CMS integration
// This structure supports both static JSON and dynamic CMS content

export const categoriesData = {
  animals: {
    id: 'animals',
    name: 'Animals',
    icon: '🐾',
    color: 'from-blue-400 to-cyan-300',
    difficulty: 'Easy',
    description: 'Meet amazing creatures from around the world!',
    status: 'active',
    completeness: 26, // number of letters with items
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
          tags: ['reptile', 'water', 'large'],
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
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
          tags: ['mammal', 'forest', 'large'],
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
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
          tags: ['pet', 'domestic', 'small'],
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
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
          tags: ['pet', 'domestic', 'loyal'],
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        }
      ]
      // Additional letters would be populated here
    }
  },

  fruits: {
    id: 'fruits',
    name: 'Fruits & Vegetables',
    icon: '🍎',
    color: 'from-green-400 to-emerald-300',
    difficulty: 'Easy',
    description: 'Discover delicious and healthy foods!',
    status: 'active',
    completeness: 24,
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
          },
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
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
          },
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        }
      ]
      // Additional letters would be populated here
    }
  },

  transportation: {
    id: 'transportation',
    name: 'Transportation',
    icon: '🚗',
    color: 'from-purple-400 to-pink-300',
    difficulty: 'Medium',
    description: 'Explore vehicles that take us places!',
    status: 'active',
    completeness: 22,
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
          },
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
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
          },
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        }
      ]
      // Additional letters would be populated here
    }
  },

  colors: {
    id: 'colors',
    name: 'Colors & Shapes',
    icon: '🌈',
    color: 'from-yellow-400 to-orange-300',
    difficulty: 'Easy',
    description: 'Learn about colors and geometric shapes!',
    status: 'active',
    completeness: 20,
    tags: ['educational', 'art', 'basic'],
    ageRange: '2-5',
    learningObjectives: [
      'Color recognition',
      'Shape identification',
      'Visual discrimination'
    ],
    items: {
      A: [
        {
          id: 'aqua',
          name: 'Aqua',
          image: '/images/colors/aqua.webp',
          imageAlt: 'A bright aqua blue color swatch',
          difficulty: 2,
          pronunciation: 'a-qua',
          description: 'A blue-green color like tropical water',
          facts: ['Aqua comes from the Latin word for water'],
          tags: ['color', 'blue', 'green'],
          colorInfo: {
            hex: '#00FFFF',
            rgb: 'RGB(0, 255, 255)',
            family: 'Blue-Green',
            mood: 'Calm and refreshing'
          },
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        }
      ]
      // Additional letters would be populated here
    }
  },

  household: {
    id: 'household',
    name: 'Household Items',
    icon: '🏠',
    color: 'from-indigo-400 to-purple-300',
    difficulty: 'Medium',
    description: 'Discover things we use every day at home!',
    status: 'active',
    completeness: 25,
    tags: ['educational', 'daily-life', 'practical'],
    ageRange: '3-7',
    learningObjectives: [
      'Object recognition',
      'Daily life vocabulary',
      'Home environment awareness'
    ],
    items: {
      A: [
        {
          id: 'armchair',
          name: 'Armchair',
          image: '/images/household/armchair.webp',
          imageAlt: 'A comfortable brown leather armchair',
          difficulty: 2,
          pronunciation: 'arm-chair',
          description: 'A comfortable chair with arms to rest on',
          facts: ['The first armchairs were made for royalty'],
          tags: ['furniture', 'comfort', 'seating'],
          roomLocation: 'Living room or bedroom',
          uses: ['Reading', 'Relaxing', 'Watching TV'],
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        }
      ]
      // Additional letters would be populated here
    }
  }
};

// Helper functions for future CMS integration
export const getCategoryById = (id) => categoriesData[id];

export const getAllCategories = () => Object.values(categoriesData);

export const getCategoryItems = (categoryId, letter) => {
  const category = getCategoryById(categoryId);
  return category?.items[letter] || [];
};

export const searchItems = (query, categoryId = null) => {
  const categories = categoryId ? [getCategoryById(categoryId)] : getAllCategories();
  const results = [];

  categories.forEach(category => {
    if (!category) return;

    Object.values(category.items).forEach(letterItems => {
      letterItems.forEach(item => {
        if (item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase()) ||
            item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))) {
          results.push({
            ...item,
            categoryId: category.id,
            categoryName: category.name
          });
        }
      });
    });
  });

  return results;
};

// Schema for future CMS integration
export const categorySchema = {
  id: 'string (unique)',
  name: 'string',
  icon: 'string (emoji)',
  color: 'string (tailwind gradient)',
  difficulty: 'enum: Easy|Medium|Hard',
  description: 'string',
  status: 'enum: active|inactive|draft',
  completeness: 'number (0-26)',
  tags: 'array of strings',
  ageRange: 'string',
  learningObjectives: 'array of strings',
  items: 'object with A-Z keys containing arrays of items',
  createdAt: 'ISO date string',
  updatedAt: 'ISO date string',
  createdBy: 'user ID (for CMS)',
  lastModifiedBy: 'user ID (for CMS)'
};

export const itemSchema = {
  id: 'string (unique within category)',
  name: 'string',
  image: 'string (URL or path)',
  imageAlt: 'string (accessibility)',
  difficulty: 'number (1-5)',
  pronunciation: 'string (phonetic)',
  description: 'string',
  facts: 'array of strings',
  tags: 'array of strings',
  // Optional fields depending on category
  nutritionFacts: 'object (for food items)',
  technicalFacts: 'object (for vehicles, etc)',
  colorInfo: 'object (for colors)',
  roomLocation: 'string (for household items)',
  uses: 'array of strings',
  createdAt: 'ISO date string',
  updatedAt: 'ISO date string',
  createdBy: 'user ID (for CMS)',
  approved: 'boolean (for CMS content moderation)'
};