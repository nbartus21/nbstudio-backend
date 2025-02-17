import React, { useState, useEffect } from 'react';
import { Check, X, Info, Edit, Monitor, Server } from 'lucide-react';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const HostingManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/hosting/orders`);
      const data = await response.json();
      setOrders(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load hosting orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Status colors
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

  // Payment status colors
  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle status update
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await api.put(`${API_URL}/hosting/orders/${orderId}/status`, {
        status: newStatus
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      await fetchOrders();
      setError(null);
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update order status');
    }
  };

  // Details Modal
  const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Rendelés részletek</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ügyfél adatok */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Ügyfél adatok</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><span className="font-medium">Név:</span> {order.client.name}</p>
                <p><span className="font-medium">Email:</span> {order.client.email}</p>
                <p><span className="font-medium">Telefon:</span> {order.client.phone || '-'}</p>
                <p><span className="font-medium">Cég:</span> {order.client.company || '-'}</p>
                <p><span className="font-medium">Adószám:</span> {order.client.vatNumber || '-'}</p>
              </div>
            </div>

            {/* Csomag adatok */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Csomag adatok</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><span className="font-medium">Típus:</span> {order.plan.type === 'regular' ? 'Normál' : 'Viszonteladói'}</p>
                <p><span className="font-medium">Csomag:</span> {order.plan.name}</p>
                <p><span className="font-medium">Számlázás:</span> {order.plan.billing === 'monthly' ? 'Havi' : 'Éves'}</p>
                <p><span className="font-medium">Ár:</span> {order.plan.price}€/{order.plan.billing === 'monthly' ? 'hó' : 'év'}</p>
                <p><span className="font-medium">Tárhely:</span> {order.plan.storage} GB</p>
                <p><span className="font-medium">Sávszélesség:</span> {order.plan.bandwidth} GB</p>
                {order.plan.type === 'regular' ? (
                  <>
                    <p><span className="font-medium">Domainek:</span> {order.plan.domains}</p>
                    <p><span className="font-medium">Adatbázisok:</span> {order.plan.databases}</p>
                  </>
                ) : (
                  <p><span className="font-medium">Fiókok:</span> {order.plan.accounts}</p>
                )}
              </div>
            </div>

            {/* Szolgáltatás adatok */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Szolgáltatás adatok</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><span className="font-medium">Státusz:</span> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(order.service.status)}`}>
                    {order.service.status}
                  </span>
                </p>
                <p><span className="font-medium">Domain név:</span> {order.service.domainName || '-'}</p>
                <p><span className="font-medium">Szerver IP:</span> {order.service.serverIp || '-'}</p>
                <p><span className="font-medium">cPanel felhasználó:</span> {order.service.cpanelUsername || '-'}</p>
                {order.service.startDate && (
                  <p><span className="font-medium">Kezdés dátuma:</span> {formatDate(order.service.startDate)}</p>
                )}
                {order.service.endDate && (
                  <p><span className="font-medium">Lejárat dátuma:</span> {formatDate(order.service.endDate)}</p>
                )}
              </div>
            </div>

            {/* Fizetési adatok */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Fizetési adatok</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><span className="font-medium">Státusz:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getPaymentStatusColor(order.payment.status)}`}>
                    {order.payment.status}
                  </span>
                </p>
                <p><span className="font-medium">Fizetési mód:</span> {order.payment.method || '-'}</p>
                <p><span className="font-medium">Tranzakció ID:</span> {order.payment.transactionId || '-'}</p>
                {order.payment.paidAt && (
                  <p><span className="font-medium">Fizetés dátuma:</span> {formatDate(order.payment.paidAt)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Jegyzetek */}
          <div className="mt-6">
            <h3 className="font-medium text-lg mb-4">Jegyzetek</h3>
            <div className="space-y-4">
              {order.notes.map((note, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">{formatDate(note.addedAt)} - {note.addedBy}</p>
                  <p className="mt-1">{note.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Műveletek */}
          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={() => handleStatusUpdate(order._id, 'processing')}
              disabled={order.status !== 'new'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Feldolgozás
            </button>
            <button
              onClick={() => handleStatusUpdate(order._id, 'active')}
              disabled={order.status !== 'processing'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Aktiválás
            </button>
            <button
              onClick={() => handleStatusUpdate(order._id, 'suspended')}
              disabled={order.status !== 'active'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Felfüggesztés
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Hosting Rendelések</h1>
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