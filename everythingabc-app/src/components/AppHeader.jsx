import React from 'react';
import { Search, Moon, Sun } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTheme } from '../contexts/ThemeContext.jsx';

const AppHeader = () => {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 dark:bg-gray-800/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-gray-700 transition-colors duration-300">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center animate-bounce-gentle"
              style={{
                background:
                  "linear-gradient(135deg, #e879f9, #fb923c, #facc15, #4ade80, #22d3ee, #a855f7)",
              }}
            >
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-gradient dark:text-white">
              EverythingABC
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search categories..."
              className="pl-10 w-64 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleDarkMode}
            className="rounded-full"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;