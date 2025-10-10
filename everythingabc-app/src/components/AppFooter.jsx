import React from 'react';

const AppFooter = () => {
  return (
    <footer className="bg-background dark:bg-gray-900 border-t dark:border-gray-700 py-12 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #e879f9, #fb923c, #facc15, #4ade80, #22d3ee, #a855f7)",
            }}
          >
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <span className="font-display text-lg font-bold text-gradient dark:text-white">
            EverythingABC
          </span>
        </div>
        <p className="text-muted-foreground dark:text-gray-400 transition-colors duration-300">
          &copy; {new Date().getFullYear()} EverythingABC. Making education
          joyful for families worldwide.
        </p>
      </div>
    </footer>
  );
};

export default AppFooter;