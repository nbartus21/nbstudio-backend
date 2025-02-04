import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, AlertTriangle } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    contacts: 0,
    calculator: 0,
    domains: 0,
    servers: 0,
    licenses: 0,
    projects: 0
  });

  // Fetch notifications count
  const fetchNotifications = async () => {
    try {
      // Fetch contacts with 'new' status
      const contactsResponse = await fetch('http://38.242.208.190:5001/api/contacts');
      const contactsData = await contactsResponse.json();
      const newContacts = contactsData.filter(contact => contact.status === 'new').length;

      // Fetch calculators with 'new' status
      const calculatorsResponse = await fetch('http://38.242.208.190:5001/api/calculators');
      const calculatorsData = await calculatorsResponse.json();
      const newCalculators = calculatorsData.filter(calc => calc.status === 'new').length;

      // Fetch domains expiring soon (next 30 days)
      const domainsResponse = await fetch('http://38.242.208.190:5001/api/domains');
      const domainsData = await domainsResponse.json();
      const expiringDomains = domainsData.filter(domain => {
        const daysUntilExpiry = Math.ceil(
          (new Date(domain.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      }).length;

      // Fetch servers with issues
      const serversResponse = await fetch('http://38.242.208.190:5001/api/servers');
      const serversData = await serversResponse.json();
      const serverIssues = serversData.filter(server => 
        server.status === 'maintenance' || 
        server.status === 'offline' ||
        (server.monitoring?.alerts || []).some(alert => !alert.resolved)
      ).length;

      // Fetch expiring licenses
      const licensesResponse = await fetch('http://38.242.208.190:5001/api/licenses');
      const licensesData = await licensesResponse.json();
      const expiringLicenses = licensesData.filter(license => {
        if (!license.renewal?.nextRenewalDate) return false;
        const daysUntilRenewal = Math.ceil(
          (new Date(license.renewal.nextRenewalDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilRenewal <= 30 && daysUntilRenewal > 0;
      }).length;

      // Fetch projects with high priority or delayed milestones
      const projectsResponse = await fetch('http://38.242.208.190:5001/api/projects');
      const projectsData = await projectsResponse.json();
      const urgentProjects = projectsData.filter(project => {
        const hasDelayedMilestones = (project.milestones || []).some(milestone => 
          milestone.status === 'késedelmes'
        );
        return project.priority === 'magas' || hasDelayedMilestones;
      }).length;

      setNotifications({
        contacts: newContacts,
        calculator: newCalculators,
        domains: expiringDomains,
        servers: serverIssues,
        licenses: expiringLicenses,
        projects: urgentProjects
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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
        { 
          path: "/contacts", 
          label: "Kapcsolatfelvételek",
          notifications: notifications.contacts,
          tooltip: "Új kapcsolatfelvételek"
        },
        { 
          path: "/calculator", 
          label: "Kalkulátor jelentkezések",
          notifications: notifications.calculator,
          tooltip: "Új kalkulátor jelentkezések"
        }
      ]
    },
    {
      category: "Projektek",
      items: [
        { 
          path: "/projects", 
          label: "Projekt kezelő",
          notifications: notifications.projects,
          tooltip: "Sürgős vagy késésben lévő projektek"
        }
      ]
    },
    {
      category: "Infrastruktúra",
      items: [
        { 
          path: "/domains", 
          label: "Domain Kezelő",
          notifications: notifications.domains,
          tooltip: "Hamarosan lejáró domainek"
        },
        { 
          path: "/infrastructure", 
          label: "Infrastruktúra Kezelő",
          notifications: notifications.servers + notifications.licenses,
          tooltip: "Szerver problémák és lejáró licenszek"
        }
      ]
    }
  ];

  const isActive = (path) => location.pathname === path;

  const NotificationBadge = ({ count, tooltip }) => {
    if (!count) return null;
    
    return (
      <div className="relative group">
        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
          {count}
        </span>
        {tooltip && (
          <div className="absolute z-50 invisible group-hover:visible bg-black text-white text-xs rounded py-1 px-2 -right-2 transform translate-x-full">
            {tooltip}
          </div>
        )}
      </div>
    );
  };

  const NotificationDetails = () => {
    const totalNotifications = Object.values(notifications).reduce((a, b) => a + b, 0);
    if (!totalNotifications) return null;

    return (
      <div className="relative group">
        <div className="relative">
          <Bell className="h-6 w-6 text-gray-300 hover:text-white cursor-pointer" />
          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {totalNotifications}
          </span>
        </div>
        
        <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 invisible group-hover:visible z-50">
          <div className="py-2">
            {notifications.contacts > 0 && (
              <div className="px-4 py-2 text-sm text-gray-700 flex justify-between items-center">
                <span>Új kapcsolatfelvétel</span>
                <span className="font-bold">{notifications.contacts}</span>
              </div>
            )}
            {notifications.calculator > 0 && (
              <div className="px-4 py-2 text-sm text-gray-700 flex justify-between items-center">
                <span>Új kalkuláció</span>
                <span className="font-bold">{notifications.calculator}</span>
              </div>
            )}
            {notifications.domains > 0 && (
              <div className="px-4 py-2 text-sm text-gray-700 flex justify-between items-center">
                <span>Lejáró domain</span>
                <span className="font-bold">{notifications.domains}</span>
              </div>
            )}
            {notifications.servers > 0 && (
              <div className="px-4 py-2 text-sm text-gray-700 flex justify-between items-center">
                <span>Szerver probléma</span>
                <span className="font-bold">{notifications.servers}</span>
              </div>
            )}
            {notifications.licenses > 0 && (
              <div className="px-4 py-2 text-sm text-gray-700 flex justify-between items-center">
                <span>Lejáró licensz</span>
                <span className="font-bold">{notifications.licenses}</span>
              </div>
            )}
            {notifications.projects > 0 && (
              <div className="px-4 py-2 text-sm text-gray-700 flex justify-between items-center">
                <span>Sürgős projekt</span>
                <span className="font-bold">{notifications.projects}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
                            } flex justify-between items-center`}
                          >
                            {item.label}
                            {item.notifications > 0 && (
                              <NotificationBadge 
                                count={item.notifications} 
                                tooltip={item.tooltip}
                              />
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notification Bell and Logout */}
          <div className="flex items-center space-x-4">
            <NotificationDetails />
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
                    } flex justify-between items-center`}
                  >
                    {item.label}
                    {item.notifications > 0 && (
                      <NotificationBadge 
                        count={item.notifications} 
                        tooltip={item.tooltip}
                      />
                    )}
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