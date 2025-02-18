import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  AlertTriangle, DollarSign, Server, Globe, FileText, Bell, Code,
  Calendar, Users, Mail, Settings, Database, 
  Download, Filter, Key, ChevronDown, ChevronUp 
} from 'lucide-react';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

// Komponensek
const StatCard = ({ title, value, subValue, icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <div className="flex justify-between items-center">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {subValue && <p className="text-sm text-gray-500">{subValue}</p>}
      </div>
      <div className={`h-12 w-12 rounded-full bg-${color}-100 flex items-center justify-center`}>
        {icon}
      </div>
    </div>
  </div>
);

const MetricCard = ({ label, value, previousValue, format = 'number', icon: Icon }) => {
  const formatValue = (val) => {
    if (format === 'currency') return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'EUR' }).format(val);
    if (format === 'percent') return `${val}%`;
    return val.toLocaleString();
  };

  const percentChange = previousValue ? ((value - previousValue) / previousValue * 100).toFixed(1) : 0;
  const isPositive = percentChange > 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center mb-2">
        <Icon className="h-5 w-5 text-gray-400 mr-2" />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="flex items-baseline">
        <span className="text-2xl font-bold mr-2">{formatValue(value)}</span>
        {previousValue && (
          <span className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{percentChange}%
          </span>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30'); // napok száma
  
  // Állapotok
  const [domains, setDomains] = useState([]);
  const [projects, setProjects] = useState([]);
  const [servers, setServers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [posts, setPosts] = useState([]);
  const [calculators, setCalculators] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState({
    revenue: [],
    expenses: [],
    projectProgress: [],
    serverMetrics: []
  });

  // Statisztikák
  const [stats, setStats] = useState({
    domains: { total: 0, expiring: 0, totalCost: 0 },
    projects: { total: 0, active: 0, completed: 0 },
    servers: { total: 0, active: 0, maintenance: 0 },
    finances: { 
      totalIncome: 0, 
      totalExpenses: 0,
      pendingInvoices: 0,
      monthlyRecurring: 0,
      lastMonthIncome: 0
    }
  });

  // Szűrők
  const [filters, setFilters] = useState({
    projectStatus: 'all',
    priority: 'all',
    dateRange: '30'
  });

  // Pénzügyi metrikák számítása
  const calculateFinancialMetrics = (data) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      currentMonthRevenue: data.projects.reduce((sum, p) => {
        return sum + (p.invoices || [])
          .filter(i => {
            const invDate = new Date(i.date);
            return invDate.getMonth() === currentMonth && 
                   invDate.getFullYear() === currentYear;
          })
          .reduce((iSum, i) => iSum + (i.totalAmount || 0), 0);
      }, 0),
      pendingPayments: data.projects.reduce((sum, p) => {
        return sum + (p.invoices || [])
          .filter(i => i.status === 'pending')
          .reduce((iSum, i) => iSum + (i.totalAmount || 0), 0);
      }, 0),
      recurringRevenue: data.projects.reduce((sum, p) => {
        return sum + (p.recurring?.monthlyFee || 0);
      }, 0)
    };
  };

  // Adatok betöltése
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        // API hívások
        const [
          domainsRes,
          projectsRes,
          serversRes,
          contactsRes,
          calculatorsRes,
          licensesRes,
          notificationsRes,
          analyticsRes
        ] = await Promise.all([
          api.get(`${API_URL}/domains`),
          api.get(`${API_URL}/projects`),
          api.get(`${API_URL}/servers`),
          api.get(`${API_URL}/contacts`),
          api.get(`${API_URL}/calculators`),
          api.get(`${API_URL}/licenses`),
          api.get(`${API_URL}/notifications`),
          api.get(`${API_URL}/analytics?timeRange=${timeRange}`)
        ]);

        // Adatok feldolgozása
        const [
          domainsData,
          projectsData,
          serversData,
          contactsData,
          calculatorsData,
          licensesData,
          notificationsData,
          analyticsData
        ] = await Promise.all([
          domainsRes.json(),
          projectsRes.json(),
          serversRes.json(),
          contactsRes.json(),
          calculatorsRes.json(),
          licensesRes.json(),
          notificationsRes.json(),
          analyticsRes.json()
        ]);

        // Állapotok frissítése
        setDomains(domainsData);
        setProjects(projectsData);
        setServers(serversData);
        setContacts(contactsData);
        setCalculators(calculatorsData);
        setLicenses(licensesData);
        setNotifications(notificationsData);
        setAnalytics(analyticsData);

        // Statisztikák frissítése
        calculateStats({
          domains: domainsData,
          projects: projectsData,
          servers: serversData,
          contacts: contactsData,
          calculators: calculatorsData,
          licenses: licensesData,
          analytics: analyticsData
        });

        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Hiba történt az adatok betöltése során');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // Exportálás JSON formátumban
  const handleExport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      summary: {
        domains: stats.domains,
        projects: stats.projects,
        servers: stats.servers,
        finances: stats.finances
      },
      details: {
        activeProjects: projects.filter(p => p.status === 'active'),
        expiringDomains: domains.filter(d => new Date(d.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        serverStatus: servers.map(s => ({
          name: s.name,
          status: s.status,
          metrics: {
            cpu: s.metrics?.cpu,
            memory: s.metrics?.memory,
            disk: s.metrics?.disk
          }
        }))
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Főbb metrikák kártyái
  const metricCards = [
    {
      icon: Code,
      label: 'Aktív Projektek',
      value: stats.projects.active,
      subValue: `Összes: ${stats.projects.total}`,
      color: 'blue'
    },
    {
      icon: Globe,
      label: 'Lejáró Domainek',
      value: stats.domains.expiring,
      subValue: '30 napon belül',
      color: 'yellow'
    },
    {
      icon: Server,
      label: 'Szerverek Állapota',
      value: `${stats.servers.active}/${stats.servers.total}`,
      subValue: `${stats.servers.maintenance} karbantartás alatt`,
      color: 'green'
    },
    {
      icon: DollarSign,
      label: 'Függő Számlák',
      value: stats.finances.pendingInvoices,
      subValue: `${new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'EUR' }).format(stats.finances.totalIncome)}`,
      color: 'purple'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Fejléc */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Vezérlőpult</h1>
            <p className="text-sm text-gray-500">
              Utolsó frissítés: {new Date().toLocaleString()}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportálás
            </button>
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 text-gray-600 hover:text-gray-900"
            >
              <Bell className="h-6 w-6" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <Settings className="h-6 w-6" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Szűrők */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Időszak
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="7">Utolsó 7 nap</option>
                <option value="30">Utolsó 30 nap</option>
                <option value="90">Utolsó negyedév</option>
                <option value="365">Utolsó év</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projekt Státusz
              </label>
              <select
                value={filters.projectStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, projectStatus: e.target.value }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">Összes</option>
                <option value="active">Aktív</option>
                <option value="completed">Befejezett</option>
                <option value="delayed">Késésben</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioritás
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">Összes</option>
                <option value="high">Magas</option>
                <option value="medium">Közepes</option>
                <option value="low">Alacsony</option>
              </select>
            </div>
          </div>
        </div>

        {/* Gyorselérés gombok */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          {[
            { icon: <Code />, label: 'Projektek', path: '/projects' },
            { icon: <Globe />, label: 'Domainek', path: '/domains' },
            { icon: <Server />, label: 'Szerverek', path: '/infrastructure' },
            { icon: <FileText />, label: 'Számlák', path: '/invoices' },
            { icon: <Database />, label: 'Hosting', path: '/hosting' },
            { icon: <Mail />, label: 'Kapcsolat', path: '/contacts' },
            { icon: <Calendar />, label: 'Kalkulátor', path: '/calculator' },
            { icon: <Users />, label: 'Blog', path: '/blog' }
          ].map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="text-gray-600 mb-2">
                {item.icon}
              </div>
              <span className="text-sm text-gray-700">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Fő metrikák */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metricCards.map((card, index) => (
            <StatCard key={index} {...card} />
          ))}
        </div>

        {/* Részletes statisztikák */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Bevételek és Kiadások */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <DollarSign className="h-5 w-5 text-green-500 mr-2" />
              Pénzügyi Áttekintés
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.revenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="bevétel" 
                    stackId="1"
                    stroke="#10B981" 
                    fill="#10B98133" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="kiadás" 
                    stackId="1"
                    stroke="#EF4444" 
                    fill="#EF444433" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Projekt Teljesítés */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Code className="h-5 w-5 text-blue-500 mr-2" />
              Projekt Teljesítés
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.projectProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tervezett" fill="#60A5FA" />
                  <Bar dataKey="tényleges" fill="#34D399" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Feladatok és Határidők */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sürgős Teendők */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              Sürgős Teendők
            </h3>
            <div className="space-y-4">
              {/* Domain lejáratok */}
              {domains
                .filter(d => new Date(d.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
                .map(domain => (
                  <div key={domain._id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <Globe className="h-5 w-5 text-yellow-500 mr-2" />
                      <div>
                        <p className="font-medium">{domain.name}</p>
                        <p className="text-sm text-gray-500">
                          Lejár: {new Date(domain.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/domains/${domain._id}`)}
                      className="text-yellow-600 hover:text-yellow-700"
                    >
                      Kezelés
                    </button>
                  </div>
                ))}

              {/* Szerver riasztások */}
              {servers
                .filter(s => s.status === 'maintenance' || s.alerts?.length > 0)
                .map(server => (
                  <div key={server._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center">
                      <Server className="h-5 w-5 text-red-500 mr-2" />
                      <div>
                        <p className="font-medium">{server.name}</p>
                        <p className="text-sm text-gray-500">
                          {server.status === 'maintenance' ? 'Karbantartás alatt' : 'Riasztás'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/infrastructure/servers/${server._id}`)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Kezelés
                    </button>
                  </div>
                ))}

              {/* Késedelmes számlák */}
              {projects
                .flatMap(p => (p.invoices || []).map(i => ({ ...i, projectName: p.name, projectId: p._id })))
                .filter(i => i.status === 'késedelmes')
                .map((invoice, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-orange-500 mr-2" />
                      <div>
                        <p className="font-medium">
                          {invoice.projectName} - {invoice.number}
                        </p>
                        <p className="text-sm text-gray-500">
                          Lejárt: {Math.ceil((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24))} napja
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Intl.NumberFormat('hu-HU', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          }).format(invoice.totalAmount)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/projects/${invoice.projectId}/invoices/${invoice._id}`)}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      Kezelés
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Legutóbbi Értesítések */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Bell className="h-5 w-5 text-blue-500 mr-2" />
              Értesítések
            </h3>
            <div className="space-y-4">
              {notifications.slice(0, 5).map((notification, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {notification.type === 'project' && <Code className="h-5 w-5 text-blue-500 mr-2" />}
                    {notification.type === 'domain' && <Globe className="h-5 w-5 text-yellow-500 mr-2" />}
                    {notification.type === 'server' && <Server className="h-5 w-5 text-red-500 mr-2" />}
                    {notification.type === 'invoice' && <FileText className="h-5 w-5 text-green-500 mr-2" />}
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-gray-500">{notification.message}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {notification.link && (
                    <button
                      onClick={() => navigate(notification.link)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Megnyitás
                    </button>
                  )}
                </div>
              ))}

              {notifications.length > 5 && (
                <button
                  onClick={() => navigate('/notifications')}
                  className="w-full text-center text-blue-600 hover:text-blue-700 text-sm"
                >
                  Összes értesítés megtekintése
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Szerver Monitorozás */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Server className="h-5 w-5 text-purple-500 mr-2" />
            Szerver Erőforrások
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map(server => (
              <div key={server._id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{server.name}</h4>
                    <p className="text-sm text-gray-500">{server.ip}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    server.status === 'active' ? 'bg-green-100 text-green-800' :
                    server.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {server.status}
                  </span>
                </div>
                <div className="space-y-2">
                  {/* CPU Használat */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CPU</span>
                      <span>{server.metrics?.cpu}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          (server.metrics?.cpu || 0) > 80 ? 'bg-red-500' :
                          (server.metrics?.cpu || 0) > 60 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${server.metrics?.cpu || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  {/* Memória Használat */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memória</span>
                      <span>{server.metrics?.memory}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          (server.metrics?.memory || 0) > 80 ? 'bg-red-500' :
                          (server.metrics?.memory || 0) > 60 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${server.metrics?.memory || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  {/* Tárhely Használat */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Tárhely</span>
                      <span>{server.metrics?.disk}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          (server.metrics?.disk || 0) > 80 ? 'bg-red-500' :
                          (server.metrics?.disk || 0) > 60 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${server.metrics?.disk || 0}%` }} ></div>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => navigate(`/infrastructure/servers/${server._id}`)}
                    className="w-full text-center text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Részletek megtekintése
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projekt Áttekintés */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium flex items-center">
              <Code className="h-5 w-5 text-indigo-500 mr-2" />
              Projekt Áttekintés
            </h3>
            <button
              onClick={() => navigate('/projects')}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Összes projekt
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projekt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Státusz
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Határidő
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Haladás
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioritás
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects
                  .filter(project => {
                    if (filters.projectStatus !== 'all' && project.status !== filters.projectStatus) return false;
                    if (filters.priority !== 'all' && project.priority !== filters.priority) return false;
                    return true;
                  })
                  .slice(0, 5)
                  .map((project) => (
                    <tr key={project._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {project.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {project.client?.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          project.status === 'aktív' ? 'bg-green-100 text-green-800' :
                          project.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
                          project.status === 'késésben' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(project.deadline).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24))} nap
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              project.progress >= 80 ? 'bg-green-500' :
                              project.progress >= 40 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {project.progress}%
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          project.priority === 'high' ? 'bg-red-100 text-red-800' :
                          project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {project.priority}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/projects/${project._id}`)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Részletek
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Domain és Licensz Lejáratok */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Globe className="h-5 w-5 text-blue-500 mr-2" />
              Közelgő Domain Lejáratok
            </h3>
            <div className="space-y-4">
              {domains
                .filter(d => new Date(d.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
                .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
                .slice(0, 5)
                .map(domain => (
                  <div key={domain._id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">{domain.name}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="mr-2">
                          Lejár: {new Date(domain.expiryDate).toLocaleDateString()}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {Math.ceil((new Date(domain.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} nap
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {new Intl.NumberFormat('hu-HU', { 
                          style: 'currency', 
                          currency: 'EUR' 
                        }).format(domain.cost)}
                      </span>
                      <button
                        onClick={() => navigate(`/domains/${domain._id}`)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Kezelés
                      </button>
                    </div>
                  </div>
                ))}
              <button
                onClick={() => navigate('/domains')}
                className="w-full text-center text-blue-600 hover:text-blue-700 text-sm"
              >
                Összes domain megtekintése
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Key className="h-5 w-5 text-purple-500 mr-2" />
              Licensz Megújítások
            </h3>
            <div className="space-y-4">
              {licenses
                .filter(l => l.renewal?.nextRenewalDate && 
                           new Date(l.renewal.nextRenewalDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
                .sort((a, b) => new Date(a.renewal.nextRenewalDate) - new Date(b.renewal.nextRenewalDate))
                .slice(0, 5)
                .map(license => (
                  <div key={license._id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium">{license.name}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="mr-2">
                          Megújítás: {new Date(license.renewal.nextRenewalDate).toLocaleDateString()}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          {Math.ceil((new Date(license.renewal.nextRenewalDate) - new Date()) / (1000 * 60 * 60 * 24))} nap
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {new Intl.NumberFormat('hu-HU', { 
                          style: 'currency', 
                          currency: 'EUR' 
                        }).format(license.renewal.cost)}
                      </span>
                      <button
                        onClick={() => navigate(`/infrastructure/licenses/${license._id}`)}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        Kezelés
                      </button>
                    </div>
                  </div>
                ))}
              <button
                onClick={() => navigate('/infrastructure/licenses')}
                className="w-full text-center text-purple-600 hover:text-purple-700 text-sm"
              >
                Összes licensz megtekintése
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;