import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import CategoryPage from './pages/CategoryPage';
import ItemPage from './pages/ItemPage';
import NotFoundPage from './pages/NotFoundPage';

const AppRouter = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<App />} />
        <Route path="/categories/:categoryId" element={<CategoryPage />} />
        <Route path="/categories/:categoryId/:letter/:itemId" element={<ItemPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;