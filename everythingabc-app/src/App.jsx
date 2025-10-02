import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Star, Search, Play, BookOpen, Users, Trophy, Moon, Sun, Loader2, Shield } from 'lucide-react';
import apiService from './services/api.js';
import Breadcrumb from './components/Breadcrumb.jsx';

// Helper function to convert Tailwind gradient colors to actual CSS colors
const getCategoryGradient = (gradientString) => {
  const colorMap = {
    'from-blue-400 to-cyan-300': '#60a5fa, #67e8f9',
    'from-green-400 to-emerald-300': '#4ade80, #6ee7b7',
    'from-purple-400 to-pink-300': '#c084fc, #f9a8d4',
    'from-yellow-400 to-orange-300': '#facc15, #fdba74',
    'from-indigo-400 to-purple-300': '#818cf8, #d8b4fe'
  };
  return colorMap[gradientString] || '#60a5fa, #67e8f9';
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryImages, setCategoryImages] = useState({});
  const [categoryImageIndexes, setCategoryImageIndexes] = useState({});
  const [fadingOut, setFadingOut] = useState({});

  // API state
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getCategories();
        setCategories(response.data || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
        setError(err.message || 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Get all images from a category for slideshow
  const getCategoryImagesArray = (category) => {
    const images = [];
    if (category.items) {
      Object.values(category.items).forEach(letterItems => {
        if (Array.isArray(letterItems)) {
          letterItems.forEach(item => {
            if (item && item.image) {
              images.push(item.image);
            }
          });
        }
      });
    }
    return images;
  };

  // Initialize and rotate category images with smooth transitions
  useEffect(() => {
    if (loading || categories.length === 0) return;

    const intervals = {};

    categories.forEach(category => {
      const images = getCategoryImagesArray(category);
      if (images.length > 0) {
        // Set initial random image and index
        const initialIndex = Math.floor(Math.random() * images.length);
        setCategoryImages(prev => ({
          ...prev,
          [category.id]: images[initialIndex]
        }));
        setCategoryImageIndexes(prev => ({
          ...prev,
          [category.id]: initialIndex
        }));

        if (images.length > 1) {
          // Set up rotation interval with proper fade animation
          intervals[category.id] = setInterval(() => {
            // Start fade out
            setFadingOut(prev => ({
              ...prev,
              [category.id]: true
            }));

            // After fade out completes, change image and fade in
            setTimeout(() => {
              setCategoryImageIndexes(prev => {
                const currentIndex = prev[category.id] || 0;
                const nextIndex = (currentIndex + 1) % images.length;
                return {
                  ...prev,
                  [category.id]: nextIndex
                };
              });

              setCategoryImages(prevImages => {
                const currentIndex = (categoryImageIndexes[category.id] || 0) + 1;
                return {
                  ...prevImages,
                  [category.id]: images[currentIndex % images.length]
                };
              });

              // End fade out (start fade in)
              setTimeout(() => {
                setFadingOut(prev => ({
                  ...prev,
                  [category.id]: false
                }));
              }, 50);
            }, 800); // Wait for fade out to complete
          }, 5000); // Change every 5 seconds
        }
      }
    });

    return () => {
      Object.values(intervals).forEach(interval => clearInterval(interval));
    };
  }, [loading, categories]);

  const stats = [
    { icon: Users, label: 'Happy Learners', value: '10,000+' },
    { icon: BookOpen, label: 'Categories', value: '50+' },
    { icon: Trophy, label: 'Success Rate', value: '95%' },
  ];

  if (selectedCategory) {
    return <CategoryView category={selectedCategory} onBack={() => setSelectedCategory(null)} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
  }

  return (
    <div className="min-h-screen" style={{background: 'linear-gradient(135deg, #f8fafc, #dbeafe, #e0e7ff)'}}>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center animate-bounce-gentle"
                style={{background: 'linear-gradient(135deg, #e879f9, #fb923c, #facc15, #4ade80, #22d3ee, #a855f7)'}}
              >
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-gradient">
                EverythingABC
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Search categories..." className="pl-10 w-64" />
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to="/admin-demo"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors hidden md:flex items-center space-x-1"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Demo</span>
              </Link>
              <Link
                to="/admin/login"
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors hidden md:flex items-center space-x-1"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Login</span>
              </Link>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className="rounded-full"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative z-10 text-center max-w-6xl mx-auto">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary mb-8">
            <Star className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">Trusted by 10,000+ families</span>
          </div>

          <h2 className="text-5xl md:text-7xl font-display font-bold mb-8 leading-tight">
            Learn the Alphabet
            <br />
            <span className="text-gradient">Through Play</span>
          </h2>

          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            An engaging visual vocabulary platform that makes learning fun for children and gives parents confidence in their child's educational journey.
          </p>

          <div className="flex justify-center mb-16">
            <Button
              size="lg"
              className="btn-primary text-lg px-8 py-6 rounded-full"
              onClick={() => {
                document.getElementById('categories-section')?.scrollIntoView({
                  behavior: 'smooth'
                });
              }}
            >
              <Play className="w-5 h-5 mr-2" />
              Start Learning Free
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-primary/10 rounded-full flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories-section" className="py-20 px-4 bg-background/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">Explore Learning Categories</h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Each category is carefully designed to build vocabulary through visual learning and interactive play.
            </p>
          </div>

          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600 text-lg font-medium">Error: {error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-4"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
              <Card
                key={category.id}
                className="group cursor-pointer card-hover border-0 overflow-hidden"
                onClick={async () => {
                  try {
                    const fullCategory = await apiService.getCategory(category.id);
                    setSelectedCategory(fullCategory.data);
                  } catch (err) {
                    console.error('Failed to load category details:', err);
                  }
                }}
              >
                <div
                  className="h-32 flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${getCategoryGradient(category.color)})`
                  }}
                >
                  {categoryImages[category.id] ? (
                    <div className="relative w-full h-full">
                      {/* Image with Fade Animation */}
                      <img
                        src={categoryImages[category.id]}
                        alt={`${category.name} preview`}
                        className={`w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                          fadingOut[category.id] ? 'opacity-0' : 'opacity-100'
                        }`}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      {/* Fallback icon */}
                      <div
                        className="w-full h-full flex items-center justify-center text-6xl animate-bounce-gentle group-hover:animate-wiggle absolute top-0 left-0"
                        style={{ display: 'none' }}
                      >
                        {category.icon}
                      </div>
                      {/* Gentle gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20"></div>
                    </div>
                  ) : (
                    <div className="text-6xl animate-bounce-gentle group-hover:animate-wiggle">
                      {category.icon}
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm">
                      {category.difficulty}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <div className="text-2xl opacity-80">
                      {category.icon}
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-xl font-semibold group-hover:text-primary transition-colors">
                      {category.name}
                    </h4>
                    <Badge variant="outline">{category.metadata?.totalItems || 0} items</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {category.description}
                  </p>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{background: 'linear-gradient(135deg, #e879f9, #fb923c, #facc15, #4ade80, #22d3ee, #a855f7)'}}
            >
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="font-display text-lg font-bold text-gradient">EverythingABC</span>
          </div>
          <p className="text-muted-foreground">
            &copy; {new Date().getFullYear()} EverythingABC. Making education joyful for families worldwide.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Category Detail View Component
function CategoryView({ category, onBack, isDarkMode, toggleDarkMode }) {
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [randomizedItems, setRandomizedItems] = useState({});
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const getLetterItems = (letter) => {
    return category.items[letter] || [];
  };

  const hasItems = (letter) => {
    return category.items[letter] && category.items[letter].length > 0;
  };

  // Get randomized item for each letter
  const getRandomizedItems = () => {
    if (Object.keys(randomizedItems).length === 0) {
      const newRandomizedItems = {};
      alphabet.forEach(letter => {
        const items = getLetterItems(letter);
        if (items.length > 0) {
          const randomIndex = Math.floor(Math.random() * items.length);
          newRandomizedItems[letter] = items[randomIndex];
        }
      });
      setRandomizedItems(newRandomizedItems);
      return newRandomizedItems;
    }
    return randomizedItems;
  };

  const randomizeCategory = () => {
    const newRandomizedItems = {};
    alphabet.forEach(letter => {
      const items = getLetterItems(letter);
      if (items.length > 0) {
        const randomIndex = Math.floor(Math.random() * items.length);
        newRandomizedItems[letter] = items[randomIndex];
      }
    });
    setRandomizedItems(newRandomizedItems);
  };


  const handleLetterSelect = (letter) => {
    const items = getLetterItems(letter);
    const currentRandomizedItems = getRandomizedItems();
    const displayItem = currentRandomizedItems[letter] || items[0];
    if (items.length > 0) {
      setSelectedLetter(letter);
      setSelectedItem(displayItem);
    }
  };

  const navigateToLetter = (letter) => {
    const items = getLetterItems(letter);
    const currentRandomizedItems = getRandomizedItems();
    const displayItem = currentRandomizedItems[letter] || items[0];
    if (items.length > 0) {
      setSelectedLetter(letter);
      setSelectedItem(displayItem);
    }
  };

  if (selectedItem && selectedLetter) {
    return <ItemView
      category={category}
      letter={selectedLetter}
      item={selectedItem}
      items={getLetterItems(selectedLetter)}
      onBack={() => {
        setSelectedItem(null);
        setSelectedLetter(null);
      }}
      onBackToCategories={onBack}
      onNavigateToLetter={navigateToLetter}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
    />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Breadcrumb
                items={[
                  { label: 'Home', path: 'home' },
                  { label: category.name, path: 'category', icon: category.icon }
                ]}
                onNavigate={(path) => {
                  if (path === 'home') onBack();
                }}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className="rounded-full"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
          <div className="mt-3">
            <h1 className="text-xl font-bold text-gray-900">{category.name}</h1>
            <p className="text-sm text-gray-600">{category.description}</p>
          </div>
        </div>
      </header>

      {/* A-Z Grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Randomize Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={randomizeCategory}
            className="flex items-center space-x-2 px-6 py-3 bg-white border-2 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
            style={{ borderColor: getCategoryGradient(category.color).split(',')[0] }}
          >
            <span className="text-lg">🎲</span>
            <span style={{ color: getCategoryGradient(category.color).split(',')[0] }}>Randomize Items</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {alphabet.map(letter => {
            const letterHasItems = hasItems(letter);
            const items = getLetterItems(letter);
            const currentRandomizedItems = getRandomizedItems();
            const displayItem = letterHasItems ? currentRandomizedItems[letter] : null;


            return (
              <div
                key={letter}
                onClick={() => letterHasItems && handleLetterSelect(letter)}
                className={`
                  aspect-square rounded-2xl border-2 transition-all duration-200 overflow-hidden
                  ${letterHasItems
                    ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg hover:scale-105 cursor-pointer group'
                    : 'bg-gray-50 border-gray-100 opacity-50'
                  }
                `}
              >
                {letterHasItems && displayItem ? (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 relative min-h-0">
                      <img
                        src={displayItem.image}
                        alt={displayItem.imageAlt || displayItem.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div
                        className="w-full h-full flex items-center justify-center text-4xl"
                        style={{
                          backgroundColor: getCategoryGradient(category.color).split(',')[0] + '20',
                          display: 'none'
                        }}
                      >
                        📷
                      </div>
                      <div className="absolute top-3 left-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg"
                          style={{ backgroundColor: getCategoryGradient(category.color).split(',')[0] }}
                        >
                          {letter}
                        </div>
                      </div>
                    </div>
                    <div className="p-2 bg-white h-10 flex-shrink-0 flex items-center justify-center">
                      <div className="text-center w-full">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {displayItem?.name || 'No name'}
                        </div>
                        {items.length > 1 && (
                          <div className="text-xs text-gray-500">
                            +{items.length - 1} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className={`
                      text-2xl font-bold mb-2
                      ${letterHasItems ? 'text-gray-900 group-hover:text-blue-600' : 'text-gray-400'}
                    `}>
                      {letter}
                    </div>
                    {letterHasItems ? (
                      <div className="text-xs text-gray-500">
                        {items.length} item{items.length > 1 ? 's' : ''}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">Coming soon</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Item Detail View Component
function ItemView({ category, letter, item, items, onBack, onBackToCategories, onNavigateToLetter, isDarkMode, toggleDarkMode }) {
  const [currentItemIndex, setCurrentItemIndex] = useState(() => {
    return items.findIndex(i => i.id === item.id);
  });

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const hasMultiple = items.length > 1;

  const handleNextItem = () => {
    const nextIndex = (currentItemIndex + 1) % items.length;
    setCurrentItemIndex(nextIndex);
  };

  const handlePrevItem = () => {
    const prevIndex = currentItemIndex === 0 ? items.length - 1 : currentItemIndex - 1;
    setCurrentItemIndex(prevIndex);
  };

  // Letter navigation functions
  const getLettersWithItems = () => {
    return alphabet.filter(l => category.items[l] && category.items[l].length > 0);
  };

  const currentLetterIndex = getLettersWithItems().indexOf(letter);
  const lettersWithItems = getLettersWithItems();

  const goToPreviousLetter = () => {
    if (currentLetterIndex > 0) {
      const prevLetter = lettersWithItems[currentLetterIndex - 1];
      onNavigateToLetter(prevLetter);
    }
  };

  const goToNextLetter = () => {
    if (currentLetterIndex < lettersWithItems.length - 1) {
      const nextLetter = lettersWithItems[currentLetterIndex + 1];
      onNavigateToLetter(nextLetter);
    }
  };

  const currentItem = items[currentItemIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header with Breadcrumb */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Breadcrumb
                items={[
                  { label: 'Home', path: 'home' },
                  { label: category.name, path: 'category', icon: category.icon },
                  { label: currentItem.name, path: 'item' }
                ]}
                onNavigate={(path) => {
                  if (path === 'home') onBackToCategories();
                  if (path === 'category') onBack();
                }}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className="rounded-full"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
          <div className="mt-3">
            <h1 className="text-lg font-semibold text-gray-900">
              {currentItem.name}
            </h1>
            {hasMultiple && (
              <p className="text-sm text-gray-600">
                {currentItemIndex + 1} of {items.length} items
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Item Display with Carousel Navigation */}
      <div className="max-w-full mx-auto px-4 py-12">
        <div className="flex items-center justify-center space-x-16">
          {/* Previous Letter Button */}
          <button
            onClick={goToPreviousLetter}
            disabled={currentLetterIndex === 0}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              currentLetterIndex === 0
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 shadow-lg hover:shadow-xl'
            }`}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Item Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-6xl">
          <div className="aspect-[4/3] relative">
            <img
              src={currentItem.image}
              alt={currentItem.imageAlt || currentItem.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div
              className="w-full h-full flex items-center justify-center text-6xl"
              style={{
                backgroundColor: getCategoryGradient(category.color).split(',')[0] + '20',
                display: 'none'
              }}
            >
              📷
            </div>
            <div className="absolute top-6 left-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg"
                style={{ backgroundColor: getCategoryGradient(category.color).split(',')[0] }}
              >
                {letter}
              </div>
            </div>
          </div>

          <div className="p-12 text-center">
            <h2 className="text-6xl font-bold text-gray-900 mb-6">
              {currentItem.name}
            </h2>

            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              {currentItem.description}
            </p>

            {currentItem.facts && currentItem.facts.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-6 mb-8">
                <p className="text-blue-800 font-medium text-lg">
                  💡 {currentItem.facts[0]}
                </p>
              </div>
            )}

            {currentItem.tags && currentItem.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {currentItem.tags.slice(0, 5).map((tag) => (
                  <span key={tag} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-base">
                    {tag}
                  </span>
                ))}
              </div>
            )}


            {hasMultiple && (
              <div className="flex items-center justify-center space-x-4 mt-8">
                <button
                  onClick={handlePrevItem}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium"
                >
                  Previous
                </button>
                <div className="flex space-x-2">
                  {items.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentItemIndex ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleNextItem}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors font-medium"
                >
                  Next
                </button>
              </div>
            )}
          </div>
          </div>

          {/* Next Letter Button */}
          <button
            onClick={goToNextLetter}
            disabled={currentLetterIndex === lettersWithItems.length - 1}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              currentLetterIndex === lettersWithItems.length - 1
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 shadow-lg hover:shadow-xl'
            }`}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Letter Indicator */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm border">
            <span className="text-sm font-medium text-gray-600">
              Letter {letter} • {currentLetterIndex + 1} of {lettersWithItems.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
// Test comment
