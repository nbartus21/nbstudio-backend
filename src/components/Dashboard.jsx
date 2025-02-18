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
      </div>
    </div>
  );
};

export default Dashboard;