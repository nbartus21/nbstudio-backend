import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, Info } from 'lucide-react';

const NotificationsManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAllNotifications = async () => {
    try {
      // Fetch from all endpoints
      const contactsRes = await fetch('http://38.242.208.190:5001/api/contacts');
      const contacts = await contactsRes.json();
      
      const calculatorsRes = await fetch('http://38.242.208.190:5001/api/calculators');
      const calculators = await calculatorsRes.json();
      
      const domainsRes = await fetch('http://38.242.208.190:5001/api/domains');
      const domains = await domainsRes.json();
      
      let newNotifications = [];

      // Process contacts
      console.log('Beérkező kontaktok:', contacts); // Debug log
      contacts.forEach(contact => {
        // Ha nincs státusz vagy 'new' státuszú
        if (!contact.status || contact.status === 'new') {
          newNotifications.push({
            _id: `contact_${contact._id}`,
            title: 'Új kapcsolatfelvétel',
            message: `${contact.name} üzenetet küldött: ${contact.subject}`,
            severity: 'info',
            createdAt: contact.createdAt || new Date().toISOString(),
            type: 'contact',
            link: '/contacts'
          });
        }
      });

      // Process calculators
      calculators.forEach(calc => {
        if (!calc.status || calc.status === 'new') {
          newNotifications.push({
            _id: `calculator_${calc._id}`,
            title: 'Új kalkulátor jelentkezés',
            message: `Új ${calc.projectType} projektre érkezett kalkuláció`,
            severity: 'info',
            createdAt: calc.createdAt || new Date().toISOString(),
            type: 'calculator',
            link: '/calculator'
          });
        }
      });

      // Process domains
      domains.forEach(domain => {
        const daysUntilExpiry = Math.ceil(
          (new Date(domain.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          newNotifications.push({
            _id: `domain_${domain._id}`,
            title: 'Domain lejárat',
            message: `A ${domain.name} domain ${daysUntilExpiry} nap múlva lejár`,
            severity: daysUntilExpiry <= 7 ? 'error' : 'warning',
            createdAt: new Date().toISOString(),
            type: 'domain',
            link: '/domains'
          });
        }
      });

      // Sort by date and update state
      newNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      console.log('Feldolgozott értesítések:', newNotifications); // Debug log
      
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
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
                <div
                  key={notification._id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
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
                      onClick={() => handleDismiss(notification._id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsManager;