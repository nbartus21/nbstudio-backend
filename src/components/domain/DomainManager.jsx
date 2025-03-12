import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';
import { 
  Globe, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  RotateCw,
  ArrowDown,
  Filter,
  ExternalLink,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const DomainManager = () => {
  // Állapot változók
  const [domains, setDomains] = useState([]);
  const [filteredDomains, setFilteredDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewalData, setRenewalData] = useState({
    expiryDate: '',
    cost: '',
    renewalDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [domainToRenew, setDomainToRenew] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // Szűrő állapotok
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [registrarFilter, setRegistrarFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [sortField, setSortField] = useState('expiryDate');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Sikeres művelet üzenet megjelenítése
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Domainek lekérése
  const fetchDomains = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`${API_URL}/domains`);
      
      if (!response.ok) {
        throw new Error('Nem sikerült lekérni a domaineket');
      }
      
      const data = await response.json();
      setDomains(data);
      setFilteredDomains(data);
      setLoading(false);
    } catch (error) {
      console.error('Hiba a domainek lekérésekor:', error);
      setError('Nem sikerült betölteni a domaineket. Kérjük, próbálja újra.');
      setLoading(false);
    }
  };

  // Domainek lekérése komponens betöltésekor
  useEffect(() => {
    fetchDomains();
  }, []);

  // Szűrők és rendezés alkalmazása
  useEffect(() => {
    let result = [...domains];
    
    // Keresési szűrő alkalmazása
    if (searchTerm) {
      result = result.filter(domain => 
        domain.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Állapot szűrő alkalmazása
    if (statusFilter !== 'all') {
      result = result.filter(domain => domain.status === statusFilter);
    }
    
    // Regisztrátor szűrő alkalmazása
    if (registrarFilter !== 'all') {
      result = result.filter(domain => domain.registrar === registrarFilter);
    }
    
    // Lejárati szűrő alkalmazása
    const now = new Date();
    if (expiryFilter === 'expired') {
      result = result.filter(domain => new Date(domain.expiryDate) < now);
    } else if (expiryFilter === '30days') {
      const thirtyDaysLater = new Date(now);
      thirtyDaysLater.setDate(now.getDate() + 30);
      result = result.filter(domain => {
        const expiryDate = new Date(domain.expiryDate);
        return expiryDate >= now && expiryDate <= thirtyDaysLater;
      });
    } else if (expiryFilter === '90days') {
      const ninetyDaysLater = new Date(now);
      ninetyDaysLater.setDate(now.getDate() + 90);
      result = result.filter(domain => {
        const expiryDate = new Date(domain.expiryDate);
        return expiryDate >= now && expiryDate <= ninetyDaysLater;
      });
    }
    
    // Rendezés alkalmazása
    result.sort((a, b) => {
      let valueA, valueB;
      
      if (sortField === 'expiryDate' || sortField === 'createdAt' || sortField === 'updatedAt') {
        valueA = new Date(a[sortField]);
        valueB = new Date(b[sortField]);
      } else if (sortField === 'cost') {
        valueA = a[sortField] || 0;
        valueB = b[sortField] || 0;
      } else {
        valueA = (a[sortField] || '').toString().toLowerCase();
        valueB = (b[sortField] || '').toString().toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    setFilteredDomains(result);
  }, [domains, searchTerm, statusFilter, registrarFilter, expiryFilter, sortField, sortDirection]);

  // Egyedi regisztrátorok lekérése a szűrő legördülő listához
  const uniqueRegistrars = [...new Set(domains.map(domain => domain.registrar))];

  // Dátum formázása YYYY-MM-DD formátumban
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };
  
  // Dátum formázása idő információval
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Ellenőrzi, hogy a domain lejárt-e
  const isDomainExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date();
  };

  // Ellenőrzi, hogy a domain hamarosan lejár-e (30 napon belül)
  const isDomainExpiringSoon = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    return expiry > now && expiry <= thirtyDaysFromNow;
  };

  // Hány nap van még a lejáratig
  const getDaysUntilExpiry = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Rendezés kezelése
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Domain hozzáadása vagy szerkesztése
  const handleSaveDomain = async () => {
    try {
      if (!selectedDomain.name || !selectedDomain.registrar || !selectedDomain.expiryDate) {
        setError('A domain név, regisztrátor és lejárati dátum megadása kötelező');
        return;
      }
      
      // Adatok formázása a megfelelő dátumkezelés érdekében
      const domainData = {
        ...selectedDomain,
        expiryDate: new Date(selectedDomain.expiryDate).toISOString(),
        cost: parseFloat(selectedDomain.cost) || 0
      };
      
      let response;
      
      if (selectedDomain._id) {
        // Meglévő domain frissítése
        response = await api.put(`${API_URL}/domains/${selectedDomain._id}`, domainData);
      } else {
        // Új domain létrehozása
        response = await api.post(`${API_URL}/domains`, domainData);
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Nem sikerült menteni a domaint');
      }
      
      // Domainek listájának frissítése
      await fetchDomains();
      
      // Sikeres üzenet megjelenítése
      showSuccessMessage(selectedDomain._id ? 'Domain sikeresen frissítve' : 'Domain sikeresen hozzáadva');
      
      // Felugró ablak bezárása
      setShowDomainModal(false);
      setSelectedDomain(null);
    } catch (error) {
      console.error('Hiba a domain mentésekor:', error);
      setError(error.message || 'Hiba történt a domain mentése során');
    }
  };

  // Domain meghosszabbításának kezelése
  const handleRenewDomain = async () => {
    try {
      if (!domainToRenew || !renewalData.expiryDate) {
        setError('A domain és az új lejárati dátum megadása kötelező');
        return;
      }
      
      const renewalDetails = {
        expiryDate: new Date(renewalData.expiryDate).toISOString(),
        cost: parseFloat(renewalData.cost) || domainToRenew.cost,
        status: 'active', // Hosszabbítás esetén az állapot aktívra állítása
        history: [
          ...(domainToRenew.history || []),
          {
            action: 'hosszabbítás',
            date: new Date().toISOString(),
            details: `Domain meghosszabbítva eddig: ${renewalData.expiryDate}. ${renewalData.notes}`
          }
        ]
      };
      
      const response = await api.put(`${API_URL}/domains/${domainToRenew._id}`, renewalDetails);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Nem sikerült meghosszabbítani a domaint');
      }
      
      // Domainek listájának frissítése
      await fetchDomains();
      
      // Sikeres üzenet megjelenítése
      showSuccessMessage(`${domainToRenew.name} domain sikeresen meghosszabbítva`);
      
      // Felugró ablak bezárása
      setShowRenewModal(false);
      setDomainToRenew(null);
      setRenewalData({
        expiryDate: '',
        cost: '',
        renewalDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } catch (error) {
      console.error('Hiba a domain hosszabbításakor:', error);
      setError(error.message || 'Hiba történt a domain hosszabbítása során');
    }
  };

  // Domain törlésének kezelése
  const handleDeleteDomain = async (domainId) => {
    try {
      const response = await api.delete(`${API_URL}/domains/${domainId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Nem sikerült törölni a domaint');
      }
      
      // Domain eltávolítása az állapotból
      setDomains(domains.filter(domain => domain._id !== domainId));
      
      // Sikeres üzenet megjelenítése
      showSuccessMessage('Domain sikeresen törölve');
      
      // Megerősítés visszaállítása
      setConfirmDelete(null);
    } catch (error) {
      console.error('Hiba a domain törlésekor:', error);
      setError(error.message || 'Hiba történt a domain törlése során');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hibaüzenet */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
          <button 
            className="ml-auto text-red-700 hover:text-red-900"
            onClick={() => setError(null)}
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Sikeres üzenet */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}

      {/* Fejléc */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Domain Kezelő</h1>
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
              setSelectedDomain({
                name: '',
                registrar: '',
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                cost: '',
                autoRenewal: false,
                status: 'active',
                notes: ''
              });
              setShowDomainModal(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Új Domain
          </button>
        </div>
      </div>

      {/* Szűrők */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keresés
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Domain keresése..."
                className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Állapot
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Összes állapot</option>
              <option value="active">Aktív</option>
              <option value="expired">Lejárt</option>
              <option value="pending">Függőben</option>
            </select>
          </div>
          
          <div className="w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Regisztrátor
            </label>
            <select
              value={registrarFilter}
              onChange={(e) => setRegistrarFilter(e.target.value)}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Összes regisztrátor</option>
              {uniqueRegistrars.map((registrar) => (
                <option key={registrar} value={registrar}>{registrar}</option>
              ))}
            </select>
          </div>
          
          <div className="w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lejárat
            </label>
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Összes domain</option>
              <option value="expired">Lejárt</option>
              <option value="30days">30 napon belül lejár</option>
              <option value="90days">90 napon belül lejár</option>
            </select>
          </div>
          
          <div>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setRegistrarFilter('all');
                setExpiryFilter('all');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Szűrők törlése
            </button>
          </div>
        </div>
      </div>

      {/* Táblázat */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Domain Név
                    {sortField === 'name' && (
                      <ArrowDown className={`h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('registrar')}
                >
                  <div className="flex items-center">
                    Regisztrátor
                    {sortField === 'registrar' && (
                      <ArrowDown className={`h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('expiryDate')}
                >
                  <div className="flex items-center">
                    Lejárati Dátum
                    {sortField === 'expiryDate' && (
                      <ArrowDown className={`h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Állapot
                    {sortField === 'status' && (
                      <ArrowDown className={`h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('cost')}
                >
                  <div className="flex items-center">
                    Költség
                    {sortField === 'cost' && (
                      <ArrowDown className={`h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Auto Hosszabbítás
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Utoljára Frissítve
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDomains.length > 0 ? (
                filteredDomains.map((domain) => {
                  const isExpired = isDomainExpired(domain.expiryDate);
                  const isExpiringSoon = isDomainExpiringSoon(domain.expiryDate);
                  const daysUntilExpiry = getDaysUntilExpiry(domain.expiryDate);
                  
                  return (
                    <tr 
                      key={domain._id}
                      className={`hover:bg-gray-50 ${isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-yellow-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Globe className={`h-5 w-5 mr-2 ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-yellow-500' : 'text-indigo-500'}`} />
                          <div>
                            <div className="font-medium text-gray-900">{domain.name}</div>
                            <a 
                              href={`https://${domain.name}`} 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-indigo-600 hover:text-indigo-900 flex items-center mt-1"
                            >
                              Weboldal megtekintése <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {domain.registrar}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(domain.expiryDate)}</div>
                        <div className={`text-xs ${
                          isExpired 
                            ? 'text-red-600 font-medium' 
                            : isExpiringSoon 
                              ? 'text-yellow-600 font-medium'
                              : 'text-gray-500'
                        }`}>
                          {isExpired 
                            ? 'Lejárt' 
                            : `${daysUntilExpiry} nap van hátra`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          domain.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : domain.status === 'expired'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {domain.status === 'active' ? 'Aktív' : 
                           domain.status === 'expired' ? 'Lejárt' : 'Függőben'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {domain.cost ? `${domain.cost} EUR` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {domain.autoRenewal ? (
                          <span className="text-green-600 font-medium flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Igen
                          </span>
                        ) : (
                          <span className="text-red-600 font-medium flex items-center">
                            <XCircle className="h-4 w-4 mr-1" />
                            Nem
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(domain.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setDomainToRenew(domain);
                              setRenewalData({
                                expiryDate: formatDate(new Date(domain.expiryDate).setFullYear(new Date(domain.expiryDate).getFullYear() + 1)),
                                cost: domain.cost,
                                renewalDate: new Date().toISOString().split('T')[0],
                                notes: ''
                              });
                              setShowRenewModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-1 rounded"
                            title="Domain Hosszabbítás"
                          >
                            <RotateCw className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDomain({
                                ...domain,
                                expiryDate: formatDate(domain.expiryDate)
                              });
                              setShowDomainModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-1 rounded"
                            title="Domain Szerkesztése"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(domain._id)}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-1 rounded"
                            title="Domain Törlése"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                        {confirmDelete === domain._id && (
                          <div className="mt-2 text-xs bg-red-50 p-2 rounded border border-red-200">
                            <p className="mb-1 font-medium">Törlés megerősítése?</p>
                            <div className="flex space-x-2 justify-end">
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded"
                              >
                                Mégsem
                              </button>
                              <button
                                onClick={() => handleDeleteDomain(domain._id)}
                                className="px-2 py-1 bg-red-600 text-white rounded"
                              >
                                Törlés
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    {domains.length > 0 
                      ? 'Nincsenek a szűrőnek megfelelő domainek' 
                      : 'Nincsenek domainek. Adja hozzá az első domaint!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Domain Űrlap Modal */}
      {showDomainModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedDomain._id ? 'Domain Szerkesztése' : 'Új Domain Hozzáadása'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain Név
                </label>
                <input
                  type="text"
                  value={selectedDomain.name}
                  onChange={(e) => setSelectedDomain({...selectedDomain, name: e.target.value})}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="pelda.hu"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regisztrátor
                </label>
                <input
                  type="text"
                  value={selectedDomain.registrar}
                  onChange={(e) => setSelectedDomain({...selectedDomain, registrar: e.target.value})}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="GoDaddy, Namecheap, stb."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lejárati Dátum
                </label>
                <input
                  type="date"
                  value={selectedDomain.expiryDate}
                  onChange={(e) => setSelectedDomain({...selectedDomain, expiryDate: e.target.value})}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Költség (EUR)
                </label>
                <input
                  type="number"
                  value={selectedDomain.cost}
                  onChange={(e) => setSelectedDomain({...selectedDomain, cost: e.target.value})}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Állapot
                </label>
                <select
                  value={selectedDomain.status}
                  onChange={(e) => setSelectedDomain({...selectedDomain, status: e.target.value})}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="active">Aktív</option>
                  <option value="expired">Lejárt</option>
                  <option value="pending">Függőben</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoRenewal"
                  checked={selectedDomain.autoRenewal}
                  onChange={(e) => setSelectedDomain({...selectedDomain, autoRenewal: e.target.checked})}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="autoRenewal" className="ml-2 block text-sm text-gray-700">
                  Automatikus Hosszabbítás Engedélyezve
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Megjegyzések
                </label>
                <textarea
                  value={selectedDomain.notes}
                  onChange={(e) => setSelectedDomain({...selectedDomain, notes: e.target.value})}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows="3"
                  placeholder="További információk erről a domainről..."
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => {
                  setShowDomainModal(false);
                  setSelectedDomain(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Mégsem
              </button>
              <button
                onClick={handleSaveDomain}
                className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {selectedDomain._id ? 'Domain Frissítése' : 'Domain Hozzáadása'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Domain Hosszabbítási Modal */}
      {showRenewModal && domainToRenew && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-xl font-semibold mb-2">Domain Hosszabbítás</h2>
            <p className="text-gray-600 mb-4">
              Erősítse meg a hosszabbítást: <span className="font-medium">{domainToRenew.name}</span>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jelenlegi Lejárati Dátum
                </label>
                <input
                  type="date"
                  value={formatDate(domainToRenew.expiryDate)}
                  className="w-full p-2 border rounded-md bg-gray-50 text-gray-500"
                  disabled
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Új Lejárati Dátum
                </label>
                <input
                  type="date"
                  value={renewalData.expiryDate}
                  onChange={(e) => setRenewalData({...renewalData, expiryDate: e.target.value})}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hosszabbítás Költsége (EUR)
                </label>
                <input
                  type="number"
                  value={renewalData.cost}
                  onChange={(e) => setRenewalData({...renewalData, cost: e.target.value})}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hosszabbítás Dátuma (Mikor hosszabbította meg)
                </label>
                <input
                  type="date"
                  value={renewalData.renewalDate}
                  onChange={(e) => setRenewalData({...renewalData, renewalDate: e.target.value})}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hosszabbítási Megjegyzések
                </label>
                <textarea
                  value={renewalData.notes}
                  onChange={(e) => setRenewalData({...renewalData, notes: e.target.value})}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows="3"
                  placeholder="További információk erről a hosszabbításról..."
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => {
                  setShowRenewModal(false);
                  setDomainToRenew(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Mégsem
              </button>
              <button
                onClick={handleRenewDomain}
                className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Hosszabbítás Megerősítése
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Domain Előzmények Modal */}
      {selectedDomain && selectedDomain.history && selectedDomain.history.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Előzmények: {selectedDomain.name}
              </h2>
              <button
                onClick={() => setSelectedDomain(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-96">
              <div className="space-y-4">
                {selectedDomain.history.map((historyItem, index) => (
                  <div key={index} className="border-l-4 border-indigo-500 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-gray-900">{historyItem.action}</span>
                        <p className="text-gray-700 text-sm mt-1">{historyItem.details}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(historyItem.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => setSelectedDomain(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainManager;