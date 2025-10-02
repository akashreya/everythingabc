import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumb = ({ items, onNavigate }) => {
  return (
    <nav className="flex items-center space-x-2 text-sm">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <button
            onClick={() => onNavigate(item.path)}
            className={`
              flex items-center space-x-1 px-2 py-1 rounded-md transition-colors
              ${index === items.length - 1
                ? 'text-gray-900 font-medium cursor-default'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
            disabled={index === items.length - 1}
          >
            {index === 0 ? (
              <Home className="w-4 h-4" />
            ) : item.icon ? (
              <span className="text-sm">{item.icon}</span>
            ) : null}
            <span>{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;