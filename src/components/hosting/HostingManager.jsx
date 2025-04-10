import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import HostingTable from './HostingTable';
import HostingModal from './HostingModal';
import { AlertTriangle, DollarSign, Clock, Bell, RotateCw, History, Filter, RefreshCw, CheckCircle, X, Trash2, Edit } from 'lucide-react';
import { api } from '../../services/auth';

const formatCurrency = (amount) => `€${Math.round(amount).toLocaleString()}`;
const API_URL = 'https://admin.nb-studio.net:5001';

const HostingManager = () => {
  const [hostings, setHostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedHosting, setSelectedHosting] = useState(null);
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Sikeres művelet üzenet megjelenítése
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Lejáratig hátralévő napok számítása
  const calculateDaysUntilExpiry = (endDate) => {
    const today = new Date();
    const expiryDate = new Date(endDate);
    const diffTime = expiryDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Webtárhelyek lekérése
  useEffect(() => {
    fetchHostings();
  }, []);

  const fetchHostings = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/api/hostings`);
      
      if (!response.ok) {
        throw new Error('Nem sikerült lekérni a webtárhelyeket');
      }
      
      const data = await response.json();
      setHostings(data);
      setLoading(false);
    } catch (error) {
      console.error('Hiba a webtárhelyek lekérésekor:', error);
      setError('Nem sikerült betölteni a webtárhelyeket. Kérjük, próbálja újra.');
      setLoading(false);
    }
  };

  // Szűrt webtárhelyek
  const getFilteredHostings = () => {
    let filtered = [...hostings];
    
    // Lejárati szűrő
    if (expiryFilter !== 'all') {
      const now = new Date();
      if (expiryFilter === 'expired') {
        filtered = filtered.filter(hosting => new Date(hosting.service.endDate) < now);
      } else if (expiryFilter === '30days') {
        filtered = filtered.filter(hosting => {
          const days = calculateDaysUntilExpiry(hosting.service.endDate);
          return days >= 0 && days <= 30;
        });
      } else if (expiryFilter === '90days') {
        filtered = filtered.filter(hosting => {
          const days = calculateDaysUntilExpiry(hosting.service.endDate);
          return days >= 0 && days <= 90;
        });
      }
    }
    
    // Státusz szűrő
    if (statusFilter !== 'all') {
      filtered = filtered.filter(hosting => hosting.service.status === statusFilter);
    }
    
    // Keresés
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(hosting => 
        hosting.service.domainName.toLowerCase().includes(term) ||
        hosting.client.name.toLowerCase().includes(term) ||
        hosting.plan.name.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  const filteredHostings = getFilteredHostings();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Sikeres művelet üzenet */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Hiba üzenet */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
          <button onClick={() => setError(null)}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Webtárhely Kezelő</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              fetchHostings();
              showSuccessMessage('Webtárhelyek frissítve');
            }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Frissítés
          </button>
          <button
            onClick={() => {
              setSelectedHosting(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Új Webtárhely
          </button>
        </div>
      </div>
      
      {/* Szűrők */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Keresés</label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Domain név, ügyfél, vagy csomag..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lejárat szerint</label>
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Összes</option>
            <option value="expired">Lejárt</option>
            <option value="30days">30 napon belül lejár</option>
            <option value="90days">90 napon belül lejár</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Státusz szerint</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Összes</option>
            <option value="active">Aktív</option>
            <option value="pending">Függőben</option>
            <option value="suspended">Felfüggesztett</option>
            <option value="cancelled">Törölt</option>
          </select>
        </div>
      </div>
      
      {/* Webtárhely táblázat */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Csomag
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ügyfél
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lejárat
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Státusz
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projekt
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      <span className="ml-2">Betöltés...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredHostings.map((hosting) => {
                const daysUntilExpiry = calculateDaysUntilExpiry(hosting.service.endDate);
                const isExpired = daysUntilExpiry < 0;
                const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
                
                return (
                  <tr key={hosting._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{hosting.service.domainName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{hosting.plan.name}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(hosting.plan.price)}/{hosting.plan.billing === 'monthly' ? 'hó' : 'év'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{hosting.client.name}</div>
                      <div className="text-xs text-gray-500">{hosting.client.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isExpired ? 'text-red-600 font-semibold' : isExpiringSoon ? 'text-yellow-600' : 'text-gray-900'}`}>
                        {new Date(hosting.service.endDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {isExpired ? `${Math.abs(daysUntilExpiry)} napja lejárt` : `${daysUntilExpiry} nap múlva`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        hosting.service.status === 'active' ? 'bg-green-100 text-green-800' :
                        hosting.service.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        hosting.service.status === 'suspended' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {hosting.service.status === 'active' ? 'Aktív' :
                         hosting.service.status === 'pending' ? 'Függőben' :
                         hosting.service.status === 'suspended' ? 'Felfüggesztett' :
                         hosting.service.status === 'cancelled' ? 'Törölt' : 'Ismeretlen'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{hosting.projectName || 'Nincs projekt'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={() => {
                            setSelectedHosting(hosting);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-1.5 rounded"
                          title="Webtárhely Szerkesztése"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm('Biztosan törli ezt a webtárhelyet?')) return;
                            try {
                              await api.delete(`${API_URL}/api/hostings/${hosting._id}`);
                              await fetchHostings();
                              showSuccessMessage('Webtárhely sikeresen törölve');
                            } catch (error) {
                              console.error('Hiba:', error);
                              setError('Hiba történt a törlés során');
                            }
                          }}
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-1.5 rounded"
                          title="Webtárhely Törlése"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredHostings.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    Nincsenek a szűrőnek megfelelő webtárhelyek
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webtárhely létrehozás/szerkesztés modal */}
      {showModal && (
        <HostingModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedHosting(null);
          }}
          onSave={async (hostingData) => {
            try {
              if (hostingData._id) {
                // Meglévő webtárhely frissítése
                await api.put(`${API_URL}/api/hostings/${hostingData._id}`, hostingData);
                showSuccessMessage('Webtárhely sikeresen frissítve');
              } else {
                // Új webtárhely esetén hozzunk létre egy kezdeti előzmény bejegyzést
                const historyEntry = {
                  action: 'létrehozás',
                  date: new Date().toISOString(),
                  details: `Webtárhely létrehozva. Lejárat: ${new Date(hostingData.service.endDate).toLocaleDateString()}`
                };
                
                hostingData.history = [historyEntry];
                
                await api.post(`${API_URL}/api/hostings`, hostingData);
                showSuccessMessage('Webtárhely sikeresen hozzáadva');
              }
              await fetchHostings();
              setShowModal(false);
              setSelectedHosting(null);
            } catch (error) {
              console.error('Hiba:', error);
              setError('Hiba történt a webtárhely mentése során');
            }
          }}
          hosting={selectedHosting}
        />
      )}
    </div>
  );
};

export default HostingManager;
