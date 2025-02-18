import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';
import { 
  AlertTriangle, DollarSign, Server, Globe, FileText, Bell, Code,
  Calendar, Users, Mail, Settings, Database
} from 'lucide-react';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Állapotok a különböző adatoknak
  const [domains, setDomains] = useState([]);
  const [projects, setProjects] = useState([]);
  const [servers, setServers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [posts, setPosts] = useState([]);
  const [calculators, setCalculators] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Statisztikák állapota
  const [stats, setStats] = useState({
    domains: { total: 0, expiring: 0, totalCost: 0 },
    projects: { total: 0, active: 0, completed: 0 },
    servers: { total: 0, active: 0, maintenance: 0 },
    finances: { 
      totalIncome: 0, 
      totalExpenses: 0,
      pendingInvoices: 0,
      monthlyRecurring: 0
    }
  });

  // Adatok betöltése
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        // Párhuzamos API hívások
        const [
          domainsRes,
          projectsRes,
          serversRes,
          contactsRes,
          calculatorsRes,
          licensesRes,
          notificationsRes
        ] = await Promise.all([
          api.get(`${API_URL}/domains`),
          api.get(`${API_URL}/projects`),
          api.get(`${API_URL}/servers`),
          api.get(`${API_URL}/contacts`),
          api.get(`${API_URL}/calculators`),
          api.get(`${API_URL}/licenses`),
          api.get(`${API_URL}/notifications`)
        ]);

        // Adatok kinyerése a válaszokból
        const domainsData = await domainsRes.json();
        const projectsData = await projectsRes.json();
        const serversData = await serversRes.json();
        const contactsData = await contactsRes.json();
        const calculatorsData = await calculatorsRes.json();
        const licensesData = await licensesRes.json();
        const notificationsData = await notificationsRes.json();

        // Állapotok frissítése
        setDomains(domainsData);
        setProjects(projectsData);
        setServers(serversData);
        setContacts(contactsData);
        setCalculators(calculatorsData);
        setLicenses(licensesData);
        setNotifications(notificationsData);

        // Statisztikák számítása
        calculateStats({
          domains: domainsData,
          projects: projectsData,
          servers: serversData,
          contacts: contactsData,
          calculators: calculatorsData,
          licenses: licensesData
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
    // Polling beállítása 30 másodpercenként
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Statisztikák számítása
  const calculateStats = (data) => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    const stats = {
      domains: {
        total: data.domains.length,
        expiring: data.domains.filter(d => new Date(d.expiryDate) <= thirtyDaysFromNow).length,
        totalCost: data.domains.reduce((sum, d) => sum + (d.cost || 0), 0)
      },
      projects: {
        total: data.projects.length,
        active: data.projects.filter(p => p.status === 'aktív').length,
        completed: data.projects.filter(p => p.status === 'befejezett').length
      },
      servers: {
        total: data.servers.length,
        active: data.servers.filter(s => s.status === 'active').length,
        maintenance: data.servers.filter(s => s.status === 'maintenance').length
      },
      finances: {
        totalIncome: data.projects.reduce((sum, p) => 
          sum + (p.invoices?.reduce((iSum, i) => iSum + (i.totalAmount || 0), 0) || 0), 0),
        totalExpenses: data.domains.reduce((sum, d) => sum + (d.cost || 0), 0) +
                      data.servers.reduce((sum, s) => sum + (s.costs?.monthly || 0), 0),
        pendingInvoices: data.projects.reduce((sum, p) => 
          sum + (p.invoices?.filter(i => i.status === 'pending').length || 0), 0)
      }
    };

    setStats(stats);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Vezérlőpult</h1>
          <div className="flex items-center space-x-4">
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

        {/* Gyorselérés gombok */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          {[
            { icon: <Globe />, label: 'Domainek', path: '/domains' },
            { icon: <Server />, label: 'Szerverek', path: '/infrastructure' },
            { icon: <FileText />, label: 'Számlák', path: '/invoices' },
            { icon: <Code />, label: 'Projektek', path: '/projects' },
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

        {/* Statisztika kártyák */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Aktív Projektek</p>
                <p className="text-2xl font-bold">{stats.projects.active}</p>
                <p className="text-sm text-gray-500">Összes: {stats.projects.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Code className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Lejáró Domainek</p>
                <p className="text-2xl font-bold">{stats.domains.expiring}</p>
                <p className="text-sm text-gray-500">30 napon belül</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Globe className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Szerverek Állapota</p>
                <p className="text-2xl font-bold">{stats.servers.active}/{stats.servers.total}</p>
                <p className="text-sm text-gray-500">{stats.servers.maintenance} karbantartás alatt</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Server className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Pénzügyek</p>
                <p className="text-2xl font-bold">{stats.finances.pendingInvoices}</p>
                <p className="text-sm text-gray-500">Függő számla</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Grafikonok */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Bevételek és Kiadások</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { name: 'Jan', bevétel: stats.finances.totalIncome, kiadás: stats.finances.totalExpenses },
                    // További havi adatok...
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="bevétel" stroke="#10B981" />
                  <Line type="monotone" dataKey="kiadás" stroke="#EF4444" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Projektek Státusza</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Aktív', value: stats.projects.active },
                      { name: 'Befejezett', value: stats.projects.completed },
                      { name: 'Egyéb', value: stats.projects.total - stats.projects.active - stats.projects.completed }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#60A5FA" />
                    <Cell fill="#6B7280" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Értesítések és Feladatok */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sürgős Teendők */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              Sürgős Teendők
            </h3>
            <div className="space-y-4">
              {/* Domain lejáratok */}
              {domains.filter(d => new Date(d.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).map(domain => (
                <div key={domain._id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 text-yellow-500 mr-2" />
                    <div>
                      <p className="font-medium">{domain.name}</p>
                      <p className="text-sm text-gray-500">Lejár: {new Date(domain.expiryDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/domains')}
                    className="text-yellow-600 hover:text-yellow-700"
                  >
                    Megtekintés
                  </button>
                </div>
              ))}

              {/* Szerver figyelmeztetések */}
              {servers.filter(s => s.status === 'maintenance').map(server => (
                <div key={server._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <Server className="h-5 w-5 text-red-500 mr-2" />
                    <div>
                      <p className="font-medium">{server.name}</p>
                      <p className="text-sm text-gray-500">Karbantartás alatt</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/infrastructure')}
                    className="text-red-600 hover:text-red-700"
                  >
                    Megtekintés
                  </button>
                </div>
              ))}

              {/* Késedelmes számlák */}
              {projects.flatMap(p => p.invoices || [])
                .filter(i => i.status === 'késedelmes')
                .map((invoice, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-orange-500 mr-2" />
                      <div>
                        <p className="font-medium">Számla: {invoice.number}</p>
                        <p className="text-sm text-gray-500">
                          Késedelmes összeg: {new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'EUR' }).format(invoice.totalAmount)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/invoices')}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      Megtekintés
                    </button>
                  </div>
              ))}
            </div>
          </div>

          {/* Legutóbbi Értesítések */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Bell className="h-5 w-5 text-blue-500 mr-2" />
              Legutóbbi Értesítések
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
                      <p className="text-xs text-gray-400">{new Date(notification.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {notification.link && (
                    <button
                      onClick={() => navigate(notification.link)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Megtekintés
                    </button>
                  )}
                </div>
              ))}

              {notifications.length > 5 && (
                <button
                  onClick={() => navigate('/notifications')}
                  className="w-full text-center text-blue-600 hover:text-blue-700 text-sm"
                >
                  További értesítések megtekintése...
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;