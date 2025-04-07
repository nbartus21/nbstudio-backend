import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, LogOut, Menu, X, ChevronDown, Settings, Search,
  User, Home, Calendar, BookOpen, Globe,
  Server, Database, Calculator, Mail, FileText, Clock,
  DollarSign, PlusCircle, Languages, MessageCircle, HelpCircle
} from 'lucide-react';
import NotificationsManager from './NotificationsManager';
import RecentPages from './RecentPages';
import SearchBar from './SearchBar';
import MobileMenu from './MobileMenu';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentPages, setRecentPages] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    const savedPages = JSON.parse(localStorage.getItem('recentPages') || '[]');
    setRecentPages(savedPages);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/' && location.pathname !== '/dashboard') {
      const currentPages = JSON.parse(localStorage.getItem('recentPages') || '[]');
      const filtered = currentPages.filter(page => page.path !== location.pathname);
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

  const getPageTitle = (path) => {
    const allMenuItems = menuItems.flatMap(category => category.items);
    const item = allMenuItems.find(item => item.path === path);
    return item ? item.label : path;
  };

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
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    const allItems = menuItems.flatMap(category => category.items);
    const matchingItem = allItems.find(item => item.label.toLowerCase().includes(searchTerm.toLowerCase()));
    if (matchingItem) {
      navigate(matchingItem.path);
      setSearchTerm('');
      setIsSearchOpen(false);
    } else {
      setSearchTerm('');
      setIsSearchOpen(false);
    }
  };

  return (
    <>
      <nav className="bg-gradient-to-r from-gray-900 to-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center text-white text-xl font-bold hover:text-blue-300 transition-colors">
              <Home className="mr-2" size={24} />
              <span className="hidden sm:block">NB-Studio</span>
            </Link>
            <div className="hidden md:flex space-x-1">
              {menuItems.map((category, idx) => (
                <div key={idx} className="relative group">
                  <button className="flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    <span className="mr-2">{category.icon}</span>
                    {category.category}
                    <ChevronDown className="ml-1" size={16} />
                  </button>
                  <div className="absolute left-0 mt-2 w-60 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    {category.items.map((item, itemIdx) => (
                      <Link key={itemIdx} to={item.path} className="flex items-center px-4 py-2 text-sm">
                        <span className="mr-2 text-gray-500">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <SearchBar
                isSearchOpen={isSearchOpen}
                setIsSearchOpen={setIsSearchOpen}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                handleSearch={handleSearch}
              />
              <NotificationsManager />
              <Link to="/help" className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors">
                <HelpCircle size={20} />
              </Link>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-gray-300 hover:text-white rounded-md">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>
      <MobileMenu
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        menuItems={menuItems}
        recentPages={recentPages}
      />
      <RecentPages recentPages={recentPages} />
    </>
  );
};

export default Navigation;