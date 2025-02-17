import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, Info } from 'lucide-react';

const NotificationsManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

  const API_URL = 'https://admin.nb-studio.net:5001/api';

  // Helper function to process API responses
  const processData = (data, type) => {
    if (!Array.isArray(data)) {
      console.error(`Invalid ${type} data received:`, data);
      return [];
    }
    return data;
  };

  // Notification permission request
  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setHasNotificationPermission(permission === 'granted');
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Browser notification
  const sendBrowserNotification = (title, body) => {
    if (!hasNotificationPermission) return;

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'nb-studio-notification'
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      setIsOpen(true);
    };
  };

  const fetchAllNotifications = async () => {
    try {
      const [contacts, calculators, domains, servers, licenses, projects] = await Promise.all([
        fetch(`${API_URL}/contacts`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(res => res.json()),
        fetch(`${API_URL}/calculators`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(res => res.json()),
        fetch(`${API_URL}/domains`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(res => res.json()),
        fetch(`${API_URL}/servers`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(res => res.json()),
        fetch(`${API_URL}/licenses`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(res => res.json()),
        fetch(`${API_URL}/projects`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(res => res.json())
      ]);

      // Process data to ensure it's in array format
      const processedContacts = processData(contacts, 'contacts');
      const processedCalculators = processData(calculators, 'calculators');
      const processedDomains = processData(domains, 'domains');
      const processedServers = processData(servers, 'servers');
      const processedLicenses = processData(licenses, 'licenses');
      const processedProjects = processData(projects, 'projects');

      const newNotifications = [];

      // Process new contacts
      processedContacts
        .filter(contact => contact.status === 'new')
        .forEach(contact => {
          const notification = {
            _id: `contact_${contact._id}`,
            title: 'Új kapcsolatfelvétel',
            message: `${contact.name} üzenetet küldött: ${contact.subject}`,
            severity: 'info',
            createdAt: contact.createdAt,
            type: 'contact',
            link: '/contacts'
          };
          newNotifications.push(notification);
          sendBrowserNotification('Új kapcsolatfelvétel', `${contact.name} üzenetet küldött`);
        });

      // Process new calculator entries
      processedCalculators
        .filter(calc => calc.status === 'new')
        .forEach(calc => {
          const notification = {
            _id: `calculator_${calc._id}`,
            title: 'Új kalkulátor jelentkezés',
            message: `Új ${calc.projectType} projektre érkezett kalkuláció`,
            severity: 'info',
            createdAt: calc.createdAt,
            type: 'calculator',
            link: '/calculator'
          };
          newNotifications.push(notification);
          sendBrowserNotification('Új kalkuláció', `Új ${calc.projectType} projektre érkezett kalkuláció`);
        });

      // Process domain expiry warnings
      processedDomains.forEach(domain => {
        const daysUntilExpiry = Math.ceil((new Date(domain.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          const notification = {
            _id: `domain_${domain._id}`,
            title: 'Domain lejárat',
            message: `A ${domain.name} domain ${daysUntilExpiry} nap múlva lejár`,
            severity: daysUntilExpiry <= 7 ? 'error' : 'warning',
            createdAt: new Date().toISOString(),
            type: 'domain',
            link: '/domains'
          };
          newNotifications.push(notification);
          if (daysUntilExpiry <= 7) {
            sendBrowserNotification('Sürgős domain lejárat', `A ${domain.name} domain ${daysUntilExpiry} nap múlva lejár!`);
          }
        }
      });

      // Process server issues
      processedServers.forEach(server => {
        if (server.status === 'maintenance' || server.status === 'offline') {
          const notification = {
            _id: `server_${server._id}`,
            title: 'Szerver probléma',
            message: `A ${server.name} szerver ${server.status === 'maintenance' ? 'karbantartás alatt' : 'offline'}`,
            severity: 'error',
            createdAt: server.updatedAt,
            type: 'server',
            link: '/infrastructure'
          };
          newNotifications.push(notification);
          sendBrowserNotification('Szerver probléma', `A ${server.name} szerver ${server.status === 'maintenance' ? 'karbantartás alatt' : 'offline'}`);
        }
      });

      // Sort notifications by date
      newNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.length);

    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Initialization
  useEffect(() => {
    if ('Notification' in window) {
      setHasNotificationPermission(Notification.permission === 'granted');
    }

    fetchAllNotifications();

    const interval = setInterval(fetchAllNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (notificationId) => {
    setNotifications(prev => prev.filter(n => n._id !== notificationId));
    setUnreadCount(prev => prev - 1);
  };

  const handleDismissAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getIcon = (severity) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {!hasNotificationPermission && (
        <button
          onClick={requestNotificationPermission}
          className="absolute top-full right-0 mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded shadow-lg whitespace-nowrap"
        >
          Értesítések engedélyezése
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">Értesítések</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleDismissAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Összes elrejtése
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Nincsenek új értesítések
              </div>
            ) : (
              notifications.map((notification) => (
                <a
                  key={notification._id}
                  href={notification.link}
                  className="block border-b hover:bg-gray-50"
                >
                  <div className="p-4 flex items-start gap-3">
                    {getIcon(notification.severity)}
                    <div className="flex-1">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm text-gray-600">{notification.message}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDismiss(notification._id);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsManager;