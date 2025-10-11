import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Users, BookOpen, Target, Lightbulb, Globe, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';

const AboutPage = () => {
  const stats = [
    { icon: Users, value: '10,000+', label: 'Happy Learners' },
    { icon: BookOpen, value: '50+', label: 'Categories' },
    { icon: Star, value: '95%', label: 'Success Rate' },
    { icon: Globe, value: '25+', label: 'Countries' },
  ];

  const features = [
    {
      icon: Target,
      title: 'Educational Excellence',
      description: 'Carefully designed categories that build vocabulary through visual learning and interactive play.',
    },
    {
      icon: Heart,
      title: 'Family-Friendly',
      description: 'Safe, engaging content that parents trust and children love. No ads, no distractions.',
    },
    {
      icon: Lightbulb,
      title: 'Research-Based',
      description: 'Built on proven educational methodologies for optimal learning outcomes.',
    },
    {
      icon: Globe,
      title: 'Accessible Learning',
      description: 'Available worldwide, helping diverse learners build vocabulary skills.',
    },
  ];

  const team = [
    {
      name: 'Education Team',
      role: 'Curriculum Design',
      description: 'Experienced educators creating age-appropriate learning content.',
    },
    {
      name: 'Development Team',
      role: 'Platform Engineering',
      description: 'Building a fast, reliable, and accessible learning platform.',
    },
    {
      name: 'Content Team',
      role: 'Visual Learning',
      description: 'Curating high-quality images and interactive elements.',
    },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 transition-colors duration-300">
      <AppHeader />

      <main className="py-8">
        {/* Breadcrumb */}
        <div className="max-w-6xl mx-auto px-4 mb-8">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 py-12 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, #e879f9, #fb923c, #facc15, #4ade80, #22d3ee, #a855f7)",
              }}
            >
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900 dark:text-white">
              About EverythingABC
            </h1>
          </div>
          <p className="text-xl text-muted-foreground dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            We're on a mission to make vocabulary learning joyful and accessible for children worldwide through interactive visual experiences.
          </p>
        </section>

        {/* Stats Section */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-12 h-12 bg-primary/10 dark:bg-blue-400/20 rounded-full flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-primary dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground dark:text-gray-400">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Mission Section */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Our Mission
            </h2>
            <p className="text-lg text-muted-foreground dark:text-gray-300 max-w-3xl mx-auto">
              To create the world's most engaging visual vocabulary platform that makes learning fun, accessible, and effective for children of all backgrounds.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-primary/10 dark:bg-blue-400/20 rounded-full flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-primary dark:text-blue-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground dark:text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Story Section */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="bg-background/50 dark:bg-gray-800/50 rounded-lg p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Our Story
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 dark:text-gray-300">
              <p className="text-center leading-relaxed">
                EverythingABC was born from a simple observation: children learn best when they're having fun.
                Traditional vocabulary learning can be boring and disconnected from real-world experiences.
                We set out to change that by creating a platform that combines beautiful visuals, interactive elements,
                and proven educational methodologies.
              </p>
              <p className="text-center leading-relaxed mt-6">
                Our A-Z approach helps children systematically build their vocabulary while exploring categories
                they're naturally curious about - from animals and fruits to everyday objects. Every image is
                carefully selected, every interaction thoughtfully designed, and every category crafted to
                maximize learning outcomes.
              </p>
              <p className="text-center leading-relaxed mt-6">
                Today, we're trusted by thousands of families worldwide, from homeschooling parents to ESL educators.
                But we're just getting started. Our vision is to become the go-to platform for visual vocabulary
                learning, expanding into new languages, cultures, and learning modalities.
              </p>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Our Team
            </h2>
            <p className="text-lg text-muted-foreground dark:text-gray-300">
              Passionate educators, developers, and content creators working together to make learning better.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {team.map((member, index) => (
              <Card key={index} className="text-center dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {member.name}
                  </h3>
                  <p className="text-primary dark:text-blue-400 font-medium mb-3">
                    {member.role}
                  </p>
                  <p className="text-muted-foreground dark:text-gray-400 text-sm leading-relaxed">
                    {member.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-6xl mx-auto px-4 py-12 text-center">
          <div className="bg-primary/5 dark:bg-blue-400/10 rounded-lg p-8 md:p-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Start Learning?
            </h2>
            <p className="text-lg text-muted-foreground dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of families who are already making vocabulary learning fun and engaging.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="btn-primary">
                <Link to="/">
                  Explore Categories
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/contact">
                  Contact Us
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
};

export default AboutPage;