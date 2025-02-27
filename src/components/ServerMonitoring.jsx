import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { 
  Server, HardDrive, Database, Cpu, Wifi, Shield, 
  AlertTriangle, Check, X, RefreshCcw, Settings, 
  Download, Upload, Clock, Terminal 
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api/monitoring';

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
  const [newServerData, setNewServerData] = useState({
    hostname: '',
    ip_address: '',
    os: ''
  });
  const [installCommand, setInstallCommand] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(30); // másodperc
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Adatok lekérése
  const fetchData = async () => {
    try {
      setLoading(true);
      
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
        const serverData = await serverRes.json();
        setSelectedServer(serverData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Hiba az adatok lekérésekor:', error);
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
      
      await api.put(`${API_URL}/monitoring/servers/${selectedServer.server_id}/alerts/${alertId}/acknowledge`);
      
      // Frissítjük a szerver adatait
      const serverRes = await api.get(`${API_URL}/monitoring/servers/${selectedServer.server_id}`);
      const serverData = await serverRes.json();
      setSelectedServer(serverData);
    } catch (error) {
      console.error('Hiba a riasztás nyugtázásakor:', error);
    }
  };

  // Minden riasztás nyugtázása
  const acknowledgeAllAlerts = async () => {
    try {
      if (!selectedServer) return;
      
      await api.put(`${API_URL}/monitoring/servers/${selectedServer.server_id}/alerts/acknowledge-all`);
      
      // Frissítjük a szerver adatait
      const serverRes = await api.get(`${API_URL}/monitoring/servers/${selectedServer.server_id}`);
      const serverData = await serverRes.json();
      setSelectedServer(serverData);
    } catch (error) {
      console.error('Hiba az összes riasztás nyugtázásakor:', error);
    }
  };

  // Új szerver regisztrálása
  const registerNewServer = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.post(`${API_URL}/monitoring/servers`, newServerData);
      const data = await response.json();
      
      // Mentjük a telepítési parancsot
      setInstallCommand(data.installCommand);
      
      // Frissítjük a szerverek listáját
      fetchData();
    } catch (error) {
      console.error('Hiba a szerver regisztrációjakor:', error);
    }
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
                            <span className="text-sm text-gray-600">IP cím:</span>
                            <span className="text-sm font-medium">{selectedServer.ip_address || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Operációs rendszer:</span>
                            <span className="text-sm font-medium">{selectedServer.os || 'N/A'}</span>
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
                            <span className="text-sm text-gray-600">Lemez I/O:</span>
                            <span className="text-sm font-medium">
                              {selectedServer.system_info?.disk?.io_latency_ms || 'N/A'}
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
                            {selectedServer.system_info?.cpu?.usage_percent
                              ? `${selectedServer.system_info.cpu.usage_percent.toFixed(1)}%`
                              : 'N/A'
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            Terhelés: {selectedServer.system_info?.cpu?.load || 'N/A'}
                          </div>
                        </div>
                        
                        {selectedServer.system_info?.cpu?.usage_percent && (
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
                            {selectedServer.system_info?.memory?.usage_percent
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
                        
                        {selectedServer.system_info?.memory?.usage_percent && (
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
                            {selectedServer.system_info?.disk?.usage_percent
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
                        
                        {selectedServer.system_info?.disk?.usage_percent && (
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
                    
                    {/* Aktív szolgáltatások */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-3">Aktív Szolgáltatások</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {selectedServer.services && selectedServer.services.map((service, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <Terminal className="h-4 w-4 text-gray-400" />
                            <span className="truncate">{service}</span>
                          </div>
                        ))}
                        
                        {(!selectedServer.services || selectedServer.services.length === 0) && (
                          <p className="text-sm text-gray-500">Nincs elérhető szolgáltatás információ</p>
                        )}
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
                                <Line 
                                  type="monotone" 
                                  dataKey="cpu_usage" 
                                  stroke="#3B82F6" 
                                  name="CPU Használat"
                                  strokeWidth={2}
                                  dot={false}
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
                                <Area 
                                  type="monotone" 
                                  dataKey="memory_usage" 
                                  stroke="#8B5CF6" 
                                  fill="#DDD6FE"
                                  name="Memória Használat"
                                  strokeWidth={2}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        
                        {/* Lemez használat történeti grafikon */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">Lemez Használat Történet</h4>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
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
                                <YAxis domain={[0, 100]} />
                                <Tooltip 
                                  formatter={(value) => [`${value}%`, 'Lemez Használat']}
                                  labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="disk_usage" 
                                  stroke="#10B981" 
                                  fill="#D1FAE5"
                                  name="Lemez Használat"
                                  strokeWidth={2}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">Nincs elérhető történeti adat</p>
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
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{iface.ip}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">Nincs elérhető hálózati interfész információ</p>
                      )}
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
                                <span className="font-medium">{ping} ms</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">Nincs elérhető ping információ</p>
                        )}
                      </div>
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
                              <span key={index} className="px-2 py-1 bg-gray-100 rounded text-center text-sm">
                                {port}
                              </span>
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
                          <div className="flex items-center">
                            <Terminal className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="font-medium">
                              {selectedServer.security.active_ssh_connections} aktív kapcsolat
                            </span>
                          </div>
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
                    className="px-4 py-2 bg-blue-600 text-white rounded"
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