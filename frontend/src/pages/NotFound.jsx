import React from 'react';
import { Link } from 'react-router-dom';
import { Home, LayoutDashboard } from 'lucide-react';

const NotFound = () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const dashboard =
    token && role === 'HOST' ? '/host/dashboard' :
    token && role === 'CANDIDATE' ? '/candidate/dashboard' : null;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <p className="font-display text-7xl sm:text-8xl text-brand-500 mb-4">404</p>
        <h1 className="font-display text-2xl sm:text-3xl text-secondary-900 mb-3">
          This page doesn't exist
        </h1>
        <p className="text-secondary-600 mb-8 leading-relaxed">
          The link may be broken or the page may have been moved. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {dashboard && (
            <Link
              to={dashboard}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> Go to my dashboard
            </Link>
          )}
          <Link
            to="/"
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md font-medium transition-colors ${
              dashboard
                ? 'border border-secondary-300 text-secondary-700 hover:bg-secondary-100'
                : 'bg-brand-500 text-white hover:bg-brand-600'
            }`}
          >
            <Home className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
