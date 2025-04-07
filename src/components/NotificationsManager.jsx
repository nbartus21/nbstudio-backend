import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertTriangle, Info, Clock, Database, Globe, Mail } from 'lucide-react';
// Eltávolítva: Server, Calendar, FileText, MessageCircle
import { api } from '../services/auth';
import { useNavigate } from 'react-router-dom';

const NotificationsManager = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const dropdownRef = useRef(null);

  const API_URL = 'https://admin.nb-studio.net:5001/api';

  // Használjuk a localStorage-t az elolvasott értesítések tárolására
  const readNotificationsKey = 'readNotifications';

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

  // Segédfüggvény az elolvasott értesítések kezeléséhez
  const getReadNotifications = () => {
    const stored = localStorage.getItem(readNotificationsKey);
    return stored ? JSON.parse(stored) : [];
  };

  const saveReadNotification = (notificationId) => {
    const readNotifications = getReadNotifications();
    if (!readNotifications.includes(notificationId)) {
      readNotifications.push(notificationId);
      localStorage.setItem(readNotificationsKey, JSON.stringify(readNotifications));
    }
  };

  const fetchAllNotifications = async () => {
    try {
      setLoading(true);

      // Csak a szükséges API végpontokat hívjuk meg, és csak akkor, ha a dropdown nyitva van vagy van olvasatlan értesítés
      // Ez jelentősen csökkenti a felesleges API kéréseket
      const shouldFetchAll = isOpen || unreadCount === 0;

      // Alapértelmezett üres tömbök
      let contacts = [];
      let calculators = [];
      let domains = [];

      // Csak akkor kérünk le adatokat, ha szükséges
      if (shouldFetchAll) {
        // Parallel API kérések indítása
        [contacts, calculators, domains] = await Promise.all([
          api.get(`${API_URL}/contacts`).then(res => res.json()).catch(() => []),
          api.get(`${API_URL}/calculators`).then(res => res.json()).catch(() => []),
          api.get(`${API_URL}/domains`).then(res => res.json()).catch(() => [])
        ]);
      }

      // Eltávolítva: servers, licenses

      const readNotifications = getReadNotifications();
      const newNotifications = [];

      // Kapcsolat űrlapok értesítései
      if (Array.isArray(contacts)) {
        contacts
          .filter(contact => contact.status === 'new')
          .forEach(contact => {
            const notificationId = `contact_${contact._id}`;
            if (!readNotifications.includes(notificationId)) {
              newNotifications.push({
                _id: notificationId,
                title: 'Új kapcsolatfelvétel',
                message: `${contact.name} üzenetet küldött: ${contact.subject}`,
                severity: 'info',
                createdAt: contact.createdAt,
                type: 'contact',
                link: '/contacts'
              });
            }
          });
      }

      // Kalkulátor értesítések
      if (Array.isArray(calculators)) {
        calculators
          .filter(calc => calc.status === 'new')
          .forEach(calc => {
            const notificationId = `calculator_${calc._id}`;
            if (!readNotifications.includes(notificationId)) {
              newNotifications.push({
                _id: notificationId,
                title: 'Új kalkulátor jelentkezés',
                message: `Új ${calc.projectType} projektre érkezett kalkuláció`,
                severity: 'info',
                createdAt: calc.createdAt,
                type: 'calculator',
                link: '/calculator'
              });
            }
          });
      }

      // Domain lejárati értesítések
      if (Array.isArray(domains)) {
        domains.forEach(domain => {
          const daysUntilExpiry = Math.ceil(
            (new Date(domain.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
            const notificationId = `domain_${domain._id}_${daysUntilExpiry}`;
            if (!readNotifications.includes(notificationId)) {
              newNotifications.push({
                _id: notificationId,
                title: 'Domain lejárat',
                message: `A ${domain.name} domain ${daysUntilExpiry} nap múlva lejár`,
                severity: daysUntilExpiry <= 7 ? 'error' : 'warning',
                createdAt: new Date().toISOString(),
                type: 'domain',
                link: '/domains'
              });
            }
          }
        });
      }

      // Szerver státusz értesítések - eltávolítva

      // Licensz értesítések - eltávolítva

      // Projekt értesítések eltávolítva

      // Fájl értesítések eltávolítva

      // Hozzászólás értesítések eltávolítva

      // Rendezés dátum szerint
      newNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Értesítések mentése és számolása
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.length);

      // Értesítés küldése böngészőben, ha új értesítés érkezett
      if (newNotifications.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
        const latestNotification = newNotifications[0];
        // Csak akkor küldünk értesítést, ha az elolvasottak között nem szerepel
        if (!readNotifications.includes(latestNotification._id)) {
          new Notification('NB-Studio Admin', {
            body: latestNotification.message,
            icon: '/favicon.ico'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Kezdeti lekérés
    fetchAllNotifications();
    // Support ticket értesítések lekérése
    fetchSupportTicketNotifications();

    // Frissítési intervallum 5 percre növelve (300000 ms)
    const interval = setInterval(() => {
      fetchAllNotifications();
      fetchSupportTicketNotifications();
    }, 300000); // 5 perc

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (notificationId) => {
    // Mentés az elolvasottakhoz
    saveReadNotification(notificationId);
    // Eltávolítás a megjelenítésből
    setNotifications(prev => prev.filter(n => n._id !== notificationId));
    setUnreadCount(prev => prev - 1);
  };

  const handleDismissAll = () => {
    // Minden jelenlegi értesítés mentése az elolvasottakhoz
    const readNotifications = getReadNotifications();
    notifications.forEach(notification => {
      if (!readNotifications.includes(notification._id)) {
        readNotifications.push(notification._id);
      }
    });
    localStorage.setItem(readNotificationsKey, JSON.stringify(readNotifications));

    // Értesítések törlése a megjelenítésből
    setNotifications([]);
    setUnreadCount(0);
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
      case 'domain':
        return <Globe className={`w-4 h-4 ${getColorByLevel(severity)}`} />;
      // Szerver, licensz és projekt ikonok eltávolítva
      case 'contact':
        return <Info className={`w-4 h-4 ${getColorByLevel(severity)}`} />;
      case 'calculator':
        return <Database className={`w-4 h-4 ${getColorByLevel(severity)}`} />;
      // Fájl és hozzászólás értesítés ikonok eltávolítva
      case 'ticket':
        return <Mail className={`w-4 h-4 ${getColorByLevel(severity)}`} />; // Support ticket értesítés ikon
      default:
        // Súlyosság szerinti alapértelmezett ikonok
        switch (severity) {
          case 'error':
            return <AlertTriangle className="w-4 h-4 text-red-500" />;
          case 'warning':
            return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
          default:
            return <Info className="w-4 h-4 text-blue-500" />;
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

  // Support ticket értesítések lekérése
  const fetchSupportTicketNotifications = async () => {
    // Csak akkor kérünk le adatokat, ha a dropdown nyitva van vagy nincs olvasatlan értesítés
    // Ez jelentősen csökkenti a felesleges API kéréseket
    const shouldFetch = isOpen || unreadCount === 0;

    if (!shouldFetch) return;

    try {
      const response = await api.get('/api/notifications');
      const data = await response.json();

      // Elolvastott értesítések kiszűrése
      const readNotifications = getReadNotifications();

      // Új tömb létrehozása a ticket értesítésekből
      const ticketNotifications = data.filter(notification =>
        !readNotifications.includes(`ticket_${notification._id}`)
      ).map(notification => ({
        _id: `ticket_${notification._id}`,
        title: notification.title || 'Support értesítés',
        message: notification.message,
        severity: notification.severity || 'info',
        createdAt: notification.createdAt,
        type: 'ticket',
        link: notification.link || '/support/tickets'
      }));

      // Csak akkor frissítjük az értesítéseket, ha van új ticket
      if (ticketNotifications.length > 0) {
        // Értesítések frissítése
        setNotifications(prev => {
          // Meglévő ticket értesítések eltávolítása
          const filteredNotifications = prev.filter(n => n.type !== 'ticket');
          // Új ticket értesítések hozzáadása
          return [...filteredNotifications, ...ticketNotifications]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        });

        // Olvasatlan számláló frissítése
        const ticketCount = ticketNotifications.length;
        const otherCount = notifications.filter(n => n.type !== 'ticket').length;
        setUnreadCount(otherCount + ticketCount);
      }
    } catch (error) {
      console.error('Hiba a support ticket értesítések lekérésekor:', error);
    }
  };

  // Frissítés indítása kézzel
  const handleRefresh = () => {
    fetchAllNotifications();
    fetchSupportTicketNotifications();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 text-gray-300 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-80 bg-white rounded-lg shadow-xl z-50">
          <div className="p-3 border-b flex justify-between items-center">
            <h3 className="text-base font-semibold">Értesítések</h3>
            <div className="flex space-x-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleDismissAll}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Összes elrejtése
                </button>
              )}
              <button
                onClick={handleRefresh}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Frissítés
              </button>
            </div>
          </div>

          {/* Szűrők */}
          <div className="p-1.5 bg-gray-50 border-b flex justify-start items-center gap-0.5 overflow-x-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-1.5 py-0.5 text-xs rounded-full ${filterType === 'all'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              Összes
            </button>
            <button
              onClick={() => setFilterType('domain')}
              className={`px-1.5 py-0.5 text-xs rounded-full ${filterType === 'domain'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              Domain
            </button>
            {/* Szerver, licensz és projekt szűrők eltávolítva */}
            <button
              onClick={() => setFilterType('contact')}
              className={`px-1.5 py-0.5 text-xs rounded-full ${filterType === 'contact'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              Kapcsolat
            </button>
            {/* Fájl és hozzászólás szűrők eltávolítva */}
            <button
              onClick={() => setFilterType('ticket')}
              className={`px-1.5 py-0.5 text-xs rounded-full ${filterType === 'ticket'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              Supportok
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center p-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-3 text-center text-gray-500 text-sm">
                {notifications.length === 0 ? 'Nincsenek új értesítések' : 'Nincs a szűrésnek megfelelő értesítés'}
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className="block border-b hover:bg-gray-50 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDismiss(notification._id); // Automatikusan eltávolítjuk, ha rákattintottak
                    if (notification.link) {
                      navigate(notification.link);
                      setIsOpen(false);
                    }
                  }}
                >
                  <div className="p-2.5 flex items-start gap-2">
                    {getIcon(notification.severity, notification.type)}
                    <div className="flex-1">
                      <div className="text-sm font-medium">{notification.title}</div>
                      <div className="text-xs text-gray-600">{notification.message}</div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center">
                        <Clock className="h-2.5 w-2.5 mr-0.5" />
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
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Panel lábléc */}
          {notifications.length > 10 && (
            <div className="p-1.5 border-t text-center bg-gray-50">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
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