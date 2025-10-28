/**
 * Test Data Generator
 *
 * This module provides structured test data for development and testing environments.
 * It generates comprehensive categories, items, and images for the EverythingABC API.
 */

function createTestData() {
  const now = new Date();

  // Test Categories
  const categories = [
    {
      id: 'animals',
      name: 'Animals',
      description: 'Common animals from around the world',
      group: 'educational',
      icon: '🐾',
      color: '#4F46E5',
      status: 'published',
      items: {
        A: [
          { id: 'ant', name: 'Ant', description: 'Small industrious insect', status: 'published', difficulty: 1, hasImages: true, imageCount: 3 },
          { id: 'alligator', name: 'Alligator', description: 'Large reptile found in swamps', status: 'published', difficulty: 2, hasImages: true, imageCount: 2 }
        ],
        B: [
          { id: 'bird', name: 'Bird', description: 'Flying animal with feathers', status: 'published', difficulty: 1, hasImages: true, imageCount: 4 },
          { id: 'bear', name: 'Bear', description: 'Large mammal found in forests', status: 'published', difficulty: 2, hasImages: true, imageCount: 3 },
          { id: 'butterfly', name: 'Butterfly', description: 'Colorful flying insect', status: 'published', difficulty: 1, hasImages: true, imageCount: 5 }
        ],
        C: [
          { id: 'cat', name: 'Cat', description: 'Domestic feline pet', status: 'published', difficulty: 1, hasImages: true, imageCount: 6 },
          { id: 'cow', name: 'Cow', description: 'Farm animal that produces milk', status: 'published', difficulty: 1, hasImages: true, imageCount: 3 }
        ],
        D: [
          { id: 'dog', name: 'Dog', description: 'Loyal pet and companion', status: 'published', difficulty: 1, hasImages: true, imageCount: 8 },
          { id: 'duck', name: 'Duck', description: 'Water bird with webbed feet', status: 'published', difficulty: 1, hasImages: true, imageCount: 4 }
        ]
      },
      stats: {
        totalItems: 9,
        totalLetters: 4,
        completeness: 15.4 // 4/26 * 100
      },
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'fruits',
      name: 'Fruits',
      description: 'Fresh fruits and healthy snacks',
      group: 'educational',
      icon: '🍎',
      color: '#10B981',
      status: 'published',
      items: {
        A: [
          { id: 'apple', name: 'Apple', description: 'Crisp red or green fruit', status: 'published', difficulty: 1, hasImages: true, imageCount: 4 },
          { id: 'avocado', name: 'Avocado', description: 'Green creamy fruit rich in healthy fats', status: 'published', difficulty: 2, hasImages: true, imageCount: 3 }
        ],
        B: [
          { id: 'banana', name: 'Banana', description: 'Yellow curved tropical fruit', status: 'published', difficulty: 1, hasImages: true, imageCount: 5 },
          { id: 'blueberry', name: 'Blueberry', description: 'Small blue antioxidant-rich berry', status: 'published', difficulty: 2, hasImages: true, imageCount: 3 }
        ],
        C: [
          { id: 'cherry', name: 'Cherry', description: 'Small red stone fruit', status: 'published', difficulty: 1, hasImages: true, imageCount: 4 }
        ],
        O: [
          { id: 'orange', name: 'Orange', description: 'Citrus fruit high in vitamin C', status: 'published', difficulty: 1, hasImages: true, imageCount: 3 }
        ]
      },
      stats: {
        totalItems: 6,
        totalLetters: 4,
        completeness: 15.4 // 4/26 * 100
      },
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'transportation',
      name: 'Transportation',
      description: 'Vehicles and modes of transport',
      group: 'educational',
      icon: '🚗',
      color: '#F59E0B',
      status: 'published',
      items: {
        B: [
          { id: 'bicycle', name: 'Bicycle', description: 'Two-wheeled pedal-powered vehicle', status: 'published', difficulty: 1, hasImages: true, imageCount: 4 },
          { id: 'bus', name: 'Bus', description: 'Large vehicle for public transportation', status: 'published', difficulty: 1, hasImages: true, imageCount: 3 }
        ],
        C: [
          { id: 'car', name: 'Car', description: 'Four-wheeled motor vehicle', status: 'published', difficulty: 1, hasImages: true, imageCount: 6 }
        ],
        T: [
          { id: 'train', name: 'Train', description: 'Railway vehicle for long-distance travel', status: 'published', difficulty: 1, hasImages: true, imageCount: 4 },
          { id: 'truck', name: 'Truck', description: 'Large vehicle for carrying cargo', status: 'published', difficulty: 1, hasImages: true, imageCount: 3 }
        ]
      },
      stats: {
        totalItems: 5,
        totalLetters: 3,
        completeness: 11.5 // 3/26 * 100
      },
      createdAt: now,
      updatedAt: now
    }
  ];

  // Test Items (for V2 API)
  const items = [
    // Animals
    { id: 'ant', name: 'Ant', description: 'Small industrious insect', letter: 'A', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 3, createdAt: now, updatedAt: now },
    { id: 'alligator', name: 'Alligator', description: 'Large reptile found in swamps', letter: 'A', categoryId: 'animals', status: 'published', difficulty: 2, hasImages: true, imageCount: 2, createdAt: now, updatedAt: now },
    { id: 'bird', name: 'Bird', description: 'Flying animal with feathers', letter: 'B', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 4, createdAt: now, updatedAt: now },
    { id: 'bear', name: 'Bear', description: 'Large mammal found in forests', letter: 'B', categoryId: 'animals', status: 'published', difficulty: 2, hasImages: true, imageCount: 3, createdAt: now, updatedAt: now },
    { id: 'butterfly', name: 'Butterfly', description: 'Colorful flying insect', letter: 'B', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 5, createdAt: now, updatedAt: now },
    { id: 'cat', name: 'Cat', description: 'Domestic feline pet', letter: 'C', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 6, createdAt: now, updatedAt: now },
    { id: 'cow', name: 'Cow', description: 'Farm animal that produces milk', letter: 'C', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 3, createdAt: now, updatedAt: now },
    { id: 'dog', name: 'Dog', description: 'Loyal pet and companion', letter: 'D', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 8, createdAt: now, updatedAt: now },
    { id: 'duck', name: 'Duck', description: 'Water bird with webbed feet', letter: 'D', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 4, createdAt: now, updatedAt: now },

    // Fruits
    { id: 'apple', name: 'Apple', description: 'Crisp red or green fruit', letter: 'A', categoryId: 'fruits', status: 'published', difficulty: 1, hasImages: true, imageCount: 4, createdAt: now, updatedAt: now },
    { id: 'avocado', name: 'Avocado', description: 'Green creamy fruit rich in healthy fats', letter: 'A', categoryId: 'fruits', status: 'published', difficulty: 2, hasImages: true, imageCount: 3, createdAt: now, updatedAt: now },
    { id: 'banana', name: 'Banana', description: 'Yellow curved tropical fruit', letter: 'B', categoryId: 'fruits', status: 'published', difficulty: 1, hasImages: true, imageCount: 5, createdAt: now, updatedAt: now },
    { id: 'blueberry', name: 'Blueberry', description: 'Small blue antioxidant-rich berry', letter: 'B', categoryId: 'fruits', status: 'published', difficulty: 2, hasImages: true, imageCount: 3, createdAt: now, updatedAt: now },
    { id: 'cherry', name: 'Cherry', description: 'Small red stone fruit', letter: 'C', categoryId: 'fruits', status: 'published', difficulty: 1, hasImages: true, imageCount: 4, createdAt: now, updatedAt: now },
    { id: 'orange', name: 'Orange', description: 'Citrus fruit high in vitamin C', letter: 'O', categoryId: 'fruits', status: 'published', difficulty: 1, hasImages: true, imageCount: 3, createdAt: now, updatedAt: now },

    // Transportation
    { id: 'bicycle', name: 'Bicycle', description: 'Two-wheeled pedal-powered vehicle', letter: 'B', categoryId: 'transportation', status: 'published', difficulty: 1, hasImages: true, imageCount: 4, createdAt: now, updatedAt: now },
    { id: 'bus', name: 'Bus', description: 'Large vehicle for public transportation', letter: 'B', categoryId: 'transportation', status: 'published', difficulty: 1, hasImages: true, imageCount: 3, createdAt: now, updatedAt: now },
    { id: 'car', name: 'Car', description: 'Four-wheeled motor vehicle', letter: 'C', categoryId: 'transportation', status: 'published', difficulty: 1, hasImages: true, imageCount: 6, createdAt: now, updatedAt: now },
    { id: 'train', name: 'Train', description: 'Railway vehicle for long-distance travel', letter: 'T', categoryId: 'transportation', status: 'published', difficulty: 1, hasImages: true, imageCount: 4, createdAt: now, updatedAt: now },
    { id: 'truck', name: 'Truck', description: 'Large vehicle for carrying cargo', letter: 'T', categoryId: 'transportation', status: 'published', difficulty: 1, hasImages: true, imageCount: 3, createdAt: now, updatedAt: now }
  ];

  // Test Images (CategoryImage documents)
  const images = [
    // Animals - multiple images per item to simulate real data
    { itemId: 'ant', categoryId: 'animals', filename: 'ant_001.jpg', filePath: '/images/animals/ant_001.jpg', url: 'http://localhost:3003/images/animals/ant_001.jpg', size: 45678, width: 400, height: 300, format: 'jpeg', qualityScore: 8.5, aiGenerated: false, status: 'published', createdAt: now },
    { itemId: 'ant', categoryId: 'animals', filename: 'ant_002.jpg', filePath: '/images/animals/ant_002.jpg', url: 'http://localhost:3003/images/animals/ant_002.jpg', size: 52341, width: 500, height: 400, format: 'jpeg', qualityScore: 7.8, aiGenerated: false, status: 'published', createdAt: now },
    { itemId: 'ant', categoryId: 'animals', filename: 'ant_003.webp', filePath: '/images/animals/ant_003.webp', url: 'http://localhost:3003/images/animals/ant_003.webp', size: 38912, width: 600, height: 450, format: 'webp', qualityScore: 9.1, aiGenerated: false, status: 'published', createdAt: now },

    { itemId: 'bird', categoryId: 'animals', filename: 'bird_001.jpg', filePath: '/images/animals/bird_001.jpg', url: 'http://localhost:3003/images/animals/bird_001.jpg', size: 67234, width: 800, height: 600, format: 'jpeg', qualityScore: 9.2, aiGenerated: false, status: 'published', createdAt: now },
    { itemId: 'bird', categoryId: 'animals', filename: 'bird_002.png', filePath: '/images/animals/bird_002.png', url: 'http://localhost:3003/images/animals/bird_002.png', size: 123456, width: 1024, height: 768, format: 'png', qualityScore: 8.7, aiGenerated: false, status: 'published', createdAt: now },

    { itemId: 'cat', categoryId: 'animals', filename: 'cat_001.jpg', filePath: '/images/animals/cat_001.jpg', url: 'http://localhost:3003/images/animals/cat_001.jpg', size: 78901, width: 640, height: 480, format: 'jpeg', qualityScore: 9.5, aiGenerated: false, status: 'published', createdAt: now },
    { itemId: 'cat', categoryId: 'animals', filename: 'cat_002.webp', filePath: '/images/animals/cat_002.webp', url: 'http://localhost:3003/images/animals/cat_002.webp', size: 45123, width: 512, height: 384, format: 'webp', qualityScore: 8.9, aiGenerated: false, status: 'published', createdAt: now },

    { itemId: 'dog', categoryId: 'animals', filename: 'dog_001.jpg', filePath: '/images/animals/dog_001.jpg', url: 'http://localhost:3003/images/animals/dog_001.jpg', size: 89012, width: 800, height: 600, format: 'jpeg', qualityScore: 9.8, aiGenerated: false, status: 'published', createdAt: now },
    { itemId: 'dog', categoryId: 'animals', filename: 'dog_002.jpg', filePath: '/images/animals/dog_002.jpg', url: 'http://localhost:3003/images/animals/dog_002.jpg', size: 76543, width: 720, height: 540, format: 'jpeg', qualityScore: 8.3, aiGenerated: false, status: 'published', createdAt: now },

    // Fruits
    { itemId: 'apple', categoryId: 'fruits', filename: 'apple_001.jpg', filePath: '/images/fruits/apple_001.jpg', url: 'http://localhost:3003/images/fruits/apple_001.jpg', size: 56789, width: 600, height: 450, format: 'jpeg', qualityScore: 8.7, aiGenerated: false, status: 'published', createdAt: now },
    { itemId: 'apple', categoryId: 'fruits', filename: 'apple_002.webp', filePath: '/images/fruits/apple_002.webp', url: 'http://localhost:3003/images/fruits/apple_002.webp', size: 34567, width: 512, height: 384, format: 'webp', qualityScore: 9.1, aiGenerated: false, status: 'published', createdAt: now },

    { itemId: 'banana', categoryId: 'fruits', filename: 'banana_001.jpg', filePath: '/images/fruits/banana_001.jpg', url: 'http://localhost:3003/images/fruits/banana_001.jpg', size: 43210, width: 480, height: 360, format: 'jpeg', qualityScore: 8.4, aiGenerated: false, status: 'published', createdAt: now },
    { itemId: 'banana', categoryId: 'fruits', filename: 'banana_002.png', filePath: '/images/fruits/banana_002.png', url: 'http://localhost:3003/images/fruits/banana_002.png', size: 87654, width: 640, height: 480, format: 'png', qualityScore: 7.9, aiGenerated: false, status: 'published', createdAt: now },

    { itemId: 'orange', categoryId: 'fruits', filename: 'orange_001.jpg', filePath: '/images/fruits/orange_001.jpg', url: 'http://localhost:3003/images/fruits/orange_001.jpg', size: 65432, width: 700, height: 525, format: 'jpeg', qualityScore: 8.8, aiGenerated: false, status: 'published', createdAt: now },

    // Transportation
    { itemId: 'car', categoryId: 'transportation', filename: 'car_001.jpg', filePath: '/images/transportation/car_001.jpg', url: 'http://localhost:3003/images/transportation/car_001.jpg', size: 98765, width: 1024, height: 768, format: 'jpeg', qualityScore: 9.3, aiGenerated: false, status: 'published', createdAt: now },
    { itemId: 'car', categoryId: 'transportation', filename: 'car_002.webp', filePath: '/images/transportation/car_002.webp', url: 'http://localhost:3003/images/transportation/car_002.webp', size: 54321, width: 800, height: 600, format: 'webp', qualityScore: 8.6, aiGenerated: false, status: 'published', createdAt: now },

    { itemId: 'bicycle', categoryId: 'transportation', filename: 'bicycle_001.jpg', filePath: '/images/transportation/bicycle_001.jpg', url: 'http://localhost:3003/images/transportation/bicycle_001.jpg', size: 72109, width: 720, height: 540, format: 'jpeg', qualityScore: 8.2, aiGenerated: false, status: 'published', createdAt: now },

    { itemId: 'train', categoryId: 'transportation', filename: 'train_001.jpg', filePath: '/images/transportation/train_001.jpg', url: 'http://localhost:3003/images/transportation/train_001.jpg', size: 134567, width: 1200, height: 900, format: 'jpeg', qualityScore: 9.6, aiGenerated: false, status: 'published', createdAt: now }
  ];

  return {
    categories,
    items,
    images
  };
}

module.exports = {
  createTestData
};