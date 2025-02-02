import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import NotificationsManager from './NotificationsManager';

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
        { path: "/projects", label: "Projekt kezelő" },
        { path: "/invoices", label: "Számla Kezelő" }
      ]
    },
    {
      category: "Eszközök",
      items: [
        { path: "/domains", label: "Domain Kezelő" },
        { path: "/infrastructure", label: "Infrastruktúra Kezelő" },
        { path: "/accounting", label: "Könyvelés" }
      ]
    }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-gray-900 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="text-white text-xl font-bold">NB Studio Admin</div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8">
            {menuItems.map((category, idx) => (
              <div key={idx} className="relative group">
                <button className="text-gray-300 hover:text-white transition">
                  {category.category}
                </button>
                <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-2">
                    {category.items.map((item, itemIdx) => (
                      <Link
                        key={itemIdx}
                        to={item.path}
                        className={`block px-4 py-2 text-sm ${
                          isActive(item.path)
                            ? 'bg-gray-200 text-gray-900'
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

          {/* Notifications and Logout */}
          <div className="flex items-center gap-4">
            <NotificationsManager />
            <button
              onClick={() => {
                sessionStorage.removeItem('isAuthenticated');
                window.location.href = '/login';
              }}
              className="text-gray-300 hover:text-white flex items-center gap-1 transition"
            >
              <LogOut size={18} />
              Kijelentkezés
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white transition"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-800">
          <div className="px-4 py-3 space-y-1">
            {menuItems.map((category, categoryIdx) => (
              <div key={categoryIdx} className="space-y-1">
                <div className="text-gray-400 font-semibold uppercase text-sm py-2">
                  {category.category}
                </div>
                {category.items.map((item, itemIdx) => (
                  <Link
                    key={itemIdx}
                    to={item.path}
                    className={`block px-4 py-2 rounded-md text-base font-medium ${
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
