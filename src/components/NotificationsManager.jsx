import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertTriangle, Info, Server, Calendar, FileText, Clock, Database, Globe, MessageCircle } from 'lucide-react';
import { api } from '../services/auth';
import { useNavigate } from 'react-router-dom';

const NotificationsManager = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  const API_URL = 'https://admin.nb-studio.net:5001/api';

  useEffect(() => {
    // Handle clicks outside dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Safe API fetch helper with error handling
  const safeApiGet = async (url) => {
    try {
      const response = await api.get(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      return []; // Return empty array on failure
    }
  };

  const fetchAllNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use Promise.allSettled to allow some API calls to fail without blocking others
      const results = await Promise.allSettled([
        safeApiGet(`${API_URL}/contacts`),
        safeApiGet(`${API_URL}/calculators`),
        safeApiGet(`${API_URL}/domains`),
        safeApiGet(`${API_URL}/servers`),
        safeApiGet(`${API_URL}/licenses`),
        safeApiGet(`${API_URL}/projects`),
        safeApiGet(`${API_URL}/files`),
        safeApiGet(`${API_URL}/comments`)
      ]);
      
      // Extract data from fulfilled promises
      const [
        contacts = [],
        calculators = [],
        domains = [],
        servers = [],
        licenses = [],
        projects = [],
        files = [],
        comments = []
      ] = results.map(result => result.status === 'fulfilled' ? result.value : []);

      const newNotifications = [];

      // Check if all API calls failed
      const allFailed = results.every(result => result.status === 'rejected');
      if (allFailed) {
        setError('Unable to connect to notification service. Please check your connection.');
      }

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

      // Fájl értesítések
      if (Array.isArray(files)) {
        // Csak az utolsó 24 órában feltöltött fájlokat nézzük
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        files
          .filter(file => new Date(file.uploadedAt) > oneDayAgo)
          .forEach(file => {
            newNotifications.push({
              _id: `file_${file._id}`,
              title: 'Új fájl feltöltve',
              message: `"${file.name}" fájl feltöltve a ${file.projectName || 'rendszerbe'}`,
              severity: 'info',
              createdAt: file.uploadedAt,
              type: 'file',
              link: '/files'
            });
          });
      }

      // Hozzászólás értesítések
      if (Array.isArray(comments)) {
        // Csak az utolsó 24 órában írt hozzászólásokat nézzük
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        comments
          .filter(comment => new Date(comment.timestamp) > oneDayAgo)
          .forEach(comment => {
            newNotifications.push({
              _id: `comment_${comment.id}`,
              title: 'Új hozzászólás',
              message: `${comment.author} hozzászólt: "${comment.text.substring(0, 30)}${comment.text.length > 30 ? '...' : ''}"`,
              severity: 'info',
              createdAt: comment.timestamp,
              type: 'comment',
              link: '/comments'
            });
          });
      }

      // Add API connection error notification if there were failures
      const failedApiCalls = results.filter(r => r.status === 'rejected').length;
      if (failedApiCalls > 0 && failedApiCalls < results.length) {
        newNotifications.push({
          _id: `system_api_error_${Date.now()}`,
          title: 'Szerver kapcsolódási hiba',
          message: `${failedApiCalls} API végpont nem elérhető. Egyes értesítések hiányozhatnak.`,
          severity: 'error',
          createdAt: new Date().toISOString(),
          type: 'system',
          link: '/settings'
        });
      }

      // Rendezés dátum szerint
      newNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      // Értesítések mentése és számolása
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.length);
      
      // Értesítés küldése böngészőben, ha új értesítés érkezett
      if (newNotifications.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
        const latestNotification = newNotifications[0];
        new Notification('NB-Studio Admin', {
          body: latestNotification.message,
          icon: '/favicon.ico'
        });
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications. Please try again later.');
    } finally {
      setLoading(false);
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

  const handleRefresh = () => {
    fetchAllNotifications();
  };

  useEffect(() => {
    // Kérjünk engedélyt a böngésző értesítésekhez
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  // Értesítések szűrése típus szerint
  const filteredNotifications = filterType === 'all' 
    ? notifications 
    : notifications.filter(notification => notification.type === filterType);

  // Ikon kiválasztása az értesítés típusa és súlyossága alapján
  const getIcon = (severity, type) => {
    // Típus szerinti ikonok
    switch (type) {
      case 'server':
        return <Server className={`w-5 h-5 ${getColorByLevel(severity)}`} />;
      case 'domain':
        return <Globe className={`w-5 h-5 ${getColorByLevel(severity)}`} />;
      case 'license':
        return <FileText className={`w-5 h-5 ${getColorByLevel(severity)}`} />;
      case 'project':
        return <Calendar className={`w-5 h-5 ${getColorByLevel(severity)}`} />;
      case 'contact':
        return <Info className={`w-5 h-5 ${getColorByLevel(severity)}`} />;
      case 'calculator':
        return <Database className={`w-5 h-5 ${getColorByLevel(severity)}`} />;
      case 'file':
        return <FileText className={`w-5 h-5 ${getColorByLevel(severity)}`} />;
      case 'comment':
        return <MessageCircle className={`w-5 h-5 ${getColorByLevel(severity)}`} />;
      case 'system':
        return <AlertTriangle className={`w-5 h-5 ${getColorByLevel(severity)}`} />;
      default:
        // Súlyosság szerinti alapértelmezett ikonok
        switch (severity) {
          case 'error':
            return <AlertTriangle className="w-5 h-5 text-red-500" />;
          case 'warning':
            return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
          default:
            return <Info className="w-5 h-5 text-blue-500" />;
        }
    }
  };
  
  // Szín kiválasztása súlyosság alapján
  const getColorByLevel = (severity) => {
    switch (severity) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
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
            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                className="text-sm text-blue-600 hover:text-blue-800"
                disabled={loading}
              >
                {loading ? 'Frissítés...' : 'Frissítés'}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleDismissAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Összes elrejtése
                </button>
              )}
            </div>
          </div>
          
          {/* Szűrők */}
          <div className="p-2 bg-gray-50 border-b flex justify-start items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-1 text-xs rounded-full ${filterType === 'all' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              Összes
            </button>
            <button
              onClick={() => setFilterType('domain')}
              className={`px-2 py-1 text-xs rounded-full ${filterType === 'domain' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              Domain
            </button>
            <button
              onClick={() => setFilterType('server')}
              className={`px-2 py-1 text-xs rounded-full ${filterType === 'server' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              Szerver
            </button>
            <button
              onClick={() => setFilterType('license')}
              className={`px-2 py-1 text-xs rounded-full ${filterType === 'license' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              Licensz
            </button>
            <button
              onClick={() => setFilterType('project')}
              className={`px-2 py-1 text-xs rounded-full ${filterType === 'project' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              Projekt
            </button>
            <button
              onClick={() => setFilterType('contact')}
              className={`px-2 py-1 text-xs rounded-full ${filterType === 'contact' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              Kapcsolat
            </button>
            <button
              onClick={() => setFilterType('file')}
              className={`px-2 py-1 text-xs rounded-full ${filterType === 'file' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              Fájlok
            </button>
            <button
              onClick={() => setFilterType('comment')}
              className={`px-2 py-1 text-xs rounded-full ${filterType === 'comment' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              Hozzászólások
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-gray-700">{error}</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                >
                  Újrapróbálkozás
                </button>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {notifications.length === 0 ? 'Nincsenek új értesítések' : 'Nincs a szűrésnek megfelelő értesítés'}
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className="block border-b hover:bg-gray-50 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    if (notification.link) {
                      navigate(notification.link);
                      setIsOpen(false);
                    }
                  }}
                >
                  <div className="p-4 flex items-start gap-3">
                    {getIcon(notification.severity, notification.type)}
                    <div className="flex-1">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm text-gray-600">{notification.message}</div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(notification._id);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Panel lábléc */}
          {notifications.length > 10 && (
            <div className="p-2 border-t text-center bg-gray-50">
              <button 
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Összes értesítés megtekintése
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsManager;