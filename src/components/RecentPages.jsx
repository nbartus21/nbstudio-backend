import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock } from 'lucide-react';

const RecentPages = ({ recentPages }) => {
  const location = useLocation();

  if (!recentPages || recentPages.length === 0) return null;

  return (
    <div className="hidden md:block bg-gray-100 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center py-1 text-sm">
          <span className="text-gray-500 mr-2 flex items-center">
            <Clock size={14} className="mr-1" /> Legutóbb megtekintett:
          </span>
          <div className="flex items-center space-x-4 overflow-x-auto hide-scrollbar">
            {recentPages.map((page, idx) => (
              <Link
                key={idx}
                to={page.path}
                className={`whitespace-nowrap px-2 py-1 rounded ${
                  location.pathname === page.path
                    ? 'text-blue-600 font-medium'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                {page.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentPages; 