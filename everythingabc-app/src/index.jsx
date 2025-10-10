import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import AppRouter from './AppRouter.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';

import { HelmetProvider } from 'react-helmet-async';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
);