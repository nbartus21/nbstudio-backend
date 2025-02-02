// Navigation.js
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import NotificationsManager from './NotificationsManager';
import classNames from 'classnames';

const Navigation = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Menü elemek struktúrája
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

  // Aktív útvonal ellenőrzése
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-gray-800 text-white">
      {/* Fejléc */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo és cím */}
          <div className="flex items-center">
            <span className="text-xl font-bold">NB Studio Admin</span>
          </div>

          {/* Desktop menü */}
          <div className="hidden md:block">
            <DesktopMenu menuItems={menuItems} isActive={isActive} />
          </div>

          {/* Értesítések és Kijelentkezés gomb */}
          <div className="flex items-center gap-4">
            <NotificationsManager />
            <LogoutButton />
          </div>

          {/* Mobil menü gomb */}
          <MobileMenuButton isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
        </div>
      </div>

      {/* Mobil menü */}
      {isMenuOpen && (
        <MobileMenu menuItems={menuItems} isActive={isActive} />
      )}
    </nav>
  );
};

// Desktop menü komponens
const DesktopMenu = ({ menuItems, isActive }) => (
  <div className="ml-10 flex space-x-8">
    {menuItems.map((category, idx) => (
      <DropdownMenu key={idx} category={category} isActive={isActive} />
    ))}
  </div>
);

// Dropdown menü komponens
const DropdownMenu = ({ category, isActive }) => (
  <div className="relative group">
    <button className="px-3 py-2 text-gray-300 hover:text-white">
      {category.category}
    </button>
    <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
      <div className="py-1">
        {category.items.map((item, itemIdx) => (
          <Link
            key={itemIdx}
            to={item.path}
            className={classNames(
              'block px-4 py-2 text-sm',
              isActive(item.path) ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  </div>
);

// Kijelentkezés gomb komponens
const LogoutButton = () => (
  <button
    onClick={() => {
      sessionStorage.removeItem('isAuthenticated');
      window.location.href = '/login';
    }}
    className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
  >
    Kijelentkezés
  </button>
);

// Mobil menü gomb komponens
const MobileMenuButton = ({ isMenuOpen, setIsMenuOpen }) => (
  <button
    onClick={() => setIsMenuOpen(!isMenuOpen)}
    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white md:hidden"
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
);

// Mobil menü komponens
const MobileMenu = ({ menuItems, isActive }) => (
  <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
    {menuItems.map((category, categoryIdx) => (
      <div key={categoryIdx} className="space-y-1">
        <div className="px-3 py-2 text-gray-300 font-medium">{category.category}</div>
        {category.items.map((item, itemIdx) => (
          <Link
            key={itemIdx}
            to={item.path}
            className={classNames(
              'block px-3 py-2 rounded-md text-base font-medium',
              isActive(item.path) ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    ))}
  </div>
);

export default Navigation;