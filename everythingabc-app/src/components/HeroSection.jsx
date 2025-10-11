import React from 'react';
import { Star, Play, Users, BookOpen, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FlippingGridBackground from './FlippingGridBackground.jsx';

const HeroSection = () => {
  const stats = [
    { icon: Users, label: "Happy Learners", value: "10,000+" },
    { icon: BookOpen, label: "Categories", value: "50+" },
    { icon: Trophy, label: "Success Rate", value: "95%" },
  ];

  return (
    <section className="relative py-20 px-4 overflow-hidden">
      {/* Flipping Grid Background */}
      <FlippingGridBackground />
      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-black/30 to-white/50 pointer-events-none"></div>

      <div className="relative z-10 text-center max-w-6xl mx-auto">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400 mb-8 transition-colors duration-300">
          <Star className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">
            Trusted by 10,000+ families
          </span>
        </div>

        <h2 className="text-5xl md:text-7xl font-display font-bold mb-8 leading-tight text-gray-900 dark:text-white transition-colors duration-300">
            Learn the Alphabet
            <br />
            <span className="text-gradient">Through Play</span>
        </h2>

        <p className="text-xl text-muted-foreground dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed transition-colors duration-300">
          An engaging visual vocabulary platform that makes learning fun for
          children and gives parents confidence in their child's educational
          journey.
        </p>

        <div className="flex justify-center mb-16">
          <Button
            size="lg"
            className="btn-primary text-lg px-8 py-6 rounded-full"
            onClick={() => {
              document.getElementById("categories-section")?.scrollIntoView({
                behavior: "smooth",
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
              <div className="w-12 h-12 mx-auto mb-2 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center transition-colors duration-300">
                <stat.icon className="w-6 h-6 text-primary dark:text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">{stat.value}</div>
              <div className="text-sm text-muted-foreground dark:text-gray-400 transition-colors duration-300">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;