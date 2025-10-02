import React, { useState, createContext, useContext } from 'react';
import { ChevronDown } from 'lucide-react';

const SelectContext = createContext();

const Select = ({ value, onValueChange, children, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className="relative" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = ({ children, className = '', ...props }) => {
  const { isOpen, setIsOpen } = useContext(SelectContext);

  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
};

const SelectValue = ({ placeholder = 'Select an option' }) => {
  const { value } = useContext(SelectContext);
  return <span className={value ? 'text-gray-900' : 'text-gray-500'}>{value || placeholder}</span>;
};

const SelectContent = ({ children, className = '', ...props }) => {
  const { isOpen } = useContext(SelectContext);

  if (!isOpen) return null;

  return (
    <div
      className={`absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const SelectItem = ({ value, children, className = '', ...props }) => {
  const { onValueChange, setIsOpen, value: selectedValue } = useContext(SelectContext);

  const handleClick = () => {
    onValueChange(value);
    setIsOpen(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 ${
        selectedValue === value ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };