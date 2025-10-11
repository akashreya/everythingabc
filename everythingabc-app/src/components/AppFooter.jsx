import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Heart, BookOpen, Users, Shield, FileText } from 'lucide-react';

const AppFooter = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { name: 'About Us', href: '/about', icon: BookOpen },
      { name: 'Contact', href: '/contact', icon: Mail },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy', icon: Shield },
      { name: 'Terms of Service', href: '/terms', icon: FileText },
    ],
    categories: [
      { name: 'Animals', href: '/categories/animals' },
      { name: 'Fruits', href: '/categories/fruits' },
      { name: 'Vegetables', href: '/categories/vegetables' },
      { name: 'Birds', href: '/categories/birds' },
    ],
  };

  return (
    <footer className="bg-background dark:bg-gray-900 border-t dark:border-gray-700 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #e879f9, #fb923c, #facc15, #4ade80, #22d3ee, #a855f7)",
                }}
              >
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-display text-xl font-bold text-gradient dark:text-white">
                EverythingABC
              </span>
            </div>
            <p className="text-muted-foreground dark:text-gray-400 text-sm leading-relaxed mb-4">
              Making education joyful for families worldwide through interactive
              visual vocabulary learning.
            </p>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground dark:text-gray-400">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <span>from a Father</span>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="flex items-center space-x-2 text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-colors duration-200"
                  >
                    <link.icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Categories */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
              Popular Categories
            </h4>
            <ul className="space-y-3">
              {footerLinks.categories.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="flex items-center space-x-2 text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-colors duration-200"
                  >
                    <link.icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t dark:border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-muted-foreground dark:text-gray-400 text-sm">
              {currentYear} EverythingABC
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span>Trusted by 10,000+ families</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;