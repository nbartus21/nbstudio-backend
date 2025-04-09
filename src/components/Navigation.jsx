import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, LogOut, Menu, X, ChevronDown, Settings, Search,
  User, Home, Calendar, BookOpen, Globe,
  Server, Database, Calculator, Mail, FileText, Clock,
  DollarSign, PlusCircle, Languages, MessageCircle, HelpCircle
} from 'lucide-react';
import NotificationsManager from './NotificationsManager';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentPages, setRecentPages] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Kezeljük a felhasználó által legutóbb meglátogatott oldalakat
  useEffect(() => {
    // Csak akkor tároljuk el, ha ez egy valódi oldal, nem a főoldal
    if (location.pathname !== '/' && location.pathname !== '/dashboard') {
      const currentPages = JSON.parse(localStorage.getItem('recentPages') || '[]');
      // Nézzük meg, hogy az aktuális oldal már szerepel-e a listában
      const filtered = currentPages.filter(page => page.path !== location.pathname);

      // Hozzáadjuk az aktuális oldalt a lista elejéhez, és csak az első 5-öt tartjuk meg
      const updatedPages = [
        {
          path: location.pathname,
          title: getPageTitle(location.pathname),
          timestamp: new Date().getTime()
        },
        ...filtered
      ].slice(0, 5);

      localStorage.setItem('recentPages', JSON.stringify(updatedPages));
      setRecentPages(updatedPages);
    }
  }, [location.pathname]);

  // Oldal betöltésekor lekérjük a mentett oldalakat
  useEffect(() => {
    const savedPages = JSON.parse(localStorage.getItem('recentPages') || '[]');
    setRecentPages(savedPages);
  }, []);

  // Oldal címének meghatározása az útvonal alapján
  const getPageTitle = (path) => {
    // Speciális útvonalak kezelése
    if (path === "/help") {
      return "Súgó és támogatás";
    }

    const allMenuItems = menuItems.flatMap(category => category.items);
    const item = allMenuItems.find(item => item.path === path);
    return item ? item.label : path;
  };

  // Menüelemek rendszerezése
  const menuItems = [
    {
      category: "Tartalom kezelés",
      icon: <BookOpen size={18} />,
      items: [
        { path: "/blog", label: "Blog bejegyzések listája", icon: <FileText size={16} /> },
        { path: "/partners", label: "Partnerek kezelése", icon: <Globe size={16} /> },
        { path: "/webpages", label: "Oldalak szerkesztése", icon: <FileText size={16} /> }
      ]
    },
    {
      category: "Ügyfelek",
      icon: <User size={18} />,
      items: [
        { path: "/contacts", label: "Kapcsolatfelvételek", icon: <Mail size={16} /> },
        { path: "/calculator", label: "Kalkulátor jelentkezések", icon: <Calculator size={16} /> },
        { path: "/translation", label: "Fordítási Eszköz", icon: <Languages size={16} /> }
      ]
    },
    {
      category: "Projektek",
      icon: <Calendar size={18} />,
      items: [
        { path: "/projects", label: "Projekt kezelő", icon: <FileText size={16} /> },
        { path: "/invoices", label: "Számla Kezelő", icon: <DollarSign size={16} /> },
        { path: "/documents", label: "Dokumentumok", icon: <FileText size={16} /> }
      ]
    },
    {
      category: "Szolgáltatások",
      icon: <Server size={18} />,
      items: [
        { path: "/domains", label: "Domain Kezelő", icon: <Globe size={16} /> },
        { path: "/hosting", label: "Hosting Kezelő", icon: <Database size={16} /> },
        { path: "/accounting", label: "Könyvelés", icon: <DollarSign size={16} /> },
        { path: "/support", label: "Support Ticketek", icon: <MessageCircle size={16} /> }
      ]
    },
    // Rendszer menüpont eltávolítva
  ];

  // Ellenőrzi, hogy az adott útvonal aktív-e
  const isActive = (path) => location.pathname === path;

  // Ellenőrzi, hogy az adott kategória tartalmazza-e az aktív útvonalat
  const isCategoryActive = (items) => {
    return items.some(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));
  };

  // Keresés az alkalmazásban
  const handleSearch = (e) => {
    e.preventDefault();

    // Az összes menüelem összegyűjtése
    const allItems = menuItems.flatMap(category => category.items);

    // Keresés a menüelemek között
    const matchingItem = allItems.find(item =>
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (matchingItem) {
      navigate(matchingItem.path);
      setSearchTerm('');
      setIsSearchOpen(false);
    } else {
      // Ha nincs találat, egyszerűen becsukjuk a keresőt
      setSearchTerm('');
      setIsSearchOpen(false);
    }
  };

  // Kezelő a dropdown menük megjelenítéséhez
  const handleDropdownToggle = (index) => {
    if (activeDropdown === index) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(index);
    }
  };

  // Kijelentkezés kezelése
  const handleLogout = () => {
    if (window.confirm('Biztosan ki szeretnél jelentkezni?')) {
      sessionStorage.removeItem('isAuthenticated');
      localStorage.removeItem('recentPages');
      window.location.href = '/login';
    }
  };

  return (
    <>
      {/* Felső navigációs sáv */}
      <nav className="bg-gray-900 shadow-lg relative z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-16">
          {/* Bal oldal: Logo */}
          <Link to="/dashboard" className="flex items-center text-white font-bold text-xl hover:text-blue-400 transition">
            <Home className="mr-2" size={24} />
            <span className="hidden sm:block">NB-Studio</span>
          </Link>

          {/* Középső: Menü desktopon */}
          <div className="hidden md:flex space-x-2">
            {menuItems.map((cat, idx) => (
              <div key={idx} className="relative group">
                <button
                  onMouseEnter={() => setActiveDropdown(idx)}
                  onMouseLeave={() => setActiveDropdown(null)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition ${
                    isCategoryActive(cat.items) ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <span className="mr-2">{cat.icon}</span>
                  {cat.category}
                  <ChevronDown size={16} className="ml-1" />
                </button>
                {/* Dropdown */}
                <div className={`absolute left-0 mt-2 w-60 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 transition-all duration-200
                  ${activeDropdown === idx ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                  <div className="py-1">
                    {cat.items.map((item, iidx) => (
                      <Link key={iidx} to={item.path}
                        className={`flex items-center px-4 py-2 text-sm ${
                          isActive(item.path) ? 'bg-gray-100 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                        }`}>
                        <span className="mr-2 text-gray-500">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Jobb oldal: ikonok */}
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="p-2 rounded-md hover:bg-gray-700 hover:text-white text-gray-300 transition" title="Keresés">
              <Search size={20} />
            </button>
            <NotificationsManager />
            <Link to="/help" className="p-2 rounded-md hover:bg-gray-700 hover:text-white text-gray-300 transition" title="Súgó">
              <HelpCircle size={20} />
            </Link>
            <Link to="/settings" className="p-2 rounded-md hover:bg-gray-700 hover:text-white text-gray-300 transition" title="Beállítások">
              <Settings size={20} />
            </Link>
            <button onClick={handleLogout} className="p-2 rounded-md hover:bg-gray-700 hover:text-white text-gray-300 transition" title="Kijelentkezés">
              <LogOut size={20} />
            </button>
            {/* Mobilmenü gomb */}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 rounded-md hover:bg-gray-700 hover:text-white text-gray-300 transition">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Kereső overlay */}
        {isSearchOpen && (
          <div className="absolute inset-x-0 top-16 bg-gray-800 py-3 px-4 z-30">
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Keresés funkciók között..."
                  className="w-full bg-gray-700 text-white rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </form>
          </div>
        )}
      </nav>

      {/* Mobilmenü slide-in */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-800 z-10">
          <div className="px-3 py-3 space-y-2">
            {menuItems.map((cat, idx) => (
              <div key={idx}>
                <div
                  onClick={() => handleDropdownToggle(idx)}
                  className="flex justify-between items-center px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                >
                  <div className="flex items-center">
                    <span className="mr-2">{cat.icon}</span>
                    {cat.category}
                  </div>
                  <ChevronDown size={18} className={`transition-transform ${activeDropdown === idx ? 'rotate-180' : ''}`} />
                </div>
                {activeDropdown === idx && (
                  <div className="pl-8 space-y-1 mt-1">
                    {cat.items.map((item, iidx) => (
                      <Link key={iidx} to={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={`block px-3 py-2 rounded-md text-sm ${
                          isActive(item.path) ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Legutóbbi oldalak mobilon */}
          {recentPages.length > 0 && (
            <div className="border-t border-gray-700 px-3 py-3">
              <h3 className="text-sm text-gray-400 mb-2">Legutóbb meglátogatott</h3>
              <div className="space-y-1">
                {recentPages.map((page, idx) => (
                  <Link key={idx} to={page.path} onClick={() => setIsMenuOpen(false)}
                    className="flex items-center px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                    <Clock size={16} className="mr-2" />
                    {page.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legutóbbi oldalak desktopon */}
      {recentPages.length > 0 && (
        <div className="hidden md:block bg-gray-100 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-1 flex items-center space-x-4 overflow-x-auto hide-scrollbar">
            <span className="flex items-center text-gray-500 text-sm">
              <Clock size={14} className="mr-1" /> Legutóbb megtekintett:
            </span>
            {recentPages.map((page, idx) => (
              <Link key={idx} to={page.path}
                className={`whitespace-nowrap px-2 py-1 rounded ${
                  location.pathname === page.path ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'
                }`}>
                {page.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Görgetősáv elrejtése */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </>
  );
};

export default Navigation;