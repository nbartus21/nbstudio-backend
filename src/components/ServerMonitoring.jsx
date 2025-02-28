import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { 
  Server, HardDrive, Database, Cpu, Wifi, Shield, 
  AlertTriangle, Check, X, RefreshCcw, Settings, 
  Download, Upload, Clock, Terminal, Trash2, PowerOff
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const ServerMonitoring = () => {
  // State
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalServers: 0,
    onlineServers: 0,
    offlineServers: 0,
    warningServers: 0,
    criticalServers: 0,
    averageUsage: {
      avgCpuUsage: 0,
      avgMemoryUsage: 0,
      avgDiskUsage: 0
    }
  });
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showUninstallModal, setShowUninstallModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [newServerData, setNewServerData] = useState({
    hostname: '',
    ip_address: '',
    os: ''
  });
  const [installCommand, setInstallCommand] = useState('');
  const [uninstallCommand, setUninstallCommand] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(30); // másodperc
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Refs for charts
  const chartRefs = useRef({
    cpu: null,
    memory: null,
    disk: null
  });

  // Adatok lekérése
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [serversRes, summaryRes] = await Promise.all([
        api.get(`${API_URL}/monitoring/servers`),
        api.get(`${API_URL}/monitoring/summary`)
      ]);
      
      const serversData = await serversRes.json();
      const summaryData = await summaryRes.json();
      
      setServers(serversData);
      setSummary(summaryData);
      
      // Ha van kiválasztott szerver, frissítjük annak adatait is
      if (selectedServer) {
        const serverRes = await api.get(`${API_URL}/monitoring/servers/${selectedServer.server_id}`);
        if (serverRes.ok) {
          const serverData = await serverRes.json();
          setSelectedServer(serverData);
        } else {
          // Ha a szerver már nem létezik, töröljük a kiválasztást
          setSelectedServer(null);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Hiba az adatok lekérésekor:', error);
      setError('Nem sikerült kapcsolódni a szerverhez. Kérjük, próbálja újra később.');
      setLoading(false);
    }
  };

  // Komponens betöltésekor lekérjük az adatokat
  useEffect(() => {
    fetchData();
    
    // Auto refresh beállítása
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchData();
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  // Riasztás nyugtázása
  const acknowledgeAlert = async (alertId) => {
    try {
      if (!selectedServer) return;
      
      const response = await api.put(`${API_URL}/monitoring/servers/${selectedServer.server_id}/alerts/${alertId}/acknowledge`);
      if (!response.ok) {
        throw new Error('Nem sikerült nyugtázni a riasztást');
      }
      
      // Frissítjük a szerver adatait
      const serverRes = await api.get(`${API_URL}/monitoring/servers/${selectedServer.server_id}`);
      const serverData = await serverRes.json();
      setSelectedServer(serverData);
      setSuccess('Riasztás sikeresen nyugtázva');
    } catch (error) {
      console.error('Hiba a riasztás nyugtázásakor:', error);
      setError('Nem sikerült nyugtázni a riasztást: ' + error.message);
    }
  };

  // Minden riasztás nyugtázása
  const acknowledgeAllAlerts = async () => {
    try {
      if (!selectedServer) return;
      
      const response = await api.put(`${API_URL}/monitoring/servers/${selectedServer.server_id}/alerts/acknowledge-all`);
      if (!response.ok) {
        throw new Error('Nem sikerült nyugtázni a riasztásokat');
      }
      
      // Frissítjük a szerver adatait
      const serverRes = await api.get(`${API_URL}/monitoring/servers/${selectedServer.server_id}`);
      const serverData = await serverRes.json();
      setSelectedServer(serverData);
      setSuccess('Minden riasztás sikeresen nyugtázva');
    } catch (error) {
      console.error('Hiba az összes riasztás nyugtázásakor:', error);
      setError('Nem sikerült nyugtázni a riasztásokat: ' + error.message);
    }
  };

  // Új szerver regisztrálása
  const registerNewServer = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.post(`${API_URL}/monitoring/servers`, newServerData);
      
      if (!response.ok) {
        throw new Error('Nem sikerült regisztrálni a szervert');
      }
      
      const data = await response.json();
      
      // Mentjük a telepítési parancsot
      setInstallCommand(data.installCommand);
      setSuccess('Szerver sikeresen regisztrálva');
      
      // Frissítjük a szerverek listáját
      fetchData();
    } catch (error) {
      console.error('Hiba a szerver regisztrációjakor:', error);
      setError('Nem sikerült regisztrálni a szervert: ' + error.message);
    }
  };

  // Szerver törlése
  const deleteServer = async () => {
    try {
      if (!selectedServer) return;
      
      const response = await api.delete(`${API_URL}/monitoring/servers/${selectedServer.server_id}`);
      
      if (!response.ok) {
        throw new Error('Nem sikerült törölni a szervert');
      }
      
      setSuccess('Szerver sikeresen törölve');
      setShowDeleteConfirmModal(false);
      setSelectedServer(null);
      
      // Frissítjük a szerverek listáját
      fetchData();
    } catch (error) {
      console.error('Hiba a szerver törlésekor:', error);
      setError('Nem sikerült törölni a szervert: ' + error.message);
    }
  };

  // Uninstall command generálása
  const generateUninstallCommand = () => {
    if (!selectedServer) return;
    
    const cmd = `curl -sSL https://admin.nb-studio.net:5001/api/monitoring/uninstall.sh | sudo bash -s -- --server-id ${selectedServer.server_id}`;
    setUninstallCommand(cmd);
    setShowUninstallModal(true);
  };

  // Health Score színe a pontszám alapján
  const getHealthScoreColor = (score) => {
    if (score >= 90) return '#10B981'; // zöld
    if (score >= 70) return '#22D3EE'; // kék
    if (score >= 50) return '#F59E0B'; // narancs
    return '#EF4444'; // piros
  };

  // Status ikon és szín
  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <div className="flex items-center text-green-500"><Check className="w-4 h-4 mr-1" /> Online</div>;
      case 'offline':
        return <div className="flex items-center text-red-500"><X className="w-4 h-4 mr-1" /> Offline</div>;
      case 'warning':
        return <div className="flex items-center text-yellow-500"><AlertTriangle className="w-4 h-4 mr-1" /> Warning</div>;
      case 'maintenance':
        return <div className="flex items-center text-blue-500"><Settings className="w-4 h-4 mr-1" /> Maintenance</div>;
      default:
        return <div className="flex items-center text-gray-500"><Clock className="w-4 h-4 mr-1" /> Unknown</div>;
    }
  };

  // Formázott méretadatok
  const formatByteSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Utolsó látott formázása
  const formatLastSeen = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // másodpercek
    
    if (diff < 60) return `${diff} másodperce`;
    if (diff < 3600) return `${Math.floor(diff / 60)} perce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} órája`;
    return `${Math.floor(diff / 86400)} napja`;
  };

  return (
    <div className="p-6">
      {/* Hibaüzenetek */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Sikeres művelet üzenetek */}
      {success && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg border border-green-300 flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Fejléc */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Szerver Monitoring</h1>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm">Auto-frissítés</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="ml-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              disabled={!autoRefresh}
            >
              <option value="10">10s</option>
              <option value="30">30s</option>
              <option value="60">1p</option>
              <option value="300">5p</option>
            </select>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Frissítés
          </button>
          <button
            onClick={() => setShowInstallModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Server className="h-4 w-4 mr-2" />
            Új szerver
          </button>
        </div>
      </div>

      {/* Összesítő kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Összes Szerver</p>
                <p className="text-2xl font-bold">{summary.totalServers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Server className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Online</p>
                <p className="text-2xl font-bold text-green-600">{summary.onlineServers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Offline</p>
                <p className="text-2xl font-bold text-red-600">{summary.offlineServers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Figyelmeztetés</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.warningServers}</p>
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
                <p className="text-sm text-gray-500">Kritikus</p>
                <p className="text-2xl font-bold text-red-600">{summary.criticalServers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fő tartalom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Szerverek lista */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Szerverek</CardTitle>
            </CardHeader>
            <div className="overflow-y-auto max-h-[600px]">
              <ul className="divide-y">
                {servers.map(server => (
                  <li 
                    key={server.server_id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      selectedServer?.server_id === server.server_id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedServer(server)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{server.hostname}</h3>
                        <p className="text-sm text-gray-500">{server.ip_address || 'N/A'}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        {getStatusIcon(server.status)}
                        <p className="text-xs text-gray-500">
                          {server.last_seen ? formatLastSeen(server.last_seen) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Ha vannak aktív riasztások, kijelezzük */}
                    {server.alerts && server.alerts.filter(a => !a.acknowledged).length > 0 && (
                      <div className="mt-2 flex items-center text-red-500">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        <span className="text-xs">
                          {server.alerts.filter(a => !a.acknowledged).length} aktív riasztás
                        </span>
                      </div>
                    )}
                    
                    {/* Health score */}
                    {server.healthScore !== undefined && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 flex justify-between">
                          <span>Health Score</span>
                          <span style={{ color: getHealthScoreColor(server.healthScore) }}>
                            {server.healthScore}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="h-1.5 rounded-full"
                            style={{ 
                              width: `${server.healthScore}%`,
                              backgroundColor: getHealthScoreColor(server.healthScore)
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </li>
                ))}
                
                {servers.length === 0 && (
                  <li className="p-4 text-center text-gray-500">
                    Nincsenek monitorozott szerverek
                  </li>
                )}
              </ul>
            </div>
          </Card>
        </div>

        {/* Szerver részletek */}
        <div className="lg:col-span-2">
          {selectedServer ? (
            <Card>
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>{selectedServer.hostname}</CardTitle>
                  <div className="flex space-x-2">
                    {selectedServer.alerts && selectedServer.alerts.filter(a => !a.acknowledged).length > 0 && (
                      <button
                        onClick={acknowledgeAllAlerts}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded"
                      >
                        Összes nyugtázása
                      </button>
                    )}
                    <div className="text-sm">
                      {getStatusIcon(selectedServer.status)}
                    </div>
                    
                    {/* Szerver törlés és uninstall gombok */}
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={generateUninstallCommand}
                        className="p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        title="Monitoring ügynök eltávolítása"
                      >
                        <PowerOff className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirmModal(true)}
                        className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                        title="Szerver törlése a monitoring rendszerből"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {/* Tab navigáció */}
              <div className="border-b">
                <nav className="flex">
                  <button
                    onClick={() => setSelectedTab('overview')}
                    className={`px-4 py-3 font-medium text-sm ${
                      selectedTab === 'overview' 
                        ? 'border-b-2 border-blue-500 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Áttekintés
                  </button>
                  <button
                    onClick={() => setSelectedTab('performance')}
                    className={`px-4 py-3 font-medium text-sm ${
                      selectedTab === 'performance' 
                        ? 'border-b-2 border-blue-500 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Teljesítmény
                  </button>
                  <button
                    onClick={() => setSelectedTab('network')}
                    className={`px-4 py-3 font-medium text-sm ${
                      selectedTab === 'network' 
                        ? 'border-b-2 border-blue-500 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Hálózat
                  </button>
                  <button
                    onClick={() => setSelectedTab('security')}
                    className={`px-4 py-3 font-medium text-sm ${
                      selectedTab === 'security' 
                        ? 'border-b-2 border-blue-500 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Biztonság
                  </button>
                  <button
                    onClick={() => setSelectedTab('alerts')}
                    className={`px-4 py-3 font-medium text-sm ${
                      selectedTab === 'alerts' 
                        ? 'border-b-2 border-blue-500 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Riasztások
                    {selectedServer.alerts && selectedServer.alerts.filter(a => !a.acknowledged).length > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                        {selectedServer.alerts.filter(a => !a.acknowledged).length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedTab('settings')}
                    className={`px-4 py-3 font-medium text-sm ${
                      selectedTab === 'settings' 
                        ? 'border-b-2 border-blue-500 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Beállítások
                  </button>
                </nav>
              </div>
              
              {/* Tab tartalom */}
              <CardContent className="p-4">
                {selectedTab === 'overview' && (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Rendszer információk */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Rendszer információk</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Szerver ID:</span>
                            <span className="text-sm font-medium">{selectedServer.server_id || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">IP cím:</span>
                            <span className="text-sm font-medium">{selectedServer.ip_address || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Operációs rendszer:</span>
                            <span className="text-sm font-medium">{selectedServer.os || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Kernel verzió:</span>
                            <span className="text-sm font-medium">{selectedServer.system_info?.kernel_version || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Uptime:</span>
                            <span className="text-sm font-medium">{selectedServer.uptime || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Utoljára látva:</span>
                            <span className="text-sm font-medium">
                              {selectedServer.last_seen ? formatLastSeen(selectedServer.last_seen) : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Regisztrálva:</span>
                            <span className="text-sm font-medium">
                              {selectedServer.registration_time ? new Date(selectedServer.registration_time).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Hardware információk */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Hardware</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">CPU:</span>
                            <span className="text-sm font-medium">
                              {selectedServer.system_info?.cpu?.model || 'N/A'}
                              {selectedServer.system_info?.cpu?.cores && ` (${selectedServer.system_info.cpu.cores} mag)`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">CPU sebesség:</span>
                            <span className="text-sm font-medium">
                              {selectedServer.system_info?.cpu?.speed_mhz 
                                ? `${selectedServer.system_info.cpu.speed_mhz} MHz` 
                                : 'N/A'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Memória:</span>
                            <span className="text-sm font-medium">
                              {selectedServer.system_info?.memory?.total_mb
                                ? `${(selectedServer.system_info.memory.total_mb / 1024).toFixed(1)} GB`
                                : 'N/A'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Lemez:</span>
                            <span className="text-sm font-medium">
                              {selectedServer.system_info?.disk?.total || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Fájlrendszer:</span>
                            <span className="text-sm font-medium">
                              {selectedServer.system_info?.disk?.filesystem || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">I/O Sebesség:</span>
                            <span className="text-sm font-medium">
                              {selectedServer.system_info?.disk?.io_speed_mbps 
                                ? `${selectedServer.system_info.disk.io_speed_mbps} MB/s` 
                                : 'N/A'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">I/O Latency:</span>
                            <span className="text-sm font-medium">
                              {selectedServer.system_info?.disk?.io_latency_ms 
                                ? `${selectedServer.system_info.disk.io_latency_ms} ms` 
                                : 'N/A'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Erőforrás használat */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* CPU használat */}
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium">CPU Használat</h3>
                          <Cpu className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="text-2xl font-bold">
                            {selectedServer.system_info?.cpu?.usage_percent !== undefined
                              ? `${selectedServer.system_info.cpu.usage_percent.toFixed(1)}%`
                              : 'N/A'
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            Terhelés: {selectedServer.system_info?.cpu?.load || 'N/A'}
                          </div>
                        </div>
                        
                        {selectedServer.system_info?.cpu?.usage_percent !== undefined && (
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div
                              className="h-2.5 rounded-full"
                              style={{ 
                                width: `${selectedServer.system_info.cpu.usage_percent}%`,
                                backgroundColor: selectedServer.system_info.cpu.usage_percent > 90
                                  ? '#EF4444'  // piros
                                  : selectedServer.system_info.cpu.usage_percent > 70
                                    ? '#F59E0B'  // narancs
                                    : '#10B981'  // zöld
                              }}
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Memória használat */}
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium">Memória Használat</h3>
                          <Database className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="text-2xl font-bold">
                            {selectedServer.system_info?.memory?.usage_percent !== undefined
                              ? `${selectedServer.system_info.memory.usage_percent.toFixed(1)}%`
                              : 'N/A'
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            {selectedServer.system_info?.memory
                              ? `${(selectedServer.system_info.memory.used_mb / 1024).toFixed(1)} / ${(selectedServer.system_info.memory.total_mb / 1024).toFixed(1)} GB`
                              : 'N/A'
                            }
                          </div>
                        </div>
                        
                        {selectedServer.system_info?.memory?.usage_percent !== undefined && (
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div
                              className="h-2.5 rounded-full"
                              style={{ 
                                width: `${selectedServer.system_info.memory.usage_percent}%`,
                                backgroundColor: selectedServer.system_info.memory.usage_percent > 90
                                  ? '#EF4444'  // piros
                                  : selectedServer.system_info.memory.usage_percent > 70
                                    ? '#F59E0B'  // narancs
                                    : '#10B981'  // zöld
                              }}
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Lemez használat */}
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium">Lemez Használat</h3>
                          <HardDrive className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="text-2xl font-bold">
                            {selectedServer.system_info?.disk?.usage_percent !== undefined
                              ? `${selectedServer.system_info.disk.usage_percent}%`
                              : 'N/A'
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            {selectedServer.system_info?.disk
                              ? `${selectedServer.system_info.disk.used} / ${selectedServer.system_info.disk.total}`
                              : 'N/A'
                            }
                          </div>
                        </div>
                        
                        {selectedServer.system_info?.disk?.usage_percent !== undefined && (
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div
                              className="h-2.5 rounded-full"
                              style={{ 
                                width: `${selectedServer.system_info.disk.usage_percent}%`,
                                backgroundColor: selectedServer.system_info.disk.usage_percent > 90
                                  ? '#EF4444'  // piros
                                  : selectedServer.system_info.disk.usage_percent > 70
                                    ? '#F59E0B'  // narancs
                                    : '#10B981'  // zöld
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Aktív processek */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h3 className="font-medium mb-3">Top Processek</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Név</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CPU %</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Memória %</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Felhasználó</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedServer.processes 
                              ? selectedServer.processes.map((process, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="px-4 py-2 text-sm">{process.pid}</td>
                                  <td className="px-4 py-2 text-sm">{process.name}</td>
                                  <td className="px-4 py-2 text-sm">{process.cpu}%</td>
                                  <td className="px-4 py-2 text-sm">{process.memory}%</td>
                                  <td className="px-4 py-2 text-sm">{process.user}</td>
                                </tr>
                              ))
                              : <tr><td colSpan="5" className="px-4 py-2 text-center text-gray-500">Nincs elérhető process információ</td></tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Aktív szolgáltatások */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-3">Aktív Szolgáltatások</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {selectedServer.services && selectedServer.services.length > 0 
                          ? selectedServer.services.map((service, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <Terminal className="h-4 w-4 text-gray-400" />
                              <span className="truncate">{service}</span>
                            </div>
                          ))
                          : <p className="text-sm text-gray-500">Nincs elérhető szolgáltatás információ</p>
                        }
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedTab === 'performance' && (
                  <div>
                    <h3 className="font-medium mb-4">Teljesítmény Adatok</h3>
                    
                    {selectedServer.history && selectedServer.history.length > 0 ? (
                      <div className="space-y-6">
                        {/* CPU történeti grafikon */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">CPU Használat Történet</h4>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={selectedServer.history.slice(-30)}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                ref={ref => chartRefs.current.cpu = ref}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="timestamp" 
                                  tickFormatter={(timestamp) => {
                                    return new Date(timestamp).toLocaleTimeString();
                                  }}
                                />
                                <YAxis domain={[0, 100]} />
                                <Tooltip 
                                  formatter={(value) => [`${value}%`, 'CPU Használat']}
                                  labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                                />
                                <Legend />
                                <Line 
                                  type="monotone" 
                                  dataKey="cpu_usage" 
                                  stroke="#3B82F6" 
                                  name="CPU Használat"
                                  strokeWidth={2}
                                  dot={false}
                                  activeDot={{ r: 8 }}
                                  isAnimationActive={false}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="load_avg_1m" 
                                  stroke="#8884d8" 
                                  name="Load (1m)"
                                  strokeWidth={1}
                                  strokeDasharray="5 5"
                                  dot={false}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        
                        {/* Memória történeti grafikon */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">Memória Használat Történet</h4>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={selectedServer.history.slice(-30)}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                ref={ref => chartRefs.current.memory = ref}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="timestamp" 
                                  tickFormatter={(timestamp) => {
                                    return new Date(timestamp).toLocaleTimeString();
                                  }}
                                />
                                <YAxis domain={[0, 100]} />
                                <Tooltip 
                                  formatter={(value) => [`${value}%`, 'Memória Használat']}
                                  labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                                />
                                <Legend />
                                <Area 
                                  type="monotone" 
                                  dataKey="memory_usage" 
                                  stroke="#8B5CF6" 
                                  fill="#DDD6FE"
                                  name="Memória Használat"
                                  strokeWidth={2}
                                  isAnimationActive={false}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="swap_usage" 
                                  stroke="#EC4899" 
                                  fill="#FBCFE8"
                                  name="Swap Használat"
                                  strokeWidth={1}
                                  isAnimationActive={false}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        
                        {/* Lemez használat történeti grafikon */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">Lemez Használat és I/O Történet</h4>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={selectedServer.history.slice(-30)}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                ref={ref => chartRefs.current.disk = ref}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="timestamp" 
                                  tickFormatter={(timestamp) => {
                                    return new Date(timestamp).toLocaleTimeString();
                                  }}
                                />
                                <YAxis yAxisId="left" domain={[0, 100]} />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip 
                                  formatter={(value, name) => {
                                    if (name === 'Lemez Használat') return [`${value}%`, name];
                                    return [`${value} MB/s`, name];
                                  }}
                                  labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                                />
                                <Legend />
                                <Line 
                                  type="monotone" 
                                  dataKey="disk_usage" 
                                  stroke="#10B981" 
                                  name="Lemez Használat"
                                  yAxisId="left"
                                  strokeWidth={2}
                                  dot={false}
                                  isAnimationActive={false}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="disk_read_mbps" 
                                  stroke="#3B82F6" 
                                  name="Olvasás (MB/s)"
                                  yAxisId="right"
                                  strokeWidth={1}
                                  strokeDasharray="3 3"
                                  dot={false}
                                  isAnimationActive={false}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="disk_write_mbps" 
                                  stroke="#F59E0B" 
                                  name="Írás (MB/s)"
                                  yAxisId="right"
                                  strokeWidth={1}
                                  strokeDasharray="3 3"
                                  dot={false}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-6">
                        Nincs elérhető történeti adat
                      </p>
                    )}
                  </div>
                )}
                
                {selectedTab === 'network' && (
                  <div>
                    <h3 className="font-medium mb-4">Hálózati Információk</h3>
                    
                    {/* Hálózati interfészek */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                      <h4 className="text-sm font-medium mb-3">Hálózati Interfészek</h4>
                      {selectedServer.network?.interfaces && selectedServer.network.interfaces.length > 0 ? (
                        <div className="space-y-3">
                          {selectedServer.network.interfaces.map((iface, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                              <div>
                                <p className="font-medium">{iface.name}</p>
                                <p className="text-sm text-gray-500">MAC: {iface.mac}</p>
                                {iface.is_virtual && (
                                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                    Virtuális
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{iface.ip}</p>
                                {iface.ipv6 && (
                                  <p className="text-sm text-gray-500">IPv6: {iface.ipv6}</p>
                                )}
                                {iface.tx_bytes && iface.rx_bytes && (
                                  <p className="text-xs text-gray-500">
                                    TX: {formatByteSize(iface.tx_bytes)} | RX: {formatByteSize(iface.rx_bytes)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">Nincs elérhető hálózati interfész információ</p>
                      )}
                    </div>
                    
                    {/* Hálózati statisztikák */}
                    <div className="bg-white p-4 rounded-lg border mb-6">
                      <h4 className="text-sm font-medium mb-3">Hálózati Statisztikák</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Aktív Kapcsolatok</p>
                          <p className="text-xl font-bold">
                            {selectedServer.network?.active_connections || 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Elküldött Adatok</p>
                          <p className="text-xl font-bold">
                            {selectedServer.network?.total_tx_bytes 
                              ? formatByteSize(selectedServer.network?.total_tx_bytes) 
                              : 'N/A'
                            }
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Fogadott Adatok</p>
                          <p className="text-xl font-bold">
                            {selectedServer.network?.total_rx_bytes 
                              ? formatByteSize(selectedServer.network?.total_rx_bytes) 
                              : 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Internet sebesség */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Speedtest eredmények */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="text-sm font-medium mb-3">Internet Sebesség</h4>
                        
                        {selectedServer.network?.speedtest ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Download className="h-5 w-5 text-green-500 mr-2" />
                                <span className="text-sm font-medium">Letöltés</span>
                              </div>
                              <span className="font-bold">
                                {(selectedServer.network.speedtest.download / 1000000).toFixed(2)} Mbps
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Upload className="h-5 w-5 text-blue-500 mr-2" />
                                <span className="text-sm font-medium">Feltöltés</span>
                              </div>
                              <span className="font-bold">
                                {(selectedServer.network.speedtest.upload / 1000000).toFixed(2)} Mbps
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                                <span className="text-sm font-medium">Ping</span>
                              </div>
                              <span className="font-bold">
                                {selectedServer.network.speedtest.ping.toFixed(2)} ms
                              </span>
                            </div>
                            
                            <div className="text-xs text-gray-500 mt-2">
                              Speedtest szerver: {selectedServer.network.speedtest.server?.host || 'N/A'}
                              {selectedServer.network.speedtest.timestamp && (
                                <p>
                                  Mérés ideje: {new Date(selectedServer.network.speedtest.timestamp).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500">Nincs elérhető internet sebesség információ</p>
                        )}
                      </div>
                      
                      {/* Ping eredmények */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="text-sm font-medium mb-3">Ping Eredmények</h4>
                        
                        {selectedServer.network?.ping_results ? (
                          <div className="space-y-2">
                            {Object.entries(selectedServer.network.ping_results).map(([host, ping]) => (
                              <div key={host} className="flex justify-between items-center">
                                <span className="text-sm">{host}</span>
                                <span className={`font-medium ${
                                  ping > 100 ? 'text-red-500' : 
                                  ping > 50 ? 'text-yellow-500' : 
                                  'text-green-500'
                                }`}>
                                  {ping} ms
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">Nincs elérhető ping információ</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Hálózati forgalom történet */}
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="text-sm font-medium mb-3">Hálózati Forgalom Történet</h4>
                      
                      {selectedServer.history && selectedServer.history.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={selectedServer.history.slice(-30)}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="timestamp" 
                                tickFormatter={(timestamp) => {
                                  return new Date(timestamp).toLocaleTimeString();
                                }}
                              />
                              <YAxis />
                              <Tooltip 
                                formatter={(value) => [`${formatByteSize(value)}/s`, value === 'network_rx' ? 'Fogadott' : 'Küldött']}
                                labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                              />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="network_rx" 
                                stroke="#3B82F6" 
                                name="Fogadott"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="network_tx" 
                                stroke="#F59E0B" 
                                name="Küldött"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-6">
                          Nincs elérhető hálózati forgalom történeti adat
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedTab === 'security' && (
                  <div>
                    <h3 className="font-medium mb-4">Biztonsági Információk</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Nyitott portok */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="text-sm font-medium mb-3">Nyitott Portok</h4>
                        
                        {selectedServer.security?.open_ports && selectedServer.security.open_ports.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2">
                            {selectedServer.security.open_ports.map((port, index) => (
                              <div key={index} className="px-2 py-1 bg-gray-100 rounded text-center text-sm">
                                <span>{port}</span>
                                {selectedServer.security.ports_info && selectedServer.security.ports_info[port] && (
                                  <span className="block text-xs text-gray-500 truncate" title={selectedServer.security.ports_info[port]}>
                                    {selectedServer.security.ports_info[port]}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">Nincs elérhető port információ</p>
                        )}
                      </div>
                      
                      {/* SSH kapcsolatok */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="text-sm font-medium mb-3">SSH Kapcsolatok</h4>
                        
                        {selectedServer.security?.active_ssh_connections !== undefined ? (
                          selectedServer.security?.ssh_sessions && selectedServer.security.ssh_sessions.length > 0 ? (
                            <div className="space-y-2">
                              {selectedServer.security.ssh_sessions.map((session, index) => (
                                <div key={index} className="p-2 bg-gray-50 rounded">
                                  <div className="flex justify-between">
                                    <span className="text-sm font-medium">{session.user}@{session.source}</span>
                                    <span className="text-xs text-gray-500">{session.duration || 'N/A'}</span>
                                  </div>
                                  {session.login_time && (
                                    <div className="text-xs text-gray-500">
                                      Bejelentkezés: {new Date(session.login_time).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Terminal className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="font-medium">
                                {selectedServer.security.active_ssh_connections} aktív kapcsolat
                              </span>
                            </div>
                          )
                        ) : (
                          <p className="text-gray-500">Nincs elérhető SSH kapcsolat információ</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Rendszerfrissítések és sikertelen bejelentkezések */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Rendszerfrissítések */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="text-sm font-medium mb-3">Rendszerfrissítések</h4>
                        
                        {selectedServer.security?.updates_available !== undefined ? (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Elérhető frissítések</span>
                              <span className="font-medium">{selectedServer.security.updates_available}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Biztonsági frissítések</span>
                              <span className={`font-medium ${
                                parseInt(selectedServer.security.security_updates) > 0 
                                  ? 'text-red-500' 
                                  : 'text-green-500'
                              }`}>
                                {selectedServer.security.security_updates}
                              </span>
                            </div>
                            
                            {selectedServer.security.pending_packages && selectedServer.security.pending_packages.length > 0 && (
                              <div className="mt-2">
                                <h5 className="text-xs font-medium mb-1">Függőben lévő csomagok:</h5>
                                <div className="max-h-24 overflow-y-auto text-xs bg-gray-50 p-2 rounded">
                                  {selectedServer.security.pending_packages.map((pkg, index) => (
                                    <div key={index} className="flex justify-between">
                                      <span>{pkg.name}</span>
                                      <span className="text-gray-500">{pkg.version}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {selectedServer.security.last_security_check && (
                              <p className="text-xs text-gray-500 mt-2">
                                Utolsó ellenőrzés: {new Date(selectedServer.security.last_security_check).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500">Nincs elérhető frissítési információ</p>
                        )}
                      </div>
                      
                      {/* Sikertelen bejelentkezések */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="text-sm font-medium mb-3">Sikertelen Bejelentkezési Kísérletek</h4>
                        
                        {selectedServer.security?.failed_login_attempts && selectedServer.security.failed_login_attempts.length > 0 ? (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {selectedServer.security.failed_login_attempts.map((attempt, index) => (
                              <div key={index} className="p-2 bg-red-50 text-red-800 rounded text-xs">
                                {attempt}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">Nincs észlelt sikertelen bejelentkezési kísérlet</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Utolsó biztonsági audit */}
                    <div className="bg-white p-4 rounded-lg border mt-6">
                      <h4 className="text-sm font-medium mb-3">Biztonsági Audit</h4>
                      
                      {selectedServer.security?.audit_results ? (
                        <div className="space-y-3">
                          {Object.entries(selectedServer.security.audit_results).map(([category, result]) => (
                            <div key={category} className="border-b pb-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium capitalize">{category.replace('_', ' ')}</span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  result.status === 'passed' ? 'bg-green-100 text-green-800' :
                                  result.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {result.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{result.message}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">Nincs elérhető biztonsági audit információ</p>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedTab === 'alerts' && (
                  <div>
                    <h3 className="font-medium mb-4">Riasztások</h3>
                    
                    {selectedServer.alerts && selectedServer.alerts.length > 0 ? (
                      <div className="space-y-3">
                        {selectedServer.alerts.map((alert) => (
                          <div 
                            key={alert._id}
                            className={`p-4 border rounded flex justify-between items-start ${
                              alert.acknowledged 
                                ? 'bg-gray-50 border-gray-200' 
                                : alert.severity === 'critical'
                                  ? 'bg-red-50 border-red-200'
                                  : 'bg-yellow-50 border-yellow-200'
                            }`}
                          >
                            <div>
                              <div className="flex items-center">
                                <AlertTriangle className={`h-5 w-5 mr-2 ${
                                  alert.acknowledged
                                    ? 'text-gray-400'
                                    : alert.severity === 'critical'
                                      ? 'text-red-500'
                                      : 'text-yellow-500'
                                }`} />
                                <span className={`font-medium ${
                                  alert.acknowledged
                                    ? 'text-gray-600'
                                    : alert.severity === 'critical'
                                      ? 'text-red-700'
                                      : 'text-yellow-700'
                                }`}>
                                  {alert.message}
                                </span>
                              </div>
                              <div className="ml-7 mt-1">
                                <span className="text-xs text-gray-500">
                                  {alert.type} - {new Date(alert.timestamp).toLocaleString()}
                                </span>
                                {alert.acknowledged && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    (Nyugtázva)
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {!alert.acknowledged && (
                              <button
                                onClick={() => acknowledgeAlert(alert._id)}
                                className="px-3 py-1 bg-white text-sm border rounded hover:bg-gray-50"
                              >
                                Nyugtázás
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-6">
                        Nincsenek riasztások
                      </p>
                    )}
                  </div>
                )}
                
                {selectedTab === 'settings' && (
                  <div>
                    <h3 className="font-medium mb-4">Monitoring Beállítások</h3>
                    
                    <div className="bg-white p-6 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium mb-3">Riasztási Küszöbértékek</h4>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                CPU Használat Riasztás (%)
                              </label>
                              <input
                                type="number"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                defaultValue={selectedServer.settings?.alert_cpu_threshold || 90}
                                min={1}
                                max={100}
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                Memória Használat Riasztás (%)
                              </label>
                              <input
                                type="number"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                defaultValue={selectedServer.settings?.alert_memory_threshold || 90}
                                min={1}
                                max={100}
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                Lemez Használat Riasztás (%)
                              </label>
                              <input
                                type="number"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                defaultValue={selectedServer.settings?.alert_disk_threshold || 90}
                                min={1}
                                max={100}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-3">Monitoring Beállítások</h4>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                Adatgyűjtési Intervallum (másodperc)
                              </label>
                              <input
                                type="number"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                defaultValue={selectedServer.settings?.collection_interval || 60}
                                min={10}
                                max={3600}
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                Értesítési Email
                              </label>
                              <input
                                type="email"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                defaultValue={selectedServer.settings?.notification_email}
                                placeholder="admin@example.com"
                              />
                            </div>
                            
                            <div>
                              <label className="flex items-center text-sm text-gray-600">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mr-2"
                                  defaultChecked={selectedServer.settings?.enable_notifications !== false}
                                />
                                Értesítések engedélyezése
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <h4 className="text-sm font-medium mb-3">Monitorozott Szolgáltatások</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {['nginx', 'apache', 'mysql', 'postgresql', 'mongodb', 'redis', 'docker', 'nodejs'].map((service) => (
                            <label key={service} className="flex items-center text-sm">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mr-2"
                                defaultChecked={selectedServer.settings?.monitored_services?.includes(service)}
                              />
                              {service}
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-6 flex justify-end">
                        <button
                          onClick={() => {
                            setSuccess('Beállítások sikeresen mentve');
                            // Itt implementálnánk a tényleges mentést
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Beállítások Mentése
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
              <Server className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg">Válassz egy szervert a részletek megtekintéséhez</p>
            </div>
          )}
        </div>
      </div>

      {/* Szerver törlés megerősítés modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Szerver Törlése</h2>
            <p className="mb-6">
              Biztosan törölni szeretnéd a következő szervert a monitoring rendszerből: <span className="font-bold">{selectedServer.hostname}</span>?
            </p>
            <p className="mb-6 text-sm text-gray-500">
              Ez a művelet csak a monitoringot törli, a tényleges szerver nem lesz érintve. Ha újra szeretnéd monitorozni később, újra regisztrálhatod.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Mégse
              </button>
              <button
                onClick={deleteServer}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Törlés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Szerver uninstall modal */}
      {showUninstallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Monitoring Ügynök Eltávolítása</h2>
            <p className="mb-4">
              Az alábbi parancs eltávolítja a monitoring ügynököt a szerverről anélkül, hogy törölné a szerver adatait a monitoring rendszerből.
            </p>
            
            <div className="bg-gray-800 text-white p-4 rounded font-mono text-sm overflow-x-auto mb-4">
              {uninstallCommand}
            </div>
            
            <p className="mb-6 text-sm text-yellow-500">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Az ügynök eltávolítása után a szerver "offline" állapotba kerül, de az adatai megmaradnak a rendszerben.
            </p>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowUninstallModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Új szerver modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Új Szerver Regisztrálása</h2>
            
            {installCommand ? (
              <div>
                <p className="mb-4">A szerver sikeresen regisztrálva! Futtasd az alábbi parancsot a szerveren a monitoring ügynök telepítéséhez:</p>
                
                <div className="bg-gray-800 text-white p-4 rounded font-mono text-sm overflow-x-auto mb-4">
                  {installCommand}
                </div>
                
                <div className="bg-blue-50 p-4 border border-blue-200 rounded mb-4">
                  <h3 className="font-medium text-blue-700 mb-2">Mi történik a telepítés során?</h3>
                  <p className="text-sm text-blue-600">
                    Az ügynök a következő adatokat gyűjti és továbbítja a monitoring rendszernek:
                  </p>
                  <ul className="list-disc list-inside text-sm text-blue-600 mt-2 space-y-1">
                    <li>Rendszerinformációk (CPU, memória, lemez használat)</li>
                    <li>Hálózati adatok és kapcsolatok</li>
                    <li>Biztonsági információk (SSH kapcsolatok, nyitott portok)</li>
                    <li>Aktív szolgáltatások és processek</li>
                    <li>Frissítési információk</li>
                  </ul>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setInstallCommand('');
                      setShowInstallModal(false);
                      setNewServerData({
                        hostname: '',
                        ip_address: '',
                        os: ''
                      });
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Bezárás
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={registerNewServer}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Szerver Neve
                    </label>
                    <input
                      type="text"
                      value={newServerData.hostname}
                      onChange={(e) => setNewServerData({...newServerData, hostname: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IP Cím
                    </label>
                    <input
                      type="text"
                      value={newServerData.ip_address}
                      onChange={(e) => setNewServerData({...newServerData, ip_address: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operációs Rendszer
                    </label>
                    <input
                      type="text"
                      value={newServerData.os}
                      onChange={(e) => setNewServerData({...newServerData, os: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="pl. Ubuntu 22.04 LTS"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowInstallModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Regisztrálás
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerMonitoring;