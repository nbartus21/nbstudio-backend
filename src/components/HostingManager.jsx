import React, { useState, useEffect } from 'react';
import { Check, X, Info, Edit, Monitor, Server, Bell, Mail, User, DollarSign, AlertCircle } from 'lucide-react';
import { api } from '../services/auth';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

const API_URL = import.meta.env.VITE_API_URL || 'https://admin.nb-studio.net:5001/api';
const WHMCS_CONFIG = {
  // WHMCS csomag azonosítók a csomagokhoz
  PACKAGE_IDS: {
    // Normál csomagok
    normal: {
      starter: 1,   // Kezdő csomag ID
      business: 2,  // Üzleti csomag ID
      professional: 3 // Professzionális csomag ID
    },
    // Viszonteladói csomagok
    reseller: {
      starter: 4,   // Viszonteladói kezdő csomag ID
      business: 5,  // Viszonteladói üzleti csomag ID
      professional: 6  // Viszonteladói professzionális csomag ID
    }
  },
  // Számlázási ciklusok - ezeket az értékeket várja a WHMCS
  BILLING_CYCLES: {
    monthly: 'monthly',
    annually: 'annually'
  },
  // Fizetési módok
  PAYMENT_METHODS: {
    card: 'stripe',
    transfer: 'banktransfer'
  }
};

// Modal komponens
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-lg w-full max-w-4xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// Rendelés részletek modális
const OrderDetailsModal = ({ order, onClose, onStatusUpdate, onReject }) => {
  const [notes, setNotes] = useState('');
  const [isWHMCSProcessing, setIsWHMCSProcessing] = useState(false);
  const [whmcsResult, setWHMCSResult] = useState(null);
  const [whmcsError, setWHMCSError] = useState(null);

  // WHMCS-ben rendelés létrehozása
  const handleCreateWHMCSOrder = async () => {
    try {
      setIsWHMCSProcessing(true);
      setWHMCSError(null);

      // Meghatározzuk a megfelelő csomag ID-t a csomagtípus és név alapján
      const packageType = order.plan.type === 'reseller' ? 'reseller' : 'normal';
      const packageLevel = order.plan.name.toLowerCase().includes('kezdő') ? 'starter' : 
                         order.plan.name.toLowerCase().includes('üzleti') ? 'business' : 'professional';
      
      const whmcsPackageId = WHMCS_CONFIG.PACKAGE_IDS[packageType][packageLevel];
      const whmcsBillingCycle = order.plan.billing === 'monthly' ? 
                              WHMCS_CONFIG.BILLING_CYCLES.monthly : 
                              WHMCS_CONFIG.BILLING_CYCLES.annually;
      
      // API hívás a WHMCS rendelés létrehozásához
      const response = await api.post(`${API_URL}/hosting/whmcs/create-order`, {
        orderId: order._id,
        clientData: {
          firstname: order.client.name.split(' ')[0] || 'Ügyfél',
          lastname: order.client.name.split(' ').slice(1).join(' ') || 'Felhasználó',
          email: order.client.email,
          address1: order.client.address?.street || '',
          city: order.client.address?.city || '',
          state: order.client.address?.postcode || '',
          postcode: order.client.address?.postcode || '',
          country: order.client.address?.country || 'HU',
          phonenumber: order.client.phone || '',
          company: order.client.company || ''
        },
        packageId: whmcsPackageId,
        domain: order.service.domainName,
        billingCycle: whmcsBillingCycle,
        paymentMethod: WHMCS_CONFIG.PAYMENT_METHODS.card, // Alapértelmezett: kártyás fizetés
        notes: notes
      });

      if (response.ok) {
        const result = await response.json();
        setWHMCSResult(result);
        
        // Ha sikeres, frissítjük a rendelés státuszát
        if (result.success) {
          await onStatusUpdate(order._id, 'active');
        }
      } else {
        const errorData = await response.json();
        setWHMCSError(errorData.message || 'Hiba történt a WHMCS rendelés létrehozásakor');
      }
    } catch (error) {
      console.error('WHMCS hiba:', error);
      setWHMCSError(error.message || 'Hiba történt a WHMCS rendelés létrehozásakor');
    } finally {
      setIsWHMCSProcessing(false);
    }
  };

  // Csomag adatok formázása
  const formatPackageDetails = (plan) => {
    const type = plan.type === 'reseller' ? 'Viszonteladói' : 'Normál';
    const billing = plan.billing === 'monthly' ? 'Havi' : 'Éves';
    const price = new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'EUR' }).format(plan.price);
    
    return `${type} - ${plan.name} (${billing}) - ${price}`;
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Rendelés Részletei</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Ügyfél adatok */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-blue-500" />
                Ügyfél Adatok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Név</p>
                  <p className="font-medium">{order.client.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{order.client.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefon</p>
                  <p className="font-medium">{order.client.phone || 'Nincs megadva'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cég</p>
                  <p className="font-medium">{order.client.company || 'Nincs megadva'}</p>
                </div>
                {order.client.address && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Cím</p>
                    <p className="font-medium">
                      {order.client.address.street}, {order.client.address.city}, {order.client.address.postcode}, {order.client.address.country}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Csomag Adatok */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="mr-2 h-5 w-5 text-green-500" />
                Csomag Adatok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Csomag</p>
                  <p className="font-medium">{formatPackageDetails(order.plan)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Domain</p>
                  <p className="font-medium">{order.service.domainName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Domain Típus</p>
                  <p className="font-medium">{order.service.domainType === 'new' ? 'Új domain' : 'Domain átvitel'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Státusz</p>
                  <p className={`font-medium ${
                    order.status === 'active' ? 'text-green-600' :
                    order.status === 'suspended' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {order.status === 'new' ? 'Új' : 
                     order.status === 'processing' ? 'Feldolgozás alatt' : 
                     order.status === 'active' ? 'Aktív' :
                     order.status === 'suspended' ? 'Felfüggesztve' : 'Törölve'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fizetési Adatok */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-purple-500" />
                Fizetési Adatok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Fizetési Állapot</p>
                  <p className={`font-medium ${
                    order.payment.status === 'paid' ? 'text-green-600' :
                    order.payment.status === 'cancelled' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {order.payment.status === 'paid' ? 'Fizetve' : 
                     order.payment.status === 'pending' ? 'Függőben' : 
                     order.payment.status === 'cancelled' ? 'Visszavonva' : 'Visszatérítve'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Összeg</p>
                  <p className="font-medium">{new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'EUR' }).format(order.plan.price)}</p>
                </div>
                {order.payment.method && (
                  <div>
                    <p className="text-sm text-gray-500">Fizetési mód</p>
                    <p className="font-medium">{order.payment.method}</p>
                  </div>
                )}
                {order.payment.paidAt && (
                  <div>
                    <p className="text-sm text-gray-500">Fizetés dátuma</p>
                    <p className="font-medium">{new Date(order.payment.paidAt).toLocaleDateString('hu-HU')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* WHMCS integráció szakasz */}
          {(order.status === 'processing' || order.status === 'new') && (
            <Card className="border-t-4 border-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="mr-2 h-5 w-5 text-blue-500" />
                  WHMCS Integráció
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                    <p className="text-sm text-blue-800">
                      A rendelés jóváhagyásával a rendszer automatikusan létrehozza a szükséges fiókot a WHMCS-ben és aktiválja a szolgáltatást.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Megjegyzés a rendeléshez</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                      placeholder="Opcionális megjegyzés a rendeléshez..."
                    ></textarea>
                  </div>

                  {whmcsError && (
                    <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
                      <p className="font-medium">Hiba történt:</p>
                      <p>{whmcsError}</p>
                    </div>
                  )}

                  {whmcsResult && (
                    <div className="bg-green-50 p-4 rounded-md border border-green-200 text-green-700">
                      <p className="font-medium">Sikeresen létrehozva:</p>
                      <p>WHMCS rendelés azonosító: {whmcsResult.orderId}</p>
                      <p>Ügyfél azonosító: {whmcsResult.clientId}</p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-3">
                    <button
                      onClick={() => onReject(order._id, notes)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Rendelés elutasítása
                    </button>
                    <button
                      onClick={handleCreateWHMCSOrder}
                      disabled={isWHMCSProcessing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center"
                    >
                      {isWHMCSProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Feldolgozás...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Rendelés jóváhagyása
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Megjegyzések szakasz */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="mr-2 h-5 w-5 text-gray-500" />
                Megjegyzések
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.notes && order.notes.length > 0 ? (
                <div className="space-y-3">
                  {order.notes.map((note, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {note.addedBy} - {new Date(note.addedAt).toLocaleString('hu-HU')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-3">Nincsenek megjegyzések</p>
              )}
            </CardContent>
          </Card>

          {/* Művelet gombok */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Bezárás
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

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
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Értesítések engedélyezésének kérése
  const requestNotificationPermission = async () => {
    try {
      if ('Notification' in window && window.isSecureContext) {  // Ellenőrizzük a secure context-et
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
    
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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

      // Értesítés küldése az ügyfélnek
      if (newStatus === 'active') {
        await sendClientNotification(
          updatedOrder.client.email,
          'Rendelés jóváhagyva',
          `Tisztelt ${updatedOrder.client.name}!

Az Ön ${updatedOrder.plan.name} hosting csomag rendelését jóváhagytuk, a szolgáltatás aktív.

Domain: ${updatedOrder.service.domainName}
Csomag: ${updatedOrder.plan.name}
Időszak: ${updatedOrder.plan.billing === 'monthly' ? 'Havi' : 'Éves'}

A szolgáltatáshoz szükséges belépési adatokat külön e-mailben küldjük el Önnek.

Üdvözlettel,
Az NB-Studio csapata`
        );

        setSuccessMessage(`A rendelés sikeresen aktiválva, és értesítő e-mail kiküldve: ${updatedOrder.client.email}`);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      }

      await fetchOrders();
      setError(null);
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update order status');
    }
  };

  // Rendelés elutasítása
  const handleRejectOrder = async (orderId, reason) => {
    try {
      const response = await api.put(`${API_URL}/hosting/orders/${orderId}/status`, {
        status: 'cancelled',
        rejectionReason: reason || 'A rendelés elutasításra került'
      });

      if (!response.ok) {
        throw new Error('Failed to reject order');
      }

      const updatedOrder = await response.json();

      // Értesítés küldése az ügyfélnek
      await sendClientNotification(
        updatedOrder.client.email,
        'Rendelés elutasítva',
        `Tisztelt ${updatedOrder.client.name}!

Sajnálattal tájékoztatjuk, hogy az Ön ${updatedOrder.plan.name} hosting csomag rendelését nem tudjuk teljesíteni.

${reason ? `Az elutasítás oka: ${reason}` : ''}

Amennyiben további kérdése lenne, kérjük vegye fel velünk a kapcsolatot.

Üdvözlettel,
Az NB-Studio csapata`
      );

      setSuccessMessage(`A rendelés sikeresen elutasítva, és értesítő e-mail kiküldve: ${updatedOrder.client.email}`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);

      setShowDetailsModal(false);
      await fetchOrders();
    } catch (error) {
      console.error('Error rejecting order:', error);
      setError('Failed to reject order');
    }
  };

  // Email küldése az ügyfélnek
  const sendClientNotification = async (email, subject, message) => {
    try {
      const response = await api.post(`${API_URL}/hosting/notify-client`, {
        email,
        subject,
        message
      });

      if (!response.ok) {
        throw new Error('Failed to send notification email');
      }

      return true;
    } catch (error) {
      console.error('Error sending client notification:', error);
      return false;
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

  // Rendelés szűrés
  const filterOrders = (status) => {
    return orders.filter(order => order.status === status);
  };

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
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Értesítések engedélyezése banner */}
      {!hasNotificationPermission && (
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <CardContent className="flex justify-between items-center py-3">
            <span>Az értesítések engedélyezése segít nyomon követni az új rendeléseket.</span>
            <button
              onClick={requestNotificationPermission}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              Értesítések engedélyezése
            </button>
          </CardContent>
        </Card>
      )}

      {/* Sikeres művelet üzenet */}
      {showSuccessMessage && (
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardContent className="flex justify-between items-center py-3">
            <span className="text-green-700">{successMessage}</span>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="text-green-700 hover:text-green-900"
            >
              <X className="h-5 w-5" />
            </button>
          </CardContent>
        </Card>
      )}

      {/* Fejléc értesítés gombbal */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hosting Rendelések</h1>
        <div className="flex space-x-2 items-center">
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Frissítés
          </button>
          
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
      </div>

      {/* Statisztika kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Összes rendelés</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Monitor className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Feldolgozandó</p>
                <p className="text-2xl font-bold">
                  {filterOrders('new').length + filterOrders('processing').length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Info className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Felfüggesztett</p>
                <p className="text-2xl font-bold">
                  {filterOrders('suspended').length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rendelések táblázat */}
      <Card>
        <CardHeader>
          <CardTitle>Rendelések</CardTitle>
        </CardHeader>
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
                        {order.plan.type === 'reseller' ? 'Viszonteladói' : 'Normál'} - {
                          order.plan.billing === 'monthly' ? 'Havi' : 'Éves'
                        }
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status === 'new' ? 'Új' : 
                       order.status === 'processing' ? 'Feldolgozás alatt' : 
                       order.status === 'active' ? 'Aktív' :
                       order.status === 'suspended' ? 'Felfüggesztve' : 'Törölve'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(order.payment.status)}`}>
                      {order.payment.status === 'paid' ? 'Fizetve' : 
                       order.payment.status === 'pending' ? 'Függőben' : 
                       order.payment.status === 'cancelled' ? 'Törölve' :
                       'Visszatérítve'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('hu-HU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDetailsModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                      title="Részletek"
                    >
                      <Info className="h-5 w-5" />
                    </button>
                    
                    {(order.status === 'new' || order.status === 'processing') && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'processing')}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Feldolgozás indítása"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    )}
                    
                    {order.status === 'processing' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'active')}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Aktiválás"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    )}
                    
                    {order.status === 'active' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'suspended')}
                        className="text-red-600 hover:text-red-900"
                        title="Felfüggesztés"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                    
                    {order.status === 'suspended' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'active')}
                        className="text-green-600 hover:text-green-900"
                        title="Újraaktiválás"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* WHMCS integráció magyarázat kártya */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">WHMCS Integráció Beállítások</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            A rendszer a következő WHMCS csomag azonosítókat használja az automatikus rendelések létrehozásához:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-lg mb-2">Normál csomagok:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Kezdő csomag:</strong> ID = 1</li>
                <li><strong>Üzleti csomag:</strong> ID = 2</li>
                <li><strong>Professzionális csomag:</strong> ID = 3</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-lg mb-2">Viszonteladói csomagok:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Viszonteladói kezdő:</strong> ID = 4</li>
                <li><strong>Viszonteladói üzleti:</strong> ID = 5</li>
                <li><strong>Viszonteladói professzionális:</strong> ID = 6</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 bg-blue-100 p-4 rounded-md">
            <p className="font-medium">A WHMCS csomag ID-kat a kódban a következő helyen lehet beállítani:</p>
            <p className="mt-2 font-mono text-sm bg-white p-2 rounded">
              const WHMCS_CONFIG = &#123;<br />
              &nbsp;&nbsp;PACKAGE_IDS: &#123;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;normal: &#123;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;starter: 1,&nbsp;&nbsp;&nbsp;&nbsp;// Kezdő csomag ID<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;business: 2,&nbsp;&nbsp;// Üzleti csomag ID<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;professional: 3&nbsp;&nbsp;// Professzionális csomag ID<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&#125;,<br />
              &nbsp;&nbsp;&nbsp;&nbsp;reseller: &#123;...&#125;<br />
              &nbsp;&nbsp;&#125;<br />
              &#125;;
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Részletek Modal */}
      {showDetailsModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          onStatusUpdate={handleStatusUpdate}
          onReject={handleRejectOrder}
        />
      )}
    </div>
  );
};

export default HostingManager;