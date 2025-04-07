import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Clock } from 'lucide-react';

const MobileMenu = ({
  isMenuOpen,
  setIsMenuOpen,
  menuItems,
  recentPages,
}) => {
  const location = useLocation();

  if (!isMenuOpen) return null;

  return (
    <div className="md:hidden bg-gray-800">
      <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
        {menuItems.map((category, categoryIdx) => (
          <div key={categoryIdx} className="space-y-1 pb-2">
            <div className="flex items-center justify-between text-gray-300 px-3 py-2 rounded-md text-base font-medium cursor-pointer hover:bg-gray-700 hover:text-white">
              <div className="flex items-center">
                <span className="mr-2">{category.icon}</span>
                {category.category}
              </div>
              <ChevronDown size={18} />
            </div>
            <div className="pl-8 space-y-1">
              {category.items.map((item, itemIdx) => (
                <Link
                  key={itemIdx}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === item.path
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      {recentPages.length > 0 && (
        <div className="border-t border-gray-700 px-3 py-3">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Legutóbb meglátogatott</h3>
          <div className="space-y-1">
            {recentPages.map((page, idx) => (
              <Link
                key={idx}
                to={page.path}
                className="flex items-center px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                <Clock className="mr-2" size={16} />
                {page.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMenu; 