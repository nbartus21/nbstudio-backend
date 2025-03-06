import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';
import { 
  Users, Briefcase, Server, Database, FileText, MessageCircle, 
  Globe, CreditCard, AlertTriangle, Mail, Calendar, BarChart2,
  TrendingUp, DollarSign, Activity, CheckSquare, PieChart, HardDrive, 
  Clock, Package, Layers
} from 'lucide-react';

// Component for each metric card
const MetricCard = ({ title, value, icon, color, change }) => {
  const Icon = icon;
  return (
    <div className="bg-white rounded-lg shadow-md p-5 flex flex-col justify-between h-full">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <p className="text-2xl font-semibold mt-2">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {change && (
        <div className={`mt-4 text-sm ${
          change.startsWith('+') ? 'text-green-600' : change.startsWith('-') ? 'text-red-600' : 'text-gray-500'
        }`}>
          {change} az előző időszakhoz képest
        </div>
      )}
    </div>
  );
};

// Recent activity component
const RecentActivity = ({ activities }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h3 className="text-lg font-medium mb-4">Legutóbbi aktivitások</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start p-3 rounded-md hover:bg-gray-50 border-b last:border-b-0">
            <div className={`rounded-full p-2 mr-3 ${activity.iconBg}`}>
              <activity.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium">{activity.title}</p>
              <p className="text-sm text-gray-500">{activity.description}</p>
              <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Alerts component
const Alerts = ({ alerts }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h3 className="text-lg font-medium mb-4">Figyelmeztető jelzések</h3>
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <div key={index} className={`p-3 rounded-md border-l-4 ${
            alert.level === 'critical' ? 'border-red-500 bg-red-50' :
            alert.level === 'warning' ? 'border-yellow-500 bg-yellow-50' :
            'border-blue-500 bg-blue-50'
          }`}>
            <div className="flex items-start">
              <div className="mr-3">
                <AlertTriangle className={`h-5 w-5 ${
                  alert.level === 'critical' ? 'text-red-500' :
                  alert.level === 'warning' ? 'text-yellow-500' :
                  'text-blue-500'
                }`} />
              </div>
              <div>
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm">{alert.message}</p>
              </div>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="text-center p-4 text-gray-500">
            Nincs aktív figyelmeztetés
          </div>
        )}
      </div>
    </div>
  );
};

// Project status chart
const ProjectStatusChart = ({ projectsData }) => {
  // Group projects by status
  const statusCounts = projectsData.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {});

  const statusColors = {
    'aktív': 'bg-green-500',
    'befejezett': 'bg-blue-500',
    'felfüggesztett': 'bg-yellow-500',
    'törölt': 'bg-gray-500'
  };

  const total = projectsData.length;

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h3 className="text-lg font-medium mb-4">Projektek állapota</h3>
      <div className="space-y-4">
        {Object.keys(statusCounts).map(status => (
          <div key={status} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{status}</span>
              <span>{statusCounts[status]} ({Math.round((statusCounts[status] / total) * 100)}%)</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full ${statusColors[status] || 'bg-gray-500'}`}
                style={{ width: `${(statusCounts[status] / total) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Invoice status component
const InvoiceStatus = ({ invoices }) => {
  // Calculate total amount and paid amount
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidAmount = invoices.reduce((sum, inv) => sum + (inv.status === 'fizetett' ? inv.totalAmount : 0), 0);
  const unpaidAmount = totalAmount - paidAmount;
  const paidPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  // Group invoices by status
  const statusCounts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h3 className="text-lg font-medium mb-4">Számlák áttekintése</h3>
      
      <div className="relative pt-3">
        <h4 className="text-sm font-medium text-gray-600 mb-2">Kifizetett: {Math.round(paidPercentage)}%</h4>
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block text-green-600">
              {paidAmount.toLocaleString()} EUR
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold inline-block text-red-600">
              {unpaidAmount.toLocaleString()} EUR
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-gray-200">
          <div style={{ width: `${paidPercentage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"></div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
          <h4 className="text-sm font-medium text-green-800">Fizetett</h4>
          <p className="text-xl font-bold text-green-800">{statusCounts['fizetett'] || 0}</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
          <h4 className="text-sm font-medium text-yellow-800">Kiállított</h4>
          <p className="text-xl font-bold text-yellow-800">{statusCounts['kiállított'] || 0}</p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
          <h4 className="text-sm font-medium text-red-800">Késedelmes</h4>
          <p className="text-xl font-bold text-red-800">{statusCounts['késedelmes'] || 0}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
          <h4 className="text-sm font-medium text-gray-800">Törölt</h4>
          <p className="text-xl font-bold text-gray-800">{statusCounts['törölt'] || 0}</p>
        </div>
      </div>
    </div>
  );
};

// Server status component
const ServerStatus = ({ servers }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h3 className="text-lg font-medium mb-4">Szerverek állapota</h3>
      <div className="space-y-3">
        {servers.map((server, index) => (
          <div key={index} className="border border-gray-200 rounded-md p-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  server.status === 'active' ? 'bg-green-500' : 
                  server.status === 'maintenance' ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}></div>
                <h4 className="font-medium">{server.name}</h4>
              </div>
              <span className="text-sm text-gray-500">{server.type}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
              <div>
                <span className="text-gray-500">CPU:</span> {server.specifications?.cpu || 'N/A'}
              </div>
              <div>
                <span className="text-gray-500">RAM:</span> {server.specifications?.ram || 'N/A'}
              </div>
              <div>
                <span className="text-gray-500">Tárhely:</span> {server.specifications?.storage?.total || 'N/A'} GB
              </div>
            </div>
          </div>
        ))}
        {servers.length === 0 && (
          <div className="text-center p-4 text-gray-500">
            Nincs elérhető szerver információ
          </div>
        )}
      </div>
    </div>
  );
};

// Domain expiration component
const DomainExpiration = ({ domains }) => {
  // Sort domains by expiry date
  const sortedDomains = [...domains].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  const upcomingDomains = sortedDomains.filter(domain => {
    const expiryDate = new Date(domain.expiryDate);
    const now = new Date();
    const days = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
    return days <= 30 && days >= 0;
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h3 className="text-lg font-medium mb-4">Közelgő domain lejáratok</h3>
      <div className="space-y-3">
        {upcomingDomains.map((domain, index) => {
          const expiryDate = new Date(domain.expiryDate);
          const now = new Date();
          const days = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
          
          return (
            <div key={index} className="border border-gray-200 rounded-md p-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">{domain.name}</h4>
                <span className={`text-sm ${
                  days <= 7 ? 'text-red-600 font-semibold' : 
                  days <= 14 ? 'text-yellow-600' : 
                  'text-blue-600'
                }`}>
                  {days} nap múlva lejár
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Lejárati dátum: {new Date(domain.expiryDate).toLocaleDateString()}
              </div>
            </div>
          );
        })}
        {upcomingDomains.length === 0 && (
          <div className="text-center p-4 text-gray-500">
            Nincs közelgő domain lejárat
          </div>
        )}
      </div>
    </div>
  );
};

// Accounting summary component
const AccountingSummary = ({ financialData }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h3 className="text-lg font-medium mb-4">Pénzügyi összesítés</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-md border border-green-100">
          <h4 className="text-sm text-green-800 mb-1">Bevételek (idén)</h4>
          <p className="text-2xl font-bold text-green-800">{financialData.totalIncome.toLocaleString()} EUR</p>
        </div>
        <div className="bg-red-50 p-4 rounded-md border border-red-100">
          <h4 className="text-sm text-red-800 mb-1">Kiadások (idén)</h4>
          <p className="text-2xl font-bold text-red-800">{financialData.totalExpenses.toLocaleString()} EUR</p>
        </div>
      </div>
      <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
        <h4 className="text-sm text-blue-800 mb-1">Eredmény</h4>
        <p className="text-2xl font-bold text-blue-800">{financialData.balance.toLocaleString()} EUR</p>
      </div>
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Bevétel források szerint</h4>
        <div className="space-y-2">
          {financialData.incomeBySource.map((source, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span>{source.name}</span>
              <span className="font-medium">{source.amount.toLocaleString()} EUR</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const ComprehensiveDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    projects: [],
    servers: [],
    domains: [],
    licenses: [],
    invoices: [],
    contacts: [],
    notifications: [],
    comments: [],
    files: [],
    financialData: {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      incomeBySource: []
    }
  });

  // Function to fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch data in parallel for better performance
      const [
        projectsRes,
        serversRes,
        domainsRes,
        licensesRes,
        commentsRes,
        filesRes,
        contactsRes,
        notificationsRes,
        financialRes
      ] = await Promise.all([
        api.get('/api/projects?limit=100'),
        api.get('/api/servers'),
        api.get('/api/domains'),
        api.get('/api/licenses'),
        api.get('/api/comments'),
        api.get('/api/files'),
        api.get('/api/contacts'),
        api.get('/api/notifications'),
        api.get('/api/accounting/statistics?year=2025')
      ]);

      // Parse JSON responses
      const projects = await projectsRes.json();
      const servers = await serversRes.json();
      const domains = await domainsRes.json();
      const licenses = await licensesRes.json();
      const comments = await commentsRes.json();
      const files = await filesRes.json();
      const contacts = await contactsRes.json();
      const notifications = await notificationsRes.json();
      const financialData = await financialRes.json();

      // Extract all invoices from projects
      const invoices = projects.flatMap(project => project.invoices || []);

      // Calculate financial metrics if needed
      const financialSummary = {
        totalIncome: financialData.totalIncome || 0,
        totalExpenses: financialData.totalExpenses || 0,
        balance: financialData.balance || 0,
        incomeBySource: financialData.projectIncomes?.map(p => ({
          name: p.projectName,
          amount: p.total
        })) || []
      };

      // Update state with fetched data
      setDashboardData({
        projects,
        servers,
        domains,
        licenses,
        invoices,
        comments,
        files,
        contacts,
        notifications,
        financialData: financialSummary
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Hiba történt az adatok betöltése során');
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
    
    // Set up interval to refresh data every 5 minutes
    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000);
    
    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Find recent activities across projects, invoices, etc.
  const recentActivities = [
    ...dashboardData.projects
      .filter(p => p.updatedAt)
      .map(p => ({
        title: `Projekt frissítve: ${p.name}`,
        description: `${p.client?.name || 'Ügyfél'} projektje frissítve`,
        time: new Date(p.updatedAt).toLocaleString(),
        icon: Briefcase,
        iconBg: 'bg-indigo-500'
      })),
    ...dashboardData.invoices
      .filter(i => i.date)
      .map(i => ({
        title: `Számla kiállítva: ${i.number}`,
        description: `${i.totalAmount} EUR értékben`,
        time: new Date(i.date).toLocaleString(),
        icon: CreditCard,
        iconBg: 'bg-green-500'
      })),
    ...dashboardData.comments
      .filter(c => c.timestamp)
      .map(c => ({
        title: `Új hozzászólás`,
        description: c.text?.substring(0, 50) + (c.text?.length > 50 ? '...' : ''),
        time: new Date(c.timestamp).toLocaleString(),
        icon: MessageCircle,
        iconBg: 'bg-blue-500'
      })),
    ...dashboardData.contacts
      .filter(c => c.createdAt)
      .map(c => ({
        title: `Kapcsolatfelvétel: ${c.subject}`,
        description: `${c.name} (${c.email})`,
        time: new Date(c.createdAt).toLocaleString(),
        icon: Mail,
        iconBg: 'bg-yellow-500'
      }))
  ]
  // Sort by time (newest first) and take latest 10
  .sort((a, b) => new Date(b.time) - new Date(a.time))
  .slice(0, 10);

  // Generate alerts based on various conditions
  const alerts = [
    // Domain expiry alerts
    ...dashboardData.domains
      .filter(domain => {
        const expiryDate = new Date(domain.expiryDate);
        const now = new Date();
        return (expiryDate - now) / (1000 * 60 * 60 * 24) <= 30; // 30 days or less
      })
      .map(domain => {
        const days = Math.floor((new Date(domain.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        return {
          title: `Domain lejárat: ${domain.name}`,
          message: `${days} nap múlva lejár`,
          level: days <= 7 ? 'critical' : 'warning',
          source: 'domain'
        };
      }),
    
    // Invoice overdue alerts
    ...dashboardData.invoices
      .filter(inv => {
        return inv.status === 'kiállított' && new Date(inv.dueDate) < new Date();
      })
      .map(inv => {
        const days = Math.floor((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
        return {
          title: `Lejárt számla: ${inv.number}`,
          message: `${days} napja lejárt, ${inv.totalAmount} EUR értékben`,
          level: days > 14 ? 'critical' : 'warning',
          source: 'invoice'
        };
      }),
    
    // Server alerts
    ...dashboardData.servers
      .filter(server => server.status !== 'active')
      .map(server => ({
        title: `Szerver probléma: ${server.name}`,
        message: `Státusz: ${server.status}`,
        level: server.status === 'maintenance' ? 'warning' : 'critical',
        source: 'server'
      })),
    
    // License expiry alerts
    ...dashboardData.licenses
      .filter(license => {
        if (!license.renewal?.nextRenewalDate) return false;
        const renewalDate = new Date(license.renewal.nextRenewalDate);
        const now = new Date();
        return (renewalDate - now) / (1000 * 60 * 60 * 24) <= 30; // 30 days or less
      })
      .map(license => {
        const days = Math.floor((new Date(license.renewal.nextRenewalDate) - new Date()) / (1000 * 60 * 60 * 24));
        return {
          title: `Licensz megújítás: ${license.name}`,
          message: `${days} nap múlva esedékes`,
          level: days <= 7 ? 'critical' : 'warning',
          source: 'license'
        };
      })
  ];

  // Calculate summary metrics
  const metrics = {
    activeProjects: dashboardData.projects.filter(p => p.status === 'aktív').length,
    totalServers: dashboardData.servers.length,
    totalDomains: dashboardData.domains.length,
    pendingInvoices: dashboardData.invoices.filter(i => i.status === 'kiállított').length,
    totalIncome: dashboardData.financialData.totalIncome,
    totalContacts: dashboardData.contacts.length,
    totalFiles: dashboardData.files.length,
    openTickets: 0, // Could be added if there's ticket data
    alertsCount: alerts.length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent shadow"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Irányítópult</h1>
          <button 
            onClick={fetchDashboardData}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Frissítés
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <MetricCard 
            title="Aktív projektek" 
            value={metrics.activeProjects} 
            icon={Briefcase} 
            color="bg-indigo-500" 
          />
          <MetricCard 
            title="Szerverek" 
            value={metrics.totalServers} 
            icon={Server} 
            color="bg-blue-500" 
          />
          <MetricCard 
            title="Domainek" 
            value={metrics.totalDomains} 
            icon={Globe} 
            color="bg-green-500" 
          />
          <MetricCard 
            title="Folyamatban lévő számlák" 
            value={metrics.pendingInvoices} 
            icon={CreditCard} 
            color="bg-yellow-500" 
          />
          <MetricCard 
            title="Bevétel (2024)" 
            value={`${metrics.totalIncome.toLocaleString()} EUR`} 
            icon={DollarSign} 
            color="bg-emerald-500" 
            change="+12.5%"
          />
          <MetricCard 
            title="Kapcsolatfelvételek" 
            value={metrics.totalContacts} 
            icon={Users} 
            color="bg-purple-500" 
          />
          <MetricCard 
            title="Feltöltött fájlok" 
            value={metrics.totalFiles} 
            icon={FileText} 
            color="bg-pink-500" 
          />
          <MetricCard 
            title="Figyelmeztetések" 
            value={metrics.alertsCount} 
            icon={AlertTriangle} 
            color={metrics.alertsCount > 5 ? "bg-red-500" : "bg-orange-500"} 
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activities */}
            <RecentActivity activities={recentActivities} />
            
            {/* Project Status Chart */}
            <ProjectStatusChart projectsData={dashboardData.projects} />
            
            {/* Server Status */}
            <ServerStatus servers={dashboardData.servers} />
          </div>
          
          {/* Right Column */}
          <div className="space-y-6">
            {/* Alerts */}
            <Alerts alerts={alerts} />
            
            {/* Invoice Status */}
            <InvoiceStatus invoices={dashboardData.invoices} />
            
            {/* Domain Expiration */}
            <DomainExpiration domains={dashboardData.domains} />
            
            {/* Accounting Summary */}
            <AccountingSummary financialData={dashboardData.financialData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveDashboard;