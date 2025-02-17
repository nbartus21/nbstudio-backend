import React, { useState, useEffect } from 'react';
import { Check, X, Info, Edit, Monitor, Server, Bell } from 'lucide-react';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const HostingManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [lastCheckedTimestamp, setLastCheckedTimestamp] = useState(Date.now());
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Értesítések engedélyezésének kérése
  const requestNotificationPermission = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setHasNotificationPermission(permission === 'granted');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Böngésző értesítés küldése
  const sendBrowserNotification = (title, body, data = {}) => {
    if (!hasNotificationPermission) return;

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'nb-studio-hosting-notification',
      data
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (data.orderId) {
        const order = orders.find(o => o._id === data.orderId);
        if (order) {
          setSelectedOrder(order);
          setShowDetailsModal(true);
        }
      }
    };
  };

  // Rendszerértesítés létrehozása
  const createSystemNotification = async (notification) => {
    try {
      const response = await api.post(`${API_URL}/notifications/generate`, {
        type: 'hosting',
        ...notification
      });

      if (response.ok) {
        setNotifications(prev => [notification, ...prev]);
        setNotificationCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error creating system notification:', error);
    }
  };

  // Rendelések lekérése és új rendelések ellenőrzése
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/hosting/orders`);
      const data = await response.json();
      
      // Új rendelések ellenőrzése
      const newOrders = data.filter(order => 
        new Date(order.createdAt).getTime() > lastCheckedTimestamp
      );

      // Értesítések küldése az új rendelésekről
      newOrders.forEach(order => {
        // Browser notification
        sendBrowserNotification(
          'Új hosting rendelés érkezett!',
          `${order.client.name} - ${order.plan.name} csomag`,
          { orderId: order._id }
        );

        // Rendszerértesítés
        createSystemNotification({
          title: 'Új hosting rendelés',
          message: `Új ${order.plan.name} csomag rendelés érkezett ${order.client.name} ügyféltől`,
          severity: 'info',
          link: '/hosting',
          orderId: order._id
        });
      });

      setOrders(data);
      setLastCheckedTimestamp(Date.now());
      setError(null);

      // Lejáró szolgáltatások ellenőrzése
      checkExpiringServices(data);

    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load hosting orders');
    } finally {
      setLoading(false);
    }
  };

  // Lejáró szolgáltatások ellenőrzése
  const checkExpiringServices = (currentOrders) => {
    currentOrders.forEach(order => {
      if (order.status === 'active' && order.service.endDate) {
        const endDate = new Date(order.service.endDate);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          // Értesítés a közelgő lejáratról
          createSystemNotification({
            title: 'Szolgáltatás hamarosan lejár',
            message: `${order.client.name} szolgáltatása ${daysUntilExpiry} nap múlva lejár`,
            severity: 'warning',
            link: '/hosting',
            orderId: order._id
          });

          sendBrowserNotification(
            'Szolgáltatás hamarosan lejár',
            `${order.client.name} szolgáltatása ${daysUntilExpiry} nap múlva lejár`,
            { orderId: order._id }
          );
        } else if (daysUntilExpiry <= 0 && order.payment.status !== 'paid') {
          // Automatikus felfüggesztés
          handleStatusUpdate(order._id, 'suspended');
          
          createSystemNotification({
            title: 'Szolgáltatás felfüggesztve',
            message: `${order.client.name} szolgáltatása lejárt és felfüggesztésre került`,
            severity: 'error',
            link: '/hosting',
            orderId: order._id
          });

          sendBrowserNotification(
            'Szolgáltatás felfüggesztve',
            `${order.client.name} szolgáltatása lejárt és felfüggesztésre került`,
            { orderId: order._id }
          );
        }
      }
    });
  };

  // Státusz frissítése
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await api.put(`${API_URL}/hosting/orders/${orderId}/status`, {
        status: newStatus
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const updatedOrder = await response.json();
      
      // Státusz változás értesítés
      const statusMessages = {
        processing: 'feldolgozás alatt',
        active: 'aktív',
        suspended: 'felfüggesztve',
        cancelled: 'törölve'
      };

      createSystemNotification({
        title: 'Rendelés státusza módosult',
        message: `${updatedOrder.client.name} rendelésének új státusza: ${statusMessages[newStatus]}`,
        severity: newStatus === 'active' ? 'success' : 'info',
        link: '/hosting',
        orderId: orderId
      });

      await fetchOrders();
      setError(null);
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update order status');
    }
  };

  // Inicializálás
  useEffect(() => {
    requestNotificationPermission();
    fetchOrders();

    // Polling időzítő beállítása
    const interval = setInterval(fetchOrders, 30000); // 30 másodpercenként ellenőriz

    return () => clearInterval(interval);
  }, []);

  // Státusz színek
  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Fizetési státusz színek
  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Dátum formázás
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Értesítések panel komponens
  const NotificationsPanel = () => (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Értesítések</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            Nincsenek új értesítések
          </div>
        ) : (
          notifications.map((notification, index) => (
            <div 
              key={index}
              className="p-4 border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                if (notification.orderId) {
                  const order = orders.find(o => o._id === notification.orderId);
                  if (order) {
                    setSelectedOrder(order);
                    setShowDetailsModal(true);
                  }
                }
                setShowNotifications(false);
              }}
            >
              <div className="font-medium">{notification.title}</div>
              <div className="text-sm text-gray-600">{notification.message}</div>
              <div className="text-xs text-gray-400 mt-1">
                {formatDate(notification.createdAt || new Date())}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Értesítések engedélyezése banner */}
      {!hasNotificationPermission && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg flex justify-between items-center">
          <span>Az értesítések engedélyezése segít nyomon követni az új rendeléseket.</span>
          <button
            onClick={requestNotificationPermission}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
            Értesítések engedélyezése
          </button>
        </div>
      )}

      {/* Fejléc értesítés gombbal */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Hosting Rendelések</h1>
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-600 hover:text-gray-800"
          >
            <Bell className="w-6 h-6" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {notificationCount}
              </span>
            )}
          </button>
          {showNotifications && <NotificationsPanel />}
        </div>
      </div>
      {/* Statisztika kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Összes rendelés</p>
              <p className="text-2xl font-bold">{orders.length}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Monitor className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Aktív csomagok</p>
              <p className="text-2xl font-bold">
                {orders.filter(order => order.status === 'active').length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Server className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Függőben lévő</p>
              <p className="text-2xl font-bold">
                {orders.filter(order => order.status === 'new').length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Info className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Felfüggesztett</p>
              <p className="text-2xl font-bold">
                {orders.filter(order => order.status === 'suspended').length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <X className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Rendelések táblázat */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ügyfél
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Csomag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Státusz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fizetés
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dátum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{order.client.name}</div>
                      <div className="text-sm text-gray-500">{order.client.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{order.plan.name}</div>
                      <div className="text-sm text-gray-500">
                        {order.plan.type === 'regular' ? 'Normál' : 'Viszonteladói'} - {
                          order.plan.billing === 'monthly' ? 'Havi' : 'Éves'
                        }
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(order.payment.status)}`}>
                      {order.payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDetailsModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      <Info className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(order._id, 'active')}
                      disabled={order.status !== 'processing'}
                      className="text-green-600 hover:text-green-900 mr-3 disabled:opacity-50"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(order._id, 'suspended')}
                      disabled={order.status !== 'active'}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Részletek Modal */}
      {showDetailsModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default HostingManager;
