import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const Notification = () => {
  const [notifications, setNotifications] = useState([]);

  // Listen for custom notification events
  useEffect(() => {
    const handleNotification = (event) => {
      const notification = {
        id: Date.now() + Math.random(),
        ...event.detail,
        timestamp: new Date()
      };
      
      setNotifications(prev => [...prev, notification]);
      
      // Auto-remove after duration
      const duration = notification.duration || 5000;
      setTimeout(() => {
        removeNotification(notification.id);
      }, duration);
    };

    window.addEventListener('notify', handleNotification);
    
    return () => {
      window.removeEventListener('notify', handleNotification);
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-error-600" />;
      default:
        return <Info className="h-5 w-5 text-primary-600" />;
    }
  };

  const getStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-success-50 border-success-200 text-success-800';
      case 'warning':
        return 'bg-warning-50 border-warning-200 text-warning-800';
      case 'error':
        return 'bg-error-50 border-error-200 text-error-800';
      default:
        return 'bg-primary-50 border-primary-200 text-primary-800';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`max-w-sm w-full border rounded-lg shadow-lg p-4 transition-all duration-500 transform ${getStyles(notification.type)}`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getIcon(notification.type)}
            </div>
            
            <div className="ml-3 flex-1">
              {notification.title && (
                <h4 className="font-medium text-sm">
                  {notification.title}
                </h4>
              )}
              
              <p className={`text-sm ${notification.title ? 'mt-1' : ''}`}>
                {notification.message}
              </p>
            </div>
            
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() => removeNotification(notification.id)}
                className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Helper function to show notifications
export const showNotification = (type, message, title = null, duration = 5000) => {
  const event = new CustomEvent('notify', {
    detail: { type, message, title, duration }
  });
  window.dispatchEvent(event);
};

export default Notification;