import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import DomainTable from './DomainTable';
import DomainModal from './DomainModal';
import DomainRenewalModal from './DomainRenewalModal';
import DomainHistoryPanel from './DomainHistoryPanel';
import BudgetSummary from './BudgetSummary';
import { AlertTriangle, DollarSign, Clock, Bell, RotateCw, History, Filter, RefreshCw, CheckCircle, X, Trash2, Edit } from 'lucide-react';
import { api } from '../../services/auth';

const formatCurrency = (amount) => `€${Math.round(amount).toLocaleString()}`;
const API_URL = 'https://admin.nb-studio.net:5001';

const DomainManager = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');

  // Sikeres üzenet megjelenítése
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const calculateDaysUntilExpiry = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (daysUntil) => {
    if (daysUntil < 0) return 'bg-red-100 text-red-800';
    if (daysUntil <= 30) return 'bg-yellow-100 text-yellow-800';
    if (daysUntil <= 90) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/api/domains`);
      
      if (!response.ok) {
        throw new Error('Nem sikerült lekérni a domaineket');
      }
      
      const data = await response.json();
      setDomains(data);
      setLoading(false);
    } catch (error) {
      console.error('Hiba a domainek lekérésekor:', error);
      setError('Nem sikerült betölteni a domaineket. Kérjük, próbálja újra.');
      setLoading(false);
    }
  };

  // Domain hosszabbítás kezelése
  const handleRenewDomain = async (renewalData) => {
    try {
      const response = await api.put(`${API_URL}/api/domains/${renewalData._id}`, renewalData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Nem sikerült meghosszabbítani a domaint');
      }
      
      // Domainek frissítése
      await fetchDomains();
      showSuccessMessage(`${renewalData.name} domain sikeresen meghosszabbítva`);
      setShowRenewalModal(false);
      setSelectedDomain(null);
    } catch (error) {
      console.error('Hiba a domain hosszabbításakor:', error);
      setError(error.message || 'Hiba történt a domain hosszabbítása során');
    }
  };

  // Szűrt domainek
  const getFilteredDomains = () => {
    let filtered = [...domains];
    
    // Lejárati szűrő
    if (expiryFilter !== 'all') {
      const now = new Date();
      if (expiryFilter === 'expired') {
        filtered = filtered.filter(domain => new Date(domain.expiryDate) < now);
      } else if (expiryFilter === '30days') {
        filtered = filtered.filter(domain => {
          const days = calculateDaysUntilExpiry(domain.expiryDate);
          return days >= 0 && days <= 30;
        });
      } else if (expiryFilter === '90days') {
        filtered = filtered.filter(domain => {
          const days = calculateDaysUntilExpiry(domain.expiryDate);
          return days >= 0 && days <= 90;
        });
      }
    }
    
    // Státusz szűrő
    if (statusFilter === 'active') {
      filtered = filtered.filter(domain => domain.status === 'active');
    } else if (statusFilter === 'expired') {
      filtered = filtered.filter(domain => domain.status === 'expired');
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter(domain => domain.status === 'pending');
    }
    
    return filtered;
  };

  const filteredDomains = getFilteredDomains();

  useEffect(() => {
    fetchDomains();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
<div className="p-6 container mx-auto max-w-7xl">
      {/* Sikeres üzenet */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}

      {/* Hibaüzenet */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
          <button 
            className="ml-auto text-red-700 hover:text-red-900"
            onClick={() => setError(null)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Domain Kezelő</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              fetchDomains();
              showSuccessMessage('Domainek frissítve');
            }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Frissítés
          </button>
          <button
            onClick={() => {
              setSelectedDomain(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Új Domain
          </button>
        </div>
      </div>

      {/* Szűrők */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            <Filter className="h-5 w-5 mr-2 text-gray-500" />
            <span className="text-gray-700 font-medium">Szűrők:</span>
          </div>
          
          <div>
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Összes lejárat</option>
              <option value="expired">Lejárt</option>
              <option value="30days">30 napon belül lejáró</option>
              <option value="90days">90 napon belül lejáró</option>
            </select>
          </div>
          
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Összes állapot</option>
              <option value="active">Aktív</option>
              <option value="expired">Lejárt</option>
              <option value="pending">Függőben</option>
            </select>
          </div>
          
          <button
            onClick={() => {
              setExpiryFilter('all');
              setStatusFilter('all');
            }}
            className="px-3 py-2 text-gray-600 hover:text-gray-800"
          >
            Szűrők törlése
          </button>
        </div>
      </div>

      {/* Statisztikai kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Összes Domain</p>
                <p className="text-2xl font-bold">{domains.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Lejáró Domainek</p>
                <p className="text-2xl font-bold">
                  {domains.filter(d => {
                    const daysUntil = calculateDaysUntilExpiry(d.expiryDate);
                    return daysUntil <= 30 && daysUntil > 0;
                  }).length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Összes Költség / Év</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(domains.reduce((sum, domain) => sum + (domain.cost || 0), 0))}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Következő Lejárat</p>
                <p className="text-2xl font-bold">
                  {domains.length > 0 ? 
                    new Date(Math.min(...domains
                      .filter(d => new Date(d.expiryDate) > new Date())
                      .map(d => new Date(d.expiryDate))))
                      .toLocaleDateString() : 
                    '-'
                  }
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Domain lista kibővített műveletekkel */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-medium">Domainek ({filteredDomains.length})</h2>
          <div className="text-sm text-gray-500">
            {filteredDomains.length === domains.length ? 
              'Összes domain megjelenítve' : 
              `Szűrt: ${filteredDomains.length} / ${domains.length}`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Domain Név
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Regisztrátor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Lejárat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Éves Költség
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Státusz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fizetés
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDomains.map((domain) => {
                const daysUntil = calculateDaysUntilExpiry(domain.expiryDate);
                const statusColor = getStatusColor(daysUntil);
                const paymentStatusColor = getPaymentStatusColor(domain.paymentStatus);

                return (
                  <tr key={domain._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {domain.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {domain.registrar}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(domain.expiryDate).toLocaleDateString()}
                      <span className="text-xs ml-2">
                        ({daysUntil} nap)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(domain.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColor}`}>
                        {daysUntil < 0 ? 'Lejárt' :
                        daysUntil <= 30 ? 'Sürgős' :
                        daysUntil <= 90 ? 'Közelgő' : 'Rendben'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${paymentStatusColor}`}>
                        {domain.paymentStatus === 'paid' ? 'Kifizetve' :
                         domain.paymentStatus === 'pending' ? 'Függőben' :
                         domain.paymentStatus === 'overdue' ? 'Késedelmes' : 'Ismeretlen'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedDomain(domain);
                            setShowRenewalModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 p-1.5 rounded"
                          title="Domain Hosszabbítás"
                        >
                          <RotateCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDomain(domain);
                            setShowHistoryPanel(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded"
                          title="Előzmények Megtekintése"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDomain(domain);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-1.5 rounded"
                          title="Domain Szerkesztése"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm('Biztosan törli ezt a domaint?')) return;
                            try {
                              await api.delete(`${API_URL}/api/domains/${domain._id}`);
                              await fetchDomains();
                              showSuccessMessage('Domain sikeresen törölve');
                            } catch (error) {
                              console.error('Hiba:', error);
                              setError('Hiba történt a törlés során');
                            }
                          }}
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-1.5 rounded"
                          title="Domain Törlése"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDomains.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    Nincsenek a szűrőnek megfelelő domainek
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BudgetSummary 
        domains={domains} 
        formatCurrency={formatCurrency}
      />

      {/* Domain létrehozás/szerkesztés modal */}
      {showModal && (
        <DomainModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedDomain(null);
          }}
          onSave={async (domainData) => {
            try {
              // Ha szerkesztés, akkor írjuk az előzményekhez
              if (domainData._id) {
                const historyEntry = {
                  action: 'szerkesztés',
                  date: new Date().toISOString(),
                  details: `Domain adatok frissítve.`
                };
                
                // Ha nincs még előzmény tömb, hozzuk létre
                if (!domainData.history || !Array.isArray(domainData.history)) {
                  domainData.history = [historyEntry];
                } else {
                  domainData.history.push(historyEntry);
                }
                
                await api.put(`${API_URL}/api/domains/${domainData._id}`, domainData);
                showSuccessMessage('Domain sikeresen frissítve');
              } else {
                // Új domain esetén hozzunk létre egy kezdeti előzmény bejegyzést
                const historyEntry = {
                  action: 'létrehozás',
                  date: new Date().toISOString(),
                  details: `Domain létrehozva. Lejárat: ${new Date(domainData.expiryDate).toLocaleDateString()}`
                };
                
                domainData.history = [historyEntry];
                
                await api.post(`${API_URL}/api/domains`, domainData);
                showSuccessMessage('Domain sikeresen hozzáadva');
              }
              await fetchDomains();
              setShowModal(false);
              setSelectedDomain(null);
            } catch (error) {
              console.error('Hiba:', error);
              setError('Hiba történt a domain mentése során');
            }
          }}
          domain={selectedDomain}
        />
      )}

      {/* Domain hosszabbítás modal */}
      {showRenewalModal && (
        <DomainRenewalModal
          isOpen={showRenewalModal}
          onClose={() => {
            setShowRenewalModal(false);
            setSelectedDomain(null);
          }}
          onSave={handleRenewDomain}
          domain={selectedDomain}
        />
      )}

      {/* Domain előzmények panel */}
      {showHistoryPanel && selectedDomain && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <DomainHistoryPanel
            domain={selectedDomain}
            onClose={() => {
              setShowHistoryPanel(false);
              setSelectedDomain(null);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DomainManager;