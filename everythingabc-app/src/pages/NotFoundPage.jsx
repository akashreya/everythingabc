import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-3xl font-semibold mb-4">Page Not Found</h2>
      <p className="text-lg text-muted-foreground mb-8 text-center">
        Oops! The page you're looking for doesn't exist.
      </p>
      <Link to="/" className="btn-primary px-6 py-3 rounded-full text-lg">
        Go to Homepage
      </Link>
    </div>
  );
};

export default NotFoundPage;