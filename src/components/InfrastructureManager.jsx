import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Server, HardDrive, AlertTriangle, Key } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import ServerModal from './ServerModal';
import LicenseModal from './LicenseModal';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001'; // Az /api részt töröljük




const InfrastructureManager = () => {
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [showServerModal, setShowServerModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('servers'); // 'servers' vagy 'licenses'
  const [servers, setServers] = useState([]);
  const [licenses, setLicenses] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [serversData, licensesData] = await Promise.all([
        api.get(`${API_URL}/api/servers`).then(res => res.json()),
        api.get(`${API_URL}/api/licenses`).then(res => res.json())
      ]);
  
      setServers(serversData);
      setLicenses(licensesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Módosítsd a többi API hívást is:
  const handleAddServer = async (serverData) => {
    try {
      if (selectedServer) {
        // Ha van kiválasztott szerver, akkor frissítjük
        await api.put(`${API_URL}/api/servers/${selectedServer._id}`, serverData);
      } else {
        // Ha nincs kiválasztott szerver, új szervert hozunk létre
        await api.post(`${API_URL}/api/servers`, serverData);
      }
      await fetchData();
      setShowServerModal(false);
    } catch (error) {
      console.error('Hiba:', error);
      alert('Művelet sikertelen: ' + error.message);
    }
  };
  
  const handleAddLicense = async (licenseData) => {
    try {
      if (selectedLicense) {
        // Ha van kiválasztott licensz, akkor frissítjük
        await api.put(`${API_URL}/api/licenses/${selectedLicense._id}`, licenseData);
      } else {
        // Ha nincs kiválasztott licensz, új licenszet hozunk létre
        await api.post(`${API_URL}/api/licenses`, licenseData);
      }
      await fetchData();
      setShowLicenseModal(false);
    } catch (error) {
      console.error('Hiba:', error);
      alert('Művelet sikertelen: ' + error.message);
    }
  };
  
  const handleDeleteServer = async (serverId) => {
    if (window.confirm('Biztosan törli ezt a szervert?')) {
      try {
        await api.delete(`${API_URL}/api/servers/${serverId}`);
        await fetchData();
      } catch (error) {
        console.error('Hiba:', error);
        alert('Nem sikerült törölni a szervert: ' + error.message);
      }
    }
  };
  
  const handleDeleteLicense = async (licenseId) => {
    if (window.confirm('Biztosan törli ezt a licenszt?')) {
      try {
        await api.delete(`${API_URL}/api/licenses/${licenseId}`);
        await fetchData();
      } catch (error) {
        console.error('Hiba:', error);
        alert('Nem sikerült törölni a licenszt: ' + error.message);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatStorageSize = (gb) => {
    if (gb >= 1000) {
      return `${(gb / 1000).toFixed(1)} TB`;
    }
    return `${gb} GB`;
  };

  const calculateStorageUsage = (server) => {
    const { used, total } = server.specifications.storage;
    return (used / total * 100).toFixed(1);
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Infrastruktúra Kezelő</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setView('servers')}
            className={`px-4 py-2 rounded-lg ${
              view === 'servers' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Server className="w-5 h-5 inline-block mr-2" />
            Szerverek
          </button>
          <button
            onClick={() => setView('licenses')}
            className={`px-4 py-2 rounded-lg ${
              view === 'licenses' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Key className="w-5 h-5 inline-block mr-2" />
            Licenszek
          </button>
        </div>
      </div>

      {/* Összesítő kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Összes Szerver</p>
                <p className="text-2xl font-bold">{servers.length}</p>
              </div>
              <Server className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Aktív Licenszek</p>
                <p className="text-2xl font-bold">
                  {licenses.filter(l => l.status === 'active').length}
                </p>
              </div>
              <Key className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Teljes Tárhely Használat</p>
                <p className="text-2xl font-bold">
                  {formatStorageSize(
                    servers.reduce((sum, server) => 
                      sum + (server.specifications?.storage?.used || 0), 0)
                  )}
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Havi Költségek</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    servers.reduce((sum, server) => 
                      sum + (server.costs?.monthly || 0), 0)
                  )}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Táblázatok */}
      {view === 'servers' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Szerverek</h2>
            <button
  onClick={() => {
    setSelectedServer(null);
    setShowServerModal(true);
  }}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
  + Új Szerver
</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Név</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Típus</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Szolgáltató</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tárhely</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Havi Költség</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Állapot</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Műveletek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {servers.map((server) => (
                  <tr key={server._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="font-medium">{server.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize">{server.type}</td>
                    <td className="px-6 py-4">{server.provider?.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span>{formatStorageSize(server.specifications?.storage?.used)} / {formatStorageSize(server.specifications?.storage?.total)}</span>
                        <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className={`h-2 rounded-full ${
                              parseFloat(calculateStorageUsage(server)) > 80
                                ? 'bg-red-500'
                                : parseFloat(calculateStorageUsage(server)) > 60
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${calculateStorageUsage(server)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {formatCurrency(server.costs?.monthly)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        server.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : server.status === 'maintenance'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {server.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedServer(server);
                          setShowServerModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
  onClick={() => handleDeleteServer(server._id)}
  className="text-red-600 hover:text-red-900"
>
  <Trash2 className="h-5 w-5" />
</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Licenszek</h2>
            <button
  onClick={() => {
    setSelectedLicense(null);
    setShowLicenseModal(true);
  }}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
  + Új Licensz
</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Név</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Típus</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Szállító</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Következő Megújítás</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Megújítási Költség</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Állapot</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Műveletek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {licenses.map((license) => (
                  <tr key={license._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="font-medium">{license.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize">{license.type}</td>
                    <td className="px-6 py-4">{license.vendor?.name}</td>
                    <td className="px-6 py-4">
                      {license.renewal?.nextRenewalDate 
                        ? new Date(license.renewal.nextRenewalDate).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {formatCurrency(license.renewal?.cost)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        license.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : license.status === 'expired'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {license.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedLicense(license);
                          setShowLicenseModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
  onClick={() => handleDeleteLicense(license._id)}
  className="text-red-600 hover:text-red-900"
>
  <Trash2 className="h-5 w-5" />
</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showServerModal && (
  <ServerModal
    isOpen={showServerModal}
    onClose={() => setShowServerModal(false)}
    onSave={handleAddServer}
    server={selectedServer}
  />
)}

{showLicenseModal && (
  <LicenseModal
    isOpen={showLicenseModal}
    onClose={() => setShowLicenseModal(false)}
    onSave={handleAddLicense}
    license={selectedLicense}
  />
)}
    </div>
);
};

export default InfrastructureManager;
