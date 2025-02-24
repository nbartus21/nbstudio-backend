import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertTriangle, Info, Server } from 'lucide-react';
import { api } from '../services/auth';

const NotificationsManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const API_URL = 'https://admin.nb-studio.net:5001/api';

  useEffect(() => {
    // Click-en-kívül kezelő
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllNotifications = async () => {
    try {
      const [contacts, calculators, domains, servers, licenses, projects] = await Promise.all([
        api.get(`${API_URL}/contacts`).then(res => res.json()),
        api.get(`${API_URL}/calculators`).then(res => res.json()),
        api.get(`${API_URL}/domains`).then(res => res.json()),
        api.get(`${API_URL}/servers`).then(res => res.json()),
        api.get(`${API_URL}/licenses`).then(res => res.json()),
        api.get(`${API_URL}/projects`).then(res => res.json())
      ]);

      const newNotifications = [];

      // Kapcsolat űrlapok értesítései
      if (Array.isArray(contacts)) {
        contacts
          .filter(contact => contact.status === 'new')
          .forEach(contact => {
            newNotifications.push({
              _id: `contact_${contact._id}`,
              title: 'Új kapcsolatfelvétel',
              message: `${contact.name} üzenetet küldött: ${contact.subject}`,
              severity: 'info',
              createdAt: contact.createdAt,
              type: 'contact',
              link: '/contacts'
            });
          });
      }

      // Kalkulátor értesítések
      if (Array.isArray(calculators)) {
        calculators
          .filter(calc => calc.status === 'new')
          .forEach(calc => {
            newNotifications.push({
              _id: `calculator_${calc._id}`,
              title: 'Új kalkulátor jelentkezés',
              message: `Új ${calc.projectType} projektre érkezett kalkuláció`,
              severity: 'info',
              createdAt: calc.createdAt,
              type: 'calculator',
              link: '/calculator'
            });
          });
      }

      // Domain lejárati értesítések
      if (Array.isArray(domains)) {
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
      }

      // Szerver státusz értesítések
      if (Array.isArray(servers)) {
        servers.forEach(server => {
          if (server.status === 'maintenance' || server.status === 'offline') {
            newNotifications.push({
              _id: `server_${server._id}`,
              title: 'Szerver probléma',
              message: `A ${server.name} szerver ${server.status === 'maintenance' ? 'karbantartás alatt' : 'offline'}`,
              severity: 'error',
              createdAt: server.updatedAt,
              type: 'server',
              link: '/infrastructure'
            });
          }
        });
      }

      // Licensz értesítések
      if (Array.isArray(licenses)) {
        licenses.forEach(license => {
          if (license.renewal?.nextRenewalDate) {
            const daysUntilRenewal = Math.ceil(
              (new Date(license.renewal.nextRenewalDate) - new Date()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntilRenewal <= 30 && daysUntilRenewal > 0) {
              newNotifications.push({
                _id: `license_${license._id}`,
                title: 'Licensz megújítás',
                message: `A ${license.name} licensz ${daysUntilRenewal} nap múlva lejár`,
                severity: daysUntilRenewal <= 7 ? 'warning' : 'info',
                createdAt: new Date().toISOString(),
                type: 'license',
                link: '/infrastructure'
              });
            }
          }
        });
      }

      // Projekt értesítések
      if (Array.isArray(projects)) {
        projects.forEach(project => {
          const hasDelayedMilestones = (project.milestones || []).some(
            milestone => milestone.status === 'késedelmes'
          );
          if (project.priority === 'magas' || hasDelayedMilestones) {
            newNotifications.push({
              _id: `project_${project._id}`,
              title: 'Sürgős projekt',
              message: hasDelayedMilestones 
                ? `A "${project.name}" projektben késésben lévő milestone-ok vannak`
                : `A "${project.name}" projekt magas prioritású`,
              severity: 'warning',
              createdAt: project.updatedAt,
              type: 'project',
              link: '/projects'
            });
          }
        });
      }

      // Rendezés dátum szerint
      newNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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

  const getIcon = (severity, type) => {
    if (type === 'server') {
      return <Server className={`w-5 h-5 ${
        severity === 'error' ? 'text-red-500' : 
        severity === 'warning' ? 'text-yellow-500' : 
        'text-blue-500'
      }`} />;
    }
    
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
    <div className="relative" ref={dropdownRef}>
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
                <a
                  key={notification._id}
                  href={notification.link}
                  className="block border-b hover:bg-gray-50"
                >
                  <div className="p-4 flex items-start gap-3">
                    {getIcon(notification.severity, notification.type)}
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