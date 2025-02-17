import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntl } from 'react-intl';
import { Bell, X, AlertTriangle, Info } from 'lucide-react';

// API configuration
const API_URL = 'https://admin.nb-studio.net:5001/api';
const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

// NotificationsManager komponens
const NotificationsManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

  // Notification permission kérése
  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setHasNotificationPermission(permission === 'granted');
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Browser notification küldése
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

  // Értesítés hozzáadása
  const addNotification = (notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
    sendBrowserNotification(notification.title, notification.message);
  };

  // Értesítések betöltése
  const fetchAllNotifications = async () => {
    try {
      const [contacts, calculators, domains, servers, licenses, projects] = await Promise.all([
        fetch(`${API_URL}/contacts`).then((res) => res.json()),
        fetch(`${API_URL}/calculators`).then((res) => res.json()),
        fetch(`${API_URL}/domains`).then((res) => res.json()),
        fetch(`${API_URL}/servers`).then((res) => res.json()),
        fetch(`${API_URL}/licenses`).then((res) => res.json()),
        fetch(`${API_URL}/projects`).then((res) => res.json())
      ]);

      const newNotifications = [];

      // Kapcsolatfelvételek
      contacts
        .filter((contact) => contact.status === 'new')
        .forEach((contact) => {
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

      // Kalkulációk
      calculators
        .filter((calc) => calc.status === 'new')
        .forEach((calc) => {
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

      // Domain lejáratok
      domains.forEach((domain) => {
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

      // Szerver problémák
      servers.forEach((server) => {
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

      // Értesítések dátum szerint rendezése
      newNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Inicializálás
  useEffect(() => {
    if ('Notification' in window) {
      setHasNotificationPermission(Notification.permission === 'granted');
    }

    fetchAllNotifications();
    const interval = setInterval(fetchAllNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Értesítés eltávolítása
  const handleDismiss = (notificationId) => {
    setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    setUnreadCount((prev) => prev - 1);
  };

  // Összes értesítés eltávolítása
  const handleDismissAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Ikon lekérése
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
      {/* Értesítés ikon */}
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

      {/* Értesítések engedélyezése */}
      {!hasNotificationPermission && (
        <button
          onClick={requestNotificationPermission}
          className="absolute top-full right-0 mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded shadow-lg whitespace-nowrap"
        >
          Értesítések engedélyezése
        </button>
      )}

      {/* Értesítések panel */}
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

// HostingOrder komponens
const HostingOrder = ({ isOpen, onClose, plan }) => {
  const intl = useIntl();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    street: '',
    city: '',
    postcode: '',
    country: 'DE',
    domain: '',
    domainType: 'new',
    acceptTerms: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Form validation
  const validateForm = () => {
    const errors = {};
    if (!formData.domain) {
      errors.domain = intl.formatMessage({ id: 'hosting.validation.domain.required' });
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(formData.domain)) {
      errors.domain = intl.formatMessage({ id: 'hosting.validation.domain.invalid' });
    }
    if (!formData.email) {
      errors.email = intl.formatMessage({ id: 'hosting.validation.email.required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = intl.formatMessage({ id: 'hosting.validation.email.invalid' });
    }
    if (!formData.phone) {
      errors.phone = intl.formatMessage({ id: 'hosting.validation.phone.required' });
    }
    ['firstName', 'lastName', 'street', 'city', 'postcode'].forEach((field) => {
      if (!formData[field]) {
        errors[field] = intl.formatMessage({ id: `hosting.validation.${field}.required` });
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        client: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          address: {
            street: formData.street,
            city: formData.city,
            postcode: formData.postcode,
            country: formData.country
          }
        },
        plan: {
          type: plan.accounts ? 'reseller' : 'regular',
          name: plan.name,
          billing: plan.price.includes('year') ? 'annual' : 'monthly',
          price: parseFloat(plan.price.replace('€', '')),
          storage: parseInt(plan.storage),
          bandwidth: parseInt(plan.bandwidth),
          domains: plan.domains ? parseInt(plan.domains) : undefined,
          databases: plan.databases ? parseInt(plan.databases) : undefined,
          accounts: plan.accounts ? parseInt(plan.accounts) : undefined
        },
        domain: {
          name: formData.domain,
          type: formData.domainType
        }
      };

      const response = await fetch(`${API_URL}/hosting/orders/public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        credentials: 'omit',
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || intl.formatMessage({ id: 'hosting.order.error' }));
      }

      setSuccess(true);

      // Új értesítés hozzáadása
      const newNotification = {
        _id: `order_${Date.now()}`,
        title: 'Új hosting rendelés',
        message: `${formData.firstName} ${formData.lastName} új hosting csomagot rendelt: ${plan.name}`,
        severity: 'info',
        createdAt: new Date().toISOString(),
        type: 'hosting',
        link: '/hosting/orders'
      };

      // Értesítés hozzáadása a NotificationsManager-hez
      if (window.notificationsManager) {
        window.notificationsManager.addNotification(newNotification);
      }

      // Form reset
      setTimeout(() => {
        onClose();
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          company: '',
          street: '',
          city: '',
          postcode: '',
          country: 'DE',
          domain: '',
          domainType: 'new',
          acceptTerms: false
        });
      }, 3000);
    } catch (err) {
      console.error('Order submission error:', err);
      setError(err.message || intl.formatMessage({ id: 'hosting.order.error' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {intl.formatMessage({ id: 'hosting.order.title' })} - {plan.name}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {success ? (
              <div className="text-center py-8">
                <div className="text-green-500 text-4xl mb-4">✓</div>
                <h3 className="text-xl font-bold mb-2">
                  {intl.formatMessage({ id: 'hosting.order.success.title' })}
                </h3>
                <p className="text-gray-400">
                  {intl.formatMessage({ id: 'hosting.order.success.message' })}
                </p>
                <p className="text-gray-400 mt-4">
                  {intl.formatMessage({ id: 'hosting.order.success.email' })}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Domain Section */}
                <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg">
                  <h3 className="text-lg font-medium">
                    {intl.formatMessage({ id: 'hosting.order.domain.title' })}
                  </h3>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="domainType"
                        value="new"
                        checked={formData.domainType === 'new'}
                        onChange={handleChange}
                        className="text-blue-500 focus:ring-blue-500"
                      />
                      {intl.formatMessage({ id: 'hosting.order.domain.new' })}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="domainType"
                        value="transfer"
                        checked={formData.domainType === 'transfer'}
                        onChange={handleChange}
                        className="text-blue-500 focus:ring-blue-500"
                      />
                      {intl.formatMessage({ id: 'hosting.order.domain.transfer' })}
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {intl.formatMessage({ id: 'hosting.order.domain.name' })}
                    </label>
                    <input
                      type="text"
                      name="domain"
                      value={formData.domain}
                      onChange={handleChange}
                      placeholder="example.com"
                      required
                      className={`w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.domain ? 'border-red-500' : ''
                      }`}
                    />
                    {validationErrors.domain && (
                      <p className="mt-1 text-sm text-red-500">{validationErrors.domain}</p>
                    )}
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {intl.formatMessage({ id: 'hosting.order.firstName' })}
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className={`w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.firstName ? 'border-red-500' : ''
                      }`}
                    />
                    {validationErrors.firstName && (
                      <p className="mt-1 text-sm text-red-500">{validationErrors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {intl.formatMessage({ id: 'hosting.order.lastName' })}
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className={`w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.lastName ? 'border-red-500' : ''
                      }`}
                    />
                    {validationErrors.lastName && (
                      <p className="mt-1 text-sm text-red-500">{validationErrors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {intl.formatMessage({ id: 'hosting.order.email' })}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.email ? 'border-red-500' : ''
                    }`}
                  />
                  {validationErrors.email && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {intl.formatMessage({ id: 'hosting.order.phone' })}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.phone ? 'border-red-500' : ''
                    }`}
                  />
                  {validationErrors.phone && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.phone}</p>
                  )}
                </div>

                {/* Company Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {intl.formatMessage({ id: 'hosting.order.company' })}
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Address Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {intl.formatMessage({ id: 'hosting.order.street' })}
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.street ? 'border-red-500' : ''
                    }`}
                  />
                  {validationErrors.street && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.street}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {intl.formatMessage({ id: 'hosting.order.city' })}
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      className={`w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.city ? 'border-red-500' : ''
                      }`}
                    />
                    {validationErrors.city && (
                      <p className="mt-1 text-sm text-red-500">{validationErrors.city}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {intl.formatMessage({ id: 'hosting.order.postcode' })}
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleChange}
                      required
                      className={`w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.postcode ? 'border-red-500' : ''
                      }`}
                    />
                    {validationErrors.postcode && (
                      <p className="mt-1 text-sm text-red-500">{validationErrors.postcode}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {intl.formatMessage({ id: 'hosting.order.country' })}
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DE">Deutschland</option>
                    <option value="AT">Österreich</option>
                    <option value="CH">Schweiz</option>
                    <option value="HU">Ungarn</option>
                  </select>
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    required
                    className="mt-1"
                  />
                  <label className="text-sm text-gray-300">
                    {intl.formatMessage({ id: 'hosting.order.terms' })}
                  </label>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.acceptTerms}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {intl.formatMessage({ id: 'hosting.order.submitting' })}
                    </div>
                  ) : (
                    intl.formatMessage({ id: 'hosting.order.submit' })
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Globális értesítéskezelő hozzáadása
if (typeof window !== 'undefined') {
  window.notificationsManager = {
    addNotification: (notification) => {
      const manager = document.querySelector('notifications-manager');
      if (manager) {
        manager.addNotification(notification);
      }
    }
  };
}

export { NotificationsManager, HostingOrder };