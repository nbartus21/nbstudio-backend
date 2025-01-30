import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    {
      category: "Blog kezelés",
      items: [
        { path: "/blog", label: "Blog bejegyzések listája" },
        { path: "/blog/new", label: "Új bejegyzés létrehozása" }
      ]
    },
    {
      category: "Ügyfelek",
      items: [
        { path: "/contacts", label: "Kapcsolatfelvételek" },
        { path: "/calculator", label: "Kalkulátor jelentkezések" }
      ]
    },
    {
        category: "Projektek",
        items: [
          { path: "/projects", label: "Projekt kezelő" }
        ]
    },
    {
      category: "Eszközök",
      items: [
        { path: "/domains", label: "Domain Kezelő" }
        // ... egyéb eszközök ...
      ]
    }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-white text-xl font-bold">NB Studio Admin</span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                {menuItems.map((category, idx) => (
                  <div key={idx} className="relative group">
                    <button className="px-3 py-2 text-gray-300 hover:text-white">
                      {category.category}
                    </button>
                    <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="py-1">
                        {category.items.map((item, itemIdx) => (
                          <Link
                            key={itemIdx}
                            to={item.path}
                            className={`block px-4 py-2 text-sm ${
                              isActive(item.path)
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <div className="flex items-center">
            <button
              onClick={() => {
                sessionStorage.removeItem('isAuthenticated');
                window.location.href = '/login';
              }}
              className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
            >
              Kijelentkezés
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
            >
              <span className="sr-only">Főmenü megnyitása</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {menuItems.map((category, categoryIdx) => (
              <div key={categoryIdx} className="space-y-1">
                <div className="px-3 py-2 text-gray-300 font-medium">
                  {category.category}
                </div>
                {category.items.map((item, itemIdx) => (
                  <Link
                    key={itemIdx}
                    to={item.path}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      isActive(item.path)
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;