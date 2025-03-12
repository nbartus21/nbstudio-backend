import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  AlertCircle, CheckCircle, Clock, FileText, Globe, 
  DollarSign, Users, MessageSquare, Bell, ArrowUp, ArrowDown,
  Calendar, Database, Shield, CreditCard, Archive, RefreshCw 
} from 'lucide-react';
import { api } from '../services/auth'; // Import api with authentication

// Base API URL
const API_URL = '/api'; // Use relative path - no need for full domain

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      activeProjects: 0,
      openTickets: 0,
      pendingInvoices: 0,
      activeTasks: 0,
      totalRevenue: 0,
      domains: { active: 0, expiringSoon: 0 },
      tickets: { new: 0, open: 0, pending: 0 }
    },
    recentActivity: [],
    financialData: {
      monthly: [],
      invoiceStatus: []
    },
    alerts: []
  });

  // Fetch all required data for the dashboard
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Initialize data collection object
        const data = {
          projects: [],
          tickets: [],
          tasks: [],
          domains: [],
          financialData: []
        };
        
        // Fetch projects - this is critical, so we don't catch errors here
        const projectsResponse = await api.get(`${API_URL}/projects`);
        if (!projectsResponse.ok) throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
        data.projects = await projectsResponse.json();
        
        // Fetch other data with try/catch for each endpoint to prevent one failure from stopping everything
        
        // Try to fetch support tickets
        try {
          const ticketsResponse = await api.get(`${API_URL}/support/tickets`);
          if (ticketsResponse.ok) {
            const ticketsData = await ticketsResponse.json();
            data.tickets = ticketsData.tickets || ticketsData || [];
          }
        } catch (err) {
          console.warn('Could not fetch tickets:', err.message);
        }
        
        // Tasks endpoint is returning 404 so we'll skip it based on the error logs
        /* 
        try {
          const tasksResponse = await api.get(`${API_URL}/tasks`);
          if (tasksResponse.ok) {
            data.tasks = await tasksResponse.json();
          }
        } catch (err) {
          console.warn('Could not fetch tasks:', err.message);
        }
        */
        
        // Try to fetch domains
        try {
          const domainsResponse = await api.get(`${API_URL}/domains`);
          if (domainsResponse.ok) {
            data.domains = await domainsResponse.json();
          }
        } catch (err) {
          console.warn('Could not fetch domains:', err.message);
        }
        
        // Try to fetch financial data
        try {
          const financialResponse = await api.get(`${API_URL}/transactions`);
          if (financialResponse.ok) {
            data.financialData = await financialResponse.json();
          }
        } catch (err) {
          console.warn('Could not fetch financial data:', err.message);
        }
        
        // Process data for the dashboard
        const now = new Date();
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        
        // Process projects data
        const activeProjects = data.projects.filter(project => project.status === 'aktív').length;
        
        // Process tickets data
        const tickets = data.tickets;
        const newTickets = tickets.filter(ticket => ticket.status === 'new').length;
        const openTickets = tickets.filter(ticket => ticket.status === 'open').length;
        const pendingTickets = tickets.filter(ticket => ticket.status === 'pending').length;
        
        // Process tasks data (not using this since the endpoint returns 404)
        const activeTasks = 0;
        
        // Process domains data
        const activeDomainsCount = data.domains.filter(domain => domain.status === 'active').length;
        const expiringSoonDomainsCount = data.domains.filter(domain => {
          if (!domain.expiryDate) return false;
          const expiryDate = new Date(domain.expiryDate);
          return domain.status === 'active' && expiryDate <= thirtyDaysFromNow;
        }).length;
        
        // Process financial data
        // Calculate total revenue
        const paidInvoices = data.financialData.filter(
          transaction => transaction.type === 'income' && transaction.paymentStatus === 'paid'
        );
        const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        
        // Calculate pending invoices
        const pendingInvoices = data.financialData.filter(
          transaction => transaction.type === 'income' && transaction.paymentStatus === 'pending'
        ).length;
        
        // Prepare monthly financial data (last 3 months)
        const last3Months = getLastMonths(3);
        const monthlyFinancialData = last3Months.map(month => {
          const monthlyRevenue = data.financialData
            .filter(t => t.type === 'income' && t.date && new Date(t.date).getMonth() === month.index)
            .reduce((sum, t) => sum + (t.amount || 0), 0);
            
          const monthlyExpenses = data.financialData
            .filter(t => t.type === 'expense' && t.date && new Date(t.date).getMonth() === month.index)
            .reduce((sum, t) => sum + (t.amount || 0), 0);
            
          return {
            month: month.name,
            revenue: monthlyRevenue,
            expenses: monthlyExpenses
          };
        });
        
        // Prepare invoice status data
        const paidCount = data.financialData.filter(t => t.type === 'income' && t.paymentStatus === 'paid').length;
        const pendingCount = data.financialData.filter(t => t.type === 'income' && t.paymentStatus === 'pending').length;
        const overdueCount = data.financialData.filter(t => t.type === 'income' && t.paymentStatus === 'overdue').length;
        
        const invoiceStatusData = [
          { name: 'Fizetve', value: paidCount },
          { name: 'Függőben', value: pendingCount },
          { name: 'Lejárt', value: overdueCount }
        ];
        
        // Prepare recent activity
        const recentActivity = [];
        
        // Add recent projects
        const recentProjects = data.projects
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 2);
          
        recentProjects.forEach(project => {
          recentActivity.push({
            type: 'project',
            action: 'created',
            name: project.name,
            timestamp: project.createdAt || new Date().toISOString()
          });
        });
        
        // Add recent paid invoices
        const recentPaidInvoices = paidInvoices
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
          .slice(0, 2);
          
        recentPaidInvoices.forEach(invoice => {
          recentActivity.push({
            type: 'invoice',
            action: 'paid',
            name: invoice.invoiceNumber || (invoice._id ? `INV-${invoice._id.slice(-6)}` : 'Unknown'),
            amount: invoice.amount,
            timestamp: invoice.date || new Date().toISOString()
          });
        });
        
        // Add recently resolved tickets
        const resolvedTickets = tickets
          .filter(ticket => ticket.status === 'resolved')
          .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
          .slice(0, 2);
          
        resolvedTickets.forEach(ticket => {
          recentActivity.push({
            type: 'ticket',
            action: 'resolved',
            name: ticket.subject || 'Unknown',
            timestamp: ticket.updatedAt || new Date().toISOString()
          });
        });
        
        // Add recently renewed domains
        const recentlyRenewedDomains = data.domains
          .filter(domain => {
            if (!domain.history) return false;
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            const history = domain.history || [];
            return history.some(h => h.action === 'renew' && h.date && new Date(h.date) >= lastWeek);
          })
          .slice(0, 1);
          
        recentlyRenewedDomains.forEach(domain => {
          recentActivity.push({
            type: 'domain',
            action: 'renewed',
            name: domain.name,
            timestamp: domain.updatedAt || new Date().toISOString()
          });
        });
        
        // Sort all recent activity by timestamp
        recentActivity.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        
        // Prepare alerts
        const alerts = [];
        
        // Add domain expiry alerts
        data.domains
          .filter(domain => {
            if (!domain.expiryDate) return false;
            const expiryDate = new Date(domain.expiryDate);
            const twoWeeksFromNow = new Date();
            twoWeeksFromNow.setDate(now.getDate() + 14);
            return domain.status === 'active' && expiryDate <= twoWeeksFromNow;
          })
          .forEach((domain, index) => {
            const daysToExpiry = Math.ceil((new Date(domain.expiryDate) - now) / (1000 * 60 * 60 * 24));
            alerts.push({
              id: `domain-${index}`,
              severity: daysToExpiry <= 7 ? 'high' : 'medium',
              message: `Domain ${domain.name} lejár ${daysToExpiry} napon belül`,
              timestamp: now.toISOString()
            });
          });
        
        // Add ticket response alerts
        const oldPendingTickets = tickets.filter(ticket => {
          if (!ticket.updatedAt && !ticket.createdAt) return false;
          const lastActivity = new Date(ticket.updatedAt || ticket.createdAt);
          const oneDayAgo = new Date();
          oneDayAgo.setDate(now.getDate() - 1);
          return (ticket.status === 'new' || ticket.status === 'pending') && lastActivity <= oneDayAgo;
        });
        
        if (oldPendingTickets.length > 0) {
          alerts.push({
            id: 'ticket-response',
            severity: 'medium',
            message: `${oldPendingTickets.length} jegy vár válaszra több mint 24 órája`,
            timestamp: now.toISOString()
          });
        }
        
        // Add overdue invoice alerts
        if (overdueCount > 0) {
          alerts.push({
            id: 'overdue-invoices',
            severity: 'high',
            message: `${overdueCount} számla fizetési határideje lejárt`,
            timestamp: now.toISOString()
          });
        }
        
        // Prepare the dashboard data
        const processedData = {
          stats: {
            activeProjects,
            openTickets: newTickets + openTickets + pendingTickets,
            pendingInvoices,
            activeTasks,
            totalRevenue,
            domains: { 
              active: activeDomainsCount, 
              expiringSoon: expiringSoonDomainsCount 
            },
            tickets: { 
              new: newTickets, 
              open: openTickets, 
              pending: pendingTickets 
            }
          },
          recentActivity,
          financialData: {
            monthly: monthlyFinancialData,
            invoiceStatus: invoiceStatusData
          },
          alerts
        };
        
        setDashboardData(processedData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Helper function to get names and indices of last N months
  const getLastMonths = (count) => {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const month = new Date();
      month.setMonth(now.getMonth() - i);
      
      const monthName = month.toLocaleString('hu-HU', { month: 'short' });
      months.unshift({
        name: monthName,
        index: month.getMonth()
      });
    }
    
    return months;
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('hu-HU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'Invalid date';
    }
  };

  // Handle token refresh
  const handleTokenRefresh = async () => {
    try {
      // Attempt to refresh the token
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include' // Include cookies
      });
      
      if (refreshResponse.ok) {
        // Reload the page to use the new token
        window.location.reload();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Token refresh failed:', err);
      return false;
    }
  };

  // Handle auth error
  const handleAuthError = () => {
    // Redirect to login
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
            <p className="text-red-700">Az adatok betöltése sikertelen: {error}</p>
          </div>
          <div className="mt-4 flex space-x-3">
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-100 hover:bg-red-200 text-red-800 font-semibold py-2 px-4 rounded"
            >
              Újrapróbálkozás
            </button>
            <button 
              onClick={handleTokenRefresh}
              className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded"
            >
              Munkamenet frissítése
            </button>
            <button 
              onClick={handleAuthError}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded"
            >
              Bejelentkezés
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Colors for charts
  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 mr-4">
              <Archive className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Aktív Projektek</p>
              <div className="flex items-end">
                <h2 className="text-2xl font-bold">{dashboardData.stats.activeProjects}</h2>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Nyitott Támogatási Jegyek</p>
              <div className="flex items-end">
                <h2 className="text-2xl font-bold">{dashboardData.stats.openTickets}</h2>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Teljes Bevétel</p>
              <div className="flex items-end">
                <h2 className="text-2xl font-bold">{formatCurrency(dashboardData.stats.totalRevenue)}</h2>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Függőben Lévő Számlák</p>
              <div className="flex items-end">
                <h2 className="text-2xl font-bold">{dashboardData.stats.pendingInvoices}</h2>
                <span className="text-xs text-gray-600 ml-2">db</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Alerts & Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Pénzügyi Áttekintés</h2>
              <div className="text-sm text-gray-500">Utolsó 3 hónap</div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dashboardData.financialData.monthly}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Bevétel" fill="#10B981" />
                  <Bar dataKey="expenses" name="Kiadás" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-white rounded-lg shadow p-6 h-full">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <h2 className="text-lg font-semibold">Figyelmeztetések</h2>
            </div>
            {dashboardData.alerts.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-3 rounded-lg ${
                      alert.severity === 'high' ? 'bg-red-50 border-l-4 border-red-500' :
                      alert.severity === 'medium' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
                      'bg-blue-50 border-l-4 border-blue-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className={`text-sm ${
                        alert.severity === 'high' ? 'text-red-800' :
                        alert.severity === 'medium' ? 'text-yellow-800' :
                        'text-blue-800'
                      }`}>
                        {alert.message}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 block">
                      {formatDate(alert.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <CheckCircle className="h-12 w-12 mb-2" />
                <p>Nincsenek aktív figyelmeztetések</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* System Status & Invoice Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Számlák Állapota</h2>
            {dashboardData.financialData.invoiceStatus.some(item => item.value > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.financialData.invoiceStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {dashboardData.financialData.invoiceStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} db`, 'Mennyiség']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <p>Nincs elegendő adat a megjelenítéshez</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <div className="h-3 w-3 rounded-full bg-green-500 mr-1"></div>
                  <span className="text-xs font-medium">Fizetett</span>
                </div>
                <p className="text-lg font-bold">
                  {dashboardData.financialData.invoiceStatus[0]?.value || 0}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <div className="h-3 w-3 rounded-full bg-yellow-500 mr-1"></div>
                  <span className="text-xs font-medium">Függőben</span>
                </div>
                <p className="text-lg font-bold">
                  {dashboardData.financialData.invoiceStatus[1]?.value || 0}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <div className="h-3 w-3 rounded-full bg-red-500 mr-1"></div>
                  <span className="text-xs font-medium">Lejárt</span>
                </div>
                <p className="text-lg font-bold">
                  {dashboardData.financialData.invoiceStatus[2]?.value || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Rendszer Állapot</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Globe className="h-5 w-5 text-indigo-600 mr-2" />
                  <h3 className="font-medium">Domain-ek</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Aktív</span>
                    <div className="flex items-center">
                      <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></span>
                      <span className="font-medium">{dashboardData.stats.domains.active}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Hamarosan lejár</span>
                    <div className="flex items-center">
                      <span className="h-2 w-2 rounded-full bg-yellow-500 mr-1.5"></span>
                      <span className="font-medium">{dashboardData.stats.domains.expiringSoon}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <MessageSquare className="h-5 w-5 text-indigo-600 mr-2" />
                  <h3 className="font-medium">Support</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Új</span>
                    <div className="flex items-center">
                      <span className="font-medium">{dashboardData.stats.tickets.new}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Nyitott</span>
                    <div className="flex items-center">
                      <span className="font-medium">{dashboardData.stats.tickets.open}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Függőben</span>
                    <div className="flex items-center">
                      <span className="font-medium">{dashboardData.stats.tickets.pending}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Remove tasks section since endpoint is not available */}
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-white rounded-lg shadow p-6 h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Legutóbbi Aktivitás</h2>
              <RefreshCw className="h-4 w-4 text-gray-400 cursor-pointer" onClick={() => window.location.reload()} />
            </div>
            {dashboardData.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start">
                    <div className={`rounded-full p-2 mr-3 ${
                      activity.type === 'project' ? 'bg-indigo-100' :
                      activity.type === 'invoice' ? 'bg-green-100' :
                      activity.type === 'ticket' ? 'bg-blue-100' :
                      activity.type === 'domain' ? 'bg-yellow-100' :
                      'bg-gray-100'
                    }`}>
                      {activity.type === 'project' && <Archive className={`h-4 w-4 text-indigo-600`} />}
                      {activity.type === 'invoice' && <CreditCard className={`h-4 w-4 text-green-600`} />}
                      {activity.type === 'ticket' && <MessageSquare className={`h-4 w-4 text-blue-600`} />}
                      {activity.type === 'domain' && <Globe className={`h-4 w-4 text-yellow-600`} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {activity.type === 'project' && `Új projekt: ${activity.name}`}
                        {activity.type === 'invoice' && `Számla ${activity.action === 'paid' ? 'kifizetve' : 'létrehozva'}: ${activity.name}`}
                        {activity.type === 'ticket' && `Support jegy ${activity.action === 'resolved' ? 'megoldva' : 'létrehozva'}: ${activity.name}`}
                        {activity.type === 'domain' && `Domain ${activity.action === 'renewed' ? 'megújítva' : 'regisztrálva'}: ${activity.name}`}
                      </p>
                      <span className="text-xs text-gray-500">{formatDate(activity.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <p>Nincs közelmúltbeli aktivitás</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Gyors Műveletek</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <a href="/projects" className="flex flex-col items-center justify-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
            <Archive className="h-6 w-6 text-indigo-600 mb-2" />
            <span className="text-sm font-medium text-indigo-700">Projektek</span>
          </a>
          
          <a href="/accounting" className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <FileText className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-700">Számlák</span>
          </a>
          
          <a href="/support" className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <MessageSquare className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-700">Support</span>
          </a>
          
          <a href="/domains" className="flex flex-col items-center justify-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
            <Globe className="h-6 w-6 text-yellow-600 mb-2" />
            <span className="text-sm font-medium text-yellow-700">Domain-ek</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;