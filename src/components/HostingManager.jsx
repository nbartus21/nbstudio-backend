import React, { useState, useEffect } from 'react';
import { Check, X, Info, Edit, Monitor, Server, Bell, Mail, User, DollarSign, AlertCircle, Share2, Plus, Eye, Copy, Trash2, AlertTriangle } from 'lucide-react';
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [shareablePIN, setShareablePIN] = useState('');
  const [newHostingData, setNewHostingData] = useState({
    client: {
      name: '',
      email: '',
      phone: '',
      company: '',
      address: {
        street: '',
        city: '',
        postcode: '',
        country: 'DE'
      },
      language: 'hu'
    },
    hosting: {
      type: 'regular',
      packageName: '',
      billing: 'monthly',
      price: '0',
      domainName: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: ''
    }
  });
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [copySuccess, setCopySuccess] = useState(false);
  const [lastCheckedTimestamp, setLastCheckedTimestamp] = useState(Date.now());
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [showDeleteAllConfirmModal, setShowDeleteAllConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Értesítés megjelenítése
  const showNotification = (type, title, message) => {
    // Itt használhatjuk a meglévő értesítési rendszert
    createSystemNotification({
      type: 'system',  // Használjunk érvényes enum értéket
      title,
      message,
      severity: type === 'error' ? 'error' : 'info',  // A severity mezőben adjuk meg a hiba típusát
      read: false,
      date: new Date()
    });
  };

  // Rendszerértesítés létrehozása
  const createSystemNotification = async (notification) => {
    try {
      const response = await api.post(`${API_URL}/notifications/generate`, {
        type: notification.type || 'system',
        title: notification.title,
        message: notification.message,
        severity: notification.severity || 'info',
        read: notification.read || false,
        link: notification.link
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

      // Ha jóváhagyták a rendelést, létrehozunk egy SharedWebhosting fiókot az ügyfélnek
      if (newStatus === 'active') {
        try {
          // A SharedWebhosting objektum létrehozása
          const sharedWebhosting = {
            client: {
              name: updatedOrder.client.name,
              email: updatedOrder.client.email,
              phone: updatedOrder.client.phone || '',
              company: updatedOrder.client.company || '',
              vatNumber: updatedOrder.client.vatNumber || '',
              address: updatedOrder.client.address || {},
              language: 'hu' // Alapértelmezett nyelv
            },
            hosting: {
              type: updatedOrder.plan.type || 'regular',
              packageName: updatedOrder.plan.name,
              billing: updatedOrder.plan.billing,
              price: updatedOrder.plan.price,
              domainName: updatedOrder.service.domainName,
              startDate: new Date().toISOString(),
              endDate: (() => {
                const endDate = new Date();
                if (updatedOrder.plan.billing === 'monthly') {
                  endDate.setMonth(endDate.getMonth() + 1);
                } else {
                  endDate.setFullYear(endDate.getFullYear() + 1);
                }
                return endDate.toISOString();
              })()
            },
            status: 'active',
            sharing: {
              // PIN és token automatikusan generálódik a szerveren
            }
          };

          // SharedWebhosting létrehozása
          const webhostingResponse = await api.post(`${API_URL}/sharedwebhosting`, sharedWebhosting);
          
          if (!webhostingResponse.ok) {
            throw new Error('Failed to create shared webhosting account');
          }

          const createdWebhosting = await webhostingResponse.json();

          // Email értesítés küldése az ügyfélnek
          const notifyResponse = await api.post(`${API_URL}/notify-client`, {
            webHostingId: createdWebhosting._id,
            language: 'hu' // Alapértelmezett nyelv
          });

          // Értesítés küldése az ügyfélnek a régi módon is (kompatibilitás miatt)
          await sendClientNotification(
            updatedOrder.client.email,
            'Rendelés jóváhagyva',
            `Tisztelt ${updatedOrder.client.name}!

Az Ön ${updatedOrder.plan.name} hosting csomag rendelését jóváhagytuk, a szolgáltatás aktív.

Domain: ${updatedOrder.service.domainName}
Csomag: ${updatedOrder.plan.name}
Időszak: ${updatedOrder.plan.billing === 'monthly' ? 'Havi' : 'Éves'}

A szolgáltatáshoz az alábbi linken férhet hozzá:
https://project.nb-studio.net/shared-webhosting/${createdWebhosting.sharing.token}

A belépéshez szükséges PIN kód: ${createdWebhosting.sharing.pin}

Üdvözlettel,
Az NB-Studio csapata`
          );

          setSuccessMessage(`A rendelés sikeresen aktiválva, ügyfélfiók létrehozva, és értesítő e-mail kiküldve: ${updatedOrder.client.email}`);
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 5000);
        } catch (webhostingError) {
          console.error('Error creating shared webhosting account:', webhostingError);
          setError('Sikeres aktiválás, de hiba történt az ügyfélfiók létrehozása során');
        }
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

  // Megosztható link és PIN megtekintése
  const handleViewSharing = async (orderId) => {
    try {
      // Megkeressük a megfelelő SharedWebhosting fiókot az orderId alapján
      const response = await api.get(`${API_URL}/sharedwebhosting`);
      
      if (!response.ok) {
        throw new Error('Nem sikerült lekérni a webhosting fiókokat');
      }
      
      const webhostings = await response.json();
      
      // Találjuk meg a megfelelő webhosting fiókot
      // Az egyszerűség kedvéért most csak az első fiókot vesszük, de itt lehetne keresés is
      // Valós megoldásban a webhosting fiókhoz hozzáadnánk egy orderID mezőt a könnyebb kereséshez
      const webhosting = webhostings.find(wh => 
        // Itt lenne a jobb keresési feltétel, pl. wh.orderId === orderId
        wh.hosting.domainName === orders.find(o => o._id === orderId)?.service.domainName
      );
      
      if (!webhosting) {
        throw new Error('Nem található megosztható fiók ehhez a rendeléshez');
      }
      
      // Beállítjuk a megosztható adatokat
      setShareableLink(`https://project.nb-studio.net/shared-webhosting/${webhosting.sharing.token}`);
      setShareablePIN(webhosting.sharing.pin);
      setShowShareModal(true);
    } catch (error) {
      console.error('Hiba a megosztási adatok lekérésekor:', error);
      showNotification('error', 'Hiba', 'Nem sikerült lekérni a megosztási adatokat.');
    }
  };

  // Link másolása a vágólapra
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // Új webhosting fiók létrehozása
  const handleCreateHosting = async () => {
    try {
      // Adatok validálása
      const errors = {};
      if (!newHostingData.client.name) errors.name = 'A név kötelező';
      if (!newHostingData.client.email) errors.email = 'Az email kötelező';
      if (!newHostingData.hosting.packageName) errors.packageName = 'A csomag neve kötelező';
      if (!newHostingData.hosting.domainName) errors.domainName = 'A domain név kötelező';
      
      if (Object.keys(errors).length > 0) {
        setCreateFormErrors(errors);
        return;
      }
      
      // Az adatokat a szerver modellhez igazítjuk
      const hostingData = {
        ...newHostingData,
        hosting: {
          ...newHostingData.hosting,
          // Konvertáljuk a billing értéket, ha 'annual' kell a modellben
          billing: newHostingData.hosting.billing === 'yearly' ? 'annual' : newHostingData.hosting.billing,
          // Konvertáljuk a price-t számra, mert a modellben Number típusú
          price: parseFloat(newHostingData.hosting.price) || 0
        }
      };
      
      // Létrehozzuk a shared webhosting fiókot
      const response = await api.post(`${API_URL}/sharedwebhosting`, hostingData);
      
      if (!response.ok) {
        throw new Error('Nem sikerült létrehozni a webhosting fiókot');
      }
      
      const createdWebhosting = await response.json();
      
      // Sikerült létrehozni, értesítjük a felhasználót
      showNotification('success', 'Siker', 'A webhosting fiók sikeresen létrehozva.');
      
      // Email küldés
      await api.post(`${API_URL}/sharedwebhosting/notify-client`, {
        webHostingId: createdWebhosting._id,
        language: createdWebhosting.client.language || 'hu'
      });
      
      // Modál bezárása és adatok frissítése
      setShowCreateModal(false);
      setNewHostingData({
        client: {
          name: '',
          email: '',
          phone: '',
          company: '',
          address: {
            street: '',
            city: '',
            postcode: '',
            country: 'DE'
          },
          language: 'hu'
        },
        hosting: {
          type: 'regular',
          packageName: '',
          billing: 'monthly',
          price: '0',
          domainName: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: ''
        }
      });
      
      // Frissítjük az adatokat
      fetchOrders();
      
    } catch (error) {
      console.error('Hiba a webhosting fiók létrehozásakor:', error);
      showNotification('error', 'Hiba', 'Nem sikerült létrehozni a webhosting fiókot.');
    }
  };

  // Egy rendelés törlése
  const handleDeleteOrder = async (orderId) => {
    try {
      setIsDeleting(true);
      const response = await api.delete(`${API_URL}/hosting/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error('Failed to delete order');
      }
      
      // Frissítjük a listát a törléssel
      setOrders(orders.filter(order => order._id !== orderId));
      
      // Értesítés
      showNotification('success', 'Siker', 'A rendelés sikeresen törölve.');
      
      // Modal bezárása
      setShowDeleteConfirmModal(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error('Error deleting order:', error);
      showNotification('error', 'Hiba', 'Nem sikerült törölni a rendelést.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Minden rendelés törlése
  const handleDeleteAllOrders = async () => {
    try {
      setIsDeleting(true);
      
      // Töröljük az összes rendelést
      const response = await api.delete(`${API_URL}/hosting/orders`);
      
      if (!response.ok) {
        throw new Error('Failed to delete all orders');
      }
      
      // Lista frissítése
      setOrders([]);
      
      // Értesítés
      showNotification('success', 'Siker', 'Minden rendelés sikeresen törölve.');
      
      // Modal bezárása
      setShowDeleteAllConfirmModal(false);
    } catch (error) {
      console.error('Error deleting all orders:', error);
      showNotification('error', 'Hiba', 'Nem sikerült törölni a rendeléseket.');
    } finally {
      setIsDeleting(false);
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

  // Rendelések szűrése státusz alapján
  const filterOrders = (status) => {
    if (status === 'all') {
      return orders;
    }
    return orders.filter((order) => order.status === status);
  };

  // A szűrés eredménye a filtered orders változóban
  const filteredOrders = filterOrders(filterStatus);

  // Csomag adatok formázása
  const formatPackageDetails = (plan) => {
    const type = plan.type === 'reseller' ? 'Viszonteladói' : 'Normál';
    const billing = plan.billing === 'monthly' ? 'Havi' : 'Éves';
    const price = new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'EUR' }).format(plan.price);
    
    return `${plan.name} (${type}, ${billing})`;
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
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Hosting Kezelő</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Új hosting létrehozása
          </button>
          <button 
            onClick={() => setShowDeleteAllConfirmModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Összes törlése
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-4 py-2 rounded-md ${
              filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => setFilterStatus('all')}
          >
            Összes
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              filterStatus === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => setFilterStatus('new')}
          >
            Új
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              filterStatus === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => setFilterStatus('active')}
          >
            Aktív
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              filterStatus === 'suspended' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => setFilterStatus('suspended')}
          >
            Felfüggesztve
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              filterStatus === 'cancelled' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => setFilterStatus('cancelled')}
          >
            Törölve
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ügyfél
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Csomag
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Státusz
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fizetés
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dátum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Műveletek
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-4 text-center text-gray-500">
                      {loading ? 'Betöltés...' : 'Nincsenek megjeleníthető rendelések'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{order.client.name}</td>
                      <td className="py-3 px-4">{order.client.email}</td>
                      <td className="py-3 px-4">{order.service.domainName}</td>
                      <td className="py-3 px-4">{formatPackageDetails(order.plan)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {order.status === 'new' ? 'Új' : 
                           order.status === 'processing' ? 'Feldolgozás alatt' : 
                           order.status === 'active' ? 'Aktív' :
                           order.status === 'suspended' ? 'Felfüggesztve' : 'Törölve'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(order.payment.status)}`}>
                          {order.payment.status === 'paid' ? 'Fizetve' : 
                           order.payment.status === 'pending' ? 'Függőben' : 
                           'Visszavonva'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{formatDate(order.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailsModal(true);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Részletek"
                          >
                            <Eye size={18} />
                          </button>
                          
                          {order.status === 'active' && (
                            <button
                              onClick={() => handleViewSharing(order._id)}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Megosztási információk"
                            >
                              <Share2 size={18} />
                            </button>
                          )}
                          
                          {order.status === 'new' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(order._id, 'active')}
                                className="p-1 text-green-600 hover:text-green-800"
                                title="Jóváhagyás"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => handleRejectOrder(order._id)}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Elutasítás"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}
                          
                          {order.status === 'active' && (
                            <button
                              onClick={() => handleStatusUpdate(order._id, 'suspended')}
                              className="p-1 text-yellow-600 hover:text-yellow-800"
                              title="Felfüggesztés"
                            >
                              <AlertCircle size={18} />
                            </button>
                          )}
                          
                          {order.status === 'suspended' && (
                            <button
                              onClick={() => handleStatusUpdate(order._id, 'active')}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Aktiválás"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          
                          {/* Törlés gomb minden sorhoz */}
                          <button
                            onClick={() => {
                              setOrderToDelete(order);
                              setShowDeleteConfirmModal(true);
                            }}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Törlés"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Megosztási információk modális */}
      {showShareModal && (
        <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)}>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Megosztási információk</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Ügyfél megosztó link:</h3>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    value={shareableLink} 
                    readOnly 
                    className="flex-1 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button 
                    onClick={handleCopyLink}
                    className="ml-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    title="Másolás vágólapra"
                  >
                    <Copy size={18} />
                  </button>
                </div>
                {copySuccess && (
                  <p className="text-green-600 text-sm mt-1">Link másolva a vágólapra!</p>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">PIN kód:</h3>
                <div className="flex items-center">
                  <span className="text-xl font-semibold tracking-widest">{shareablePIN}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Ezt a PIN kódot ossza meg az ügyféllel a belépéshez.</p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-yellow-700">
                      Ezek az információk bizalmasak. A megosztó linket és PIN kódot csak az ügyféllel ossza meg.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Bezárás
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Új hosting létrehozása modális */}
      {showCreateModal && (
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Új Hosting Létrehozása</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Ügyfél adatok */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-4">Ügyfél adatok</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Név*
                    </label>
                    <input 
                      type="text" 
                      value={newHostingData.client.name} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        client: {
                          ...newHostingData.client,
                          name: e.target.value
                        }
                      })}
                      className={`w-full border ${createFormErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    {createFormErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{createFormErrors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email*
                    </label>
                    <input 
                      type="email" 
                      value={newHostingData.client.email} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        client: {
                          ...newHostingData.client,
                          email: e.target.value
                        }
                      })}
                      className={`w-full border ${createFormErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    {createFormErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{createFormErrors.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input 
                      type="text" 
                      value={newHostingData.client.phone} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        client: {
                          ...newHostingData.client,
                          phone: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cég
                    </label>
                    <input 
                      type="text" 
                      value={newHostingData.client.company} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        client: {
                          ...newHostingData.client,
                          company: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cím (utca, házszám)
                    </label>
                    <input 
                      type="text" 
                      value={newHostingData.client.address.street} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        client: {
                          ...newHostingData.client,
                          address: {
                            ...newHostingData.client.address,
                            street: e.target.value
                          }
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Város
                    </label>
                    <input 
                      type="text" 
                      value={newHostingData.client.address.city} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        client: {
                          ...newHostingData.client,
                          address: {
                            ...newHostingData.client.address,
                            city: e.target.value
                          }
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Irányítószám
                    </label>
                    <input 
                      type="text" 
                      value={newHostingData.client.address.postcode} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        client: {
                          ...newHostingData.client,
                          address: {
                            ...newHostingData.client.address,
                            postcode: e.target.value
                          }
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ország
                    </label>
                    <select 
                      value={newHostingData.client.address.country} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        client: {
                          ...newHostingData.client,
                          address: {
                            ...newHostingData.client.address,
                            country: e.target.value
                          }
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DE">Németország</option>
                      <option value="HU">Magyarország</option>
                      <option value="AT">Ausztria</option>
                      <option value="CH">Svájc</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nyelv
                    </label>
                    <select 
                      value={newHostingData.client.language} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        client: {
                          ...newHostingData.client,
                          language: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hu">Magyar</option>
                      <option value="de">Német</option>
                      <option value="en">Angol</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Hosting adatok */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-4">Hosting adatok</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Csomag típus
                    </label>
                    <select 
                      value={newHostingData.hosting.type} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        hosting: {
                          ...newHostingData.hosting,
                          type: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="regular">Normál</option>
                      <option value="reseller">Viszonteladói</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Csomag név*
                    </label>
                    <input 
                      type="text" 
                      value={newHostingData.hosting.packageName} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        hosting: {
                          ...newHostingData.hosting,
                          packageName: e.target.value
                        }
                      })}
                      className={`w-full border ${createFormErrors.packageName ? 'border-red-500' : 'border-gray-300'} rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="pl. Kezdő Csomag"
                    />
                    {createFormErrors.packageName && (
                      <p className="text-red-500 text-xs mt-1">{createFormErrors.packageName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Domain név*
                    </label>
                    <input 
                      type="text" 
                      value={newHostingData.hosting.domainName} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        hosting: {
                          ...newHostingData.hosting,
                          domainName: e.target.value
                        }
                      })}
                      className={`w-full border ${createFormErrors.domainName ? 'border-red-500' : 'border-gray-300'} rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="pl. pelda.com"
                    />
                    {createFormErrors.domainName && (
                      <p className="text-red-500 text-xs mt-1">{createFormErrors.domainName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Számlázási ciklus
                    </label>
                    <select 
                      value={newHostingData.hosting.billing} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        hosting: {
                          ...newHostingData.hosting,
                          billing: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="monthly">Havi</option>
                      <option value="annual">Éves</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ár (EUR)
                    </label>
                    <input 
                      type="text" 
                      value={newHostingData.hosting.price} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        hosting: {
                          ...newHostingData.hosting,
                          price: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kezdő dátum
                    </label>
                    <input 
                      type="date" 
                      value={newHostingData.hosting.startDate} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        hosting: {
                          ...newHostingData.hosting,
                          startDate: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lejárati dátum
                    </label>
                    <input 
                      type="date" 
                      value={newHostingData.hosting.endDate} 
                      onChange={(e) => setNewHostingData({
                        ...newHostingData,
                        hosting: {
                          ...newHostingData.hosting,
                          endDate: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Mégsem
              </button>
              <button
                onClick={handleCreateHosting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Létrehozás
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Törlés megerősítő modális ablak */}
      {showDeleteConfirmModal && orderToDelete && (
        <Modal isOpen={showDeleteConfirmModal} onClose={() => setShowDeleteConfirmModal(false)}>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Rendelés törlése</h2>
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="text-gray-500 hover:text-gray-700"
                disabled={isDeleting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-yellow-700">
                    Biztosan törölni szeretné ezt a rendelést?
                  </p>
                  <p className="text-yellow-700 mt-2 font-medium">
                    {orderToDelete.client.name} - {orderToDelete.service.domainName}
                  </p>
                  <p className="text-yellow-700 mt-2">
                    Ez a művelet nem visszavonható!
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                disabled={isDeleting}
              >
                Mégsem
              </button>
              <button
                onClick={() => handleDeleteOrder(orderToDelete._id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? 'Törlés folyamatban...' : 'Törlés'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Összes törlése megerősítő modális ablak */}
      {showDeleteAllConfirmModal && (
        <Modal isOpen={showDeleteAllConfirmModal} onClose={() => setShowDeleteAllConfirmModal(false)}>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Összes rendelés törlése</h2>
              <button
                onClick={() => setShowDeleteAllConfirmModal(false)}
                className="text-gray-500 hover:text-gray-700"
                disabled={isDeleting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-red-700 font-bold">
                    FIGYELEM! Ez a művelet az ÖSSZES rendelést törölni fogja!
                  </p>
                  <p className="text-red-700 mt-2">
                    Összesen {orders.length} rendelés lesz törölve.
                  </p>
                  <p className="text-red-700 mt-2 font-medium">
                    Ez a művelet nem visszavonható!
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteAllConfirmModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                disabled={isDeleting}
              >
                Mégsem
              </button>
              <button
                onClick={handleDeleteAllOrders}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? 'Törlés folyamatban...' : 'Összes törlése'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HostingManager;