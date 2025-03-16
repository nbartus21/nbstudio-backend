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
      category: "Blog kezelés",
      icon: <BookOpen size={18} />,
      items: [
        { path: "/blog", label: "Blog bejegyzések listája", icon: <FileText size={16} /> },
        { path: "/blog/new", label: "Új bejegyzés létrehozása", icon: <PlusCircle size={16} /> }
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
        { path: "/infrastructure", label: "Infrastruktúra Kezelő", icon: <Server size={16} /> },
        { path: "/hosting", label: "Hosting Kezelő", icon: <Database size={16} /> },
        { path: "/accounting", label: "Könyvelés", icon: <DollarSign size={16} /> },
        { path: "/support", label: "Support Ticketek", icon: <MessageCircle size={16} /> },
        { path: "/ai-chat", label: "AI Asszisztens", icon: <MessageCircle size={16} /> }
      ]
    }
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
      {/* Fő navigációs sáv */}
      <nav className="bg-gradient-to-r from-gray-900 to-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo és Dashboard link */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center text-white text-xl font-bold hover:text-blue-300 transition-colors">
                <Home className="mr-2" size={24} />
                <span className="hidden sm:block">NB-Studio</span>
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-1">
              {menuItems.map((category, idx) => (
                <div 
                  key={idx} 
                  className="relative group"
                  onMouseEnter={() => setActiveDropdown(idx)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button 
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isCategoryActive(category.items) 
                        ? 'text-white bg-gray-700' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.category}
                    <ChevronDown className="ml-1" size={16} />
                  </button>
                  <div 
                    className={`
                      absolute left-0 mt-2 w-60 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 transition-all duration-200
                      ${activeDropdown === idx ? 'opacity-100 visible' : 'opacity-0 invisible'}
                    `}
                  >
                    <div className="py-1">
                      {category.items.map((item, itemIdx) => (
                        <Link
                          key={itemIdx}
                          to={item.path}
                          className={`flex items-center px-4 py-2 text-sm ${
                            isActive(item.path)
                              ? 'bg-gray-100 text-blue-600 font-medium'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                          }`}
                        >
                          <span className="mr-2 text-gray-500">{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gyorselérési gombok és felhasználói menü */}
            <div className="flex items-center gap-2">
              {/* Keresés gomb */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                title="Keresés"
              >
                <Search size={20} />
              </button>

              {/* Értesítések */}
              <NotificationsManager />

              {/* Súgó */}
              <Link
                to="/help"
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                title="Súgó"
              >
                <HelpCircle size={20} />
              </Link>

              {/* Beállítások */}
              <Link
                to="/settings"
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                title="Beállítások"
              >
                <Settings size={20} />
              </Link>

              {/* Kijelentkezés */}
              <button
                onClick={handleLogout}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                title="Kijelentkezés"
              >
                <LogOut size={20} />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-300 hover:text-white rounded-md"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Keresési panel */}
        {isSearchOpen && (
          <div className="bg-gray-800 py-2 px-4">
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full bg-gray-700 border-0 rounded-md py-2 pl-10 pr-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Keresés funkciók között..."
                  autoFocus
                />
              </div>
            </form>
          </div>
        )}
      </nav>

      {/* Mobil menü */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {menuItems.map((category, categoryIdx) => (
              <div key={categoryIdx} className="space-y-1 pb-2">
                <div 
                  className="flex items-center justify-between text-gray-300 px-3 py-2 rounded-md text-base font-medium cursor-pointer hover:bg-gray-700 hover:text-white"
                  onClick={() => handleDropdownToggle(categoryIdx)}
                >
                  <div className="flex items-center">
                    <span className="mr-2">{category.icon}</span>
                    {category.category}
                  </div>
                  <ChevronDown 
                    className={`transition-transform duration-200 ${activeDropdown === categoryIdx ? 'transform rotate-180' : ''}`} 
                    size={18} 
                  />
                </div>
                
                {activeDropdown === categoryIdx && (
                  <div className="pl-8 space-y-1">
                    {category.items.map((item, itemIdx) => (
                      <Link
                        key={itemIdx}
                        to={item.path}
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                          isActive(item.path)
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
                )}
              </div>
            ))}
          </div>

          {/* Legutóbb meglátogatott oldalak mobil nézeten */}
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
      )}

      {/* Legutóbb meglátogatott oldalak sáv - csak desktop nézeten */}
      {recentPages.length > 0 && (
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
      )}

      {/* Egyedi CSS a görgetősáv elrejtéséhez */}
      <style dangerouslySetInnerHTML={{
  __html: `
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `
}} />
    </>
  );
};

export default Navigation;