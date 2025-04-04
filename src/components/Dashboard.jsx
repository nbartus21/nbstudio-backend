import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  AlertCircle, CheckCircle, Clock, FileText, Globe,
  DollarSign, Users, MessageSquare, Bell, ArrowUp, ArrowDown,
  Calendar, Database, Shield, CreditCard, Archive, RefreshCw,
  Settings, Info, Clipboard, TrendingUp, Zap, Server, HardDrive, Coffee,
  ChevronRight, ChevronLeft, Search, Filter, Download, Share2,
  MoreVertical, Plus, BarChart2, PieChart as PieChartIcon,
  LineChart as LineChartIcon, Activity, AlertTriangle
} from 'lucide-react';
import { api } from '../services/auth'; // Import api with authentication

// Base API URL
const API_URL = '/api'; // Use relative path - no need for full domain

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 perc
  const [dateRange, setDateRange] = useState('30d'); // 30 nap alapértelmezett
  const [selectedView, setSelectedView] = useState('overview'); // overview, financial, projects
  const [dashboardData, setDashboardData] = useState({
    stats: {
      activeProjects: 0,
      openTickets: 0,
      pendingInvoices: 0,
      activeTasks: 0,
      totalRevenue: 0,
      domains: { active: 0, expiringSoon: 0 },
      tickets: { new: 0, open: 0, pending: 0 },
      serverStatus: { cpu: 0, memory: 0, disk: 0, uptime: 0 },
      userStats: { total: 0, active: 0, newThisMonth: 0 }
    },
    recentActivity: [],
    financialData: {
      monthly: [],
      invoiceStatus: [],
      quarterlyGrowth: []
    },
    projectStats: {
      statusDistribution: [],
      typeDistribution: [],
      monthlyCompletion: []
    },
    alerts: []
  });

  // Memoize expensive calculations
  const processedFinancialData = useMemo(() => {
    return {
      monthly: dashboardData.financialData.monthly,
      invoiceStatus: dashboardData.financialData.invoiceStatus,
      quarterlyGrowth: dashboardData.financialData.quarterlyGrowth
    };
  }, [dashboardData.financialData]);

  const processedProjectStats = useMemo(() => {
    return {
      statusDistribution: dashboardData.projectStats.statusDistribution,
      typeDistribution: dashboardData.projectStats.typeDistribution,
      monthlyCompletion: dashboardData.projectStats.monthlyCompletion
    };
  }, [dashboardData.projectStats]);

  // Auto-refresh functionality
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Date range filter effect
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  // Helper function to filter data by date range
  const filterDataByDateRange = (data, range) => {
    const now = new Date();
    const ranges = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };

    const days = ranges[range] || 30;
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);

    return {
      ...data,
      financialData: data.financialData?.filter(item =>
        new Date(item.date) >= startDate
      ) || [],
      recentActivity: data.recentActivity?.filter(item =>
        new Date(item.timestamp) >= startDate
      ) || []
    };
  };

  // Fetch all required data for the dashboard
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
        financialData: [],
        recentActivity: [] // Initialize recentActivity array
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
        const financialResponse = await api.get(`${API_URL}/accounting/transactions`);
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

      // Try to fetch tasks data
      try {
        const tasksResponse = await api.get(`${API_URL}/translation/tasks`);
        if (tasksResponse.ok) {
          data.tasks = await tasksResponse.json();
        }
      } catch (err) {
        console.warn('Could not fetch tasks:', err.message);
      }

      // Process tasks data
      const activeTasks = data.tasks?.filter(task => task.status === 'active')?.length || 0;

      // Process domains data
      const activeDomainsCount = data.domains.filter(domain => domain.status === 'active').length;
      const expiringSoonDomainsCount = data.domains.filter(domain => {
        if (!domain.expiryDate) return false;
        const expiryDate = new Date(domain.expiryDate);
        return domain.status === 'active' && expiryDate <= thirtyDaysFromNow;
      }).length;

      // Generate mock server status data (since we don't have a real endpoint)
      const serverStatus = {
        cpu: Math.floor(Math.random() * 35) + 15, // 15-50% CPU usage
        memory: Math.floor(Math.random() * 40) + 30, // 30-70% memory usage
        disk: Math.floor(Math.random() * 30) + 40, // 40-70% disk usage
        uptime: Math.floor(Math.random() * 90) + 30 // 30-120 days uptime
      };

      // Generate mock user statistics (since we don't have a real endpoint)
      const userStats = {
        total: Math.floor(Math.random() * 50) + 150, // 150-200 total users
        active: Math.floor(Math.random() * 30) + 70, // 70-100 active users
        newThisMonth: Math.floor(Math.random() * 15) + 5 // 5-20 new users this month
      };

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

      // Generate quarterly growth data
      const quarterlyGrowth = [
        { quarter: 'Q1', revenue: Math.floor(Math.random() * 5000) + 15000, growth: Math.floor(Math.random() * 30) - 10 },
        { quarter: 'Q2', revenue: Math.floor(Math.random() * 8000) + 18000, growth: Math.floor(Math.random() * 25) + 5 },
        { quarter: 'Q3', revenue: Math.floor(Math.random() * 10000) + 20000, growth: Math.floor(Math.random() * 20) + 10 },
        { quarter: 'Q4', revenue: Math.floor(Math.random() * 12000) + 25000, growth: Math.floor(Math.random() * 15) + 15 }
      ];

      // Generate project statistics
      // Project status distribution
      const projectStatusCounts = {
        active: data.projects.filter(p => p.status === 'aktív').length,
        completed: data.projects.filter(p => p.status === 'befejezett').length,
        suspended: data.projects.filter(p => p.status === 'felfüggesztett').length,
        planning: data.projects.filter(p => p.status === 'tervezés').length || Math.floor(Math.random() * 5) + 1
      };

      const projectStatusDistribution = [
        { name: 'Aktív', value: projectStatusCounts.active },
        { name: 'Befejezett', value: projectStatusCounts.completed },
        { name: 'Felfüggesztett', value: projectStatusCounts.suspended },
        { name: 'Tervezés', value: projectStatusCounts.planning }
      ];

      // Project type distribution (mocked)
      const projectTypeDistribution = [
        { name: 'Webfejlesztés', value: Math.floor(Math.random() * 20) + 20 },
        { name: 'Mobilalkalmazás', value: Math.floor(Math.random() * 15) + 10 },
        { name: 'UI/UX Design', value: Math.floor(Math.random() * 10) + 5 },
        { name: 'Tanácsadás', value: Math.floor(Math.random() * 10) + 5 }
      ];

      // Monthly project completion (mocked)
      const monthlyProjectCompletion = getLastMonths(6).map(month => ({
        month: month.name,
        completed: Math.floor(Math.random() * 6) + 1
      }));

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

      // Add recently completed tasks
      const completedTasks = data.tasks
        ?.filter(task => task.status === 'completed' && task.completedAt)
        ?.sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
        ?.slice(0, 2) || [];

      completedTasks.forEach(task => {
        recentActivity.push({
          type: 'task',
          action: 'completed',
          name: task.title || 'Unknown Task',
          timestamp: task.completedAt || new Date().toISOString()
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

      // Add upcoming task deadline alerts
      const upcomingTasks = data.tasks?.filter(task => {
        if (!task.dueDate || task.status === 'completed') return false;
        const dueDate = new Date(task.dueDate);
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3);
        return dueDate <= threeDaysFromNow && dueDate >= now;
      }) || [];

      if (upcomingTasks.length > 0) {
        alerts.push({
          id: 'upcoming-tasks',
          severity: 'medium',
          message: `${upcomingTasks.length} feladat határideje 3 napon belül esedékes`,
          timestamp: now.toISOString()
        });
      }

      // Add recentActivity to data object
      data.recentActivity = recentActivity;

      // Add date range filtering
      const filteredData = filterDataByDateRange(data, dateRange);

      // Process the filtered data
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
          },
          serverStatus: serverStatus,
          userStats: userStats
        },
        recentActivity: filteredData.recentActivity,
        financialData: {
          monthly: filteredData.monthlyFinancialData || monthlyFinancialData,
          invoiceStatus: invoiceStatusData,
          quarterlyGrowth: quarterlyGrowth
        },
        projectStats: {
          statusDistribution: projectStatusDistribution,
          typeDistribution: projectTypeDistribution,
          monthlyCompletion: monthlyProjectCompletion
        },
        tasks: data.tasks || [],
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

  // Handle refresh interval change
  const handleRefreshIntervalChange = (interval) => {
    setRefreshInterval(interval);
  };

  // Handle date range change
  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  // Handle view change
  const handleViewChange = (view) => {
    setSelectedView(view);
  };

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
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Adatok betöltése...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-500 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Hiba történt</h3>
              <p className="text-red-700 mt-1">Az adatok betöltése sikertelen: {error}</p>
            </div>
          </div>
          <div className="mt-6 flex space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Újrapróbálkozás
            </button>
            <button
              onClick={handleTokenRefresh}
              className="inline-flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-lg transition-colors"
            >
              <Shield className="h-4 w-4 mr-2" />
              Munkamenet frissítése
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
              <div className="ml-4 flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>
                  Aktív
                </span>
                <span className="text-sm text-gray-500">
                  Utolsó frissítés: {new Date().toLocaleString('hu-HU')}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Refresh Interval Selector */}
              <select
                value={refreshInterval}
                onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
                className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="60000">1 perc</option>
                <option value="300000">5 perc</option>
                <option value="600000">10 perc</option>
                <option value="900000">15 perc</option>
              </select>

              {/* Date Range Selector */}
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="7d">Utolsó 7 nap</option>
                <option value="30d">Utolsó 30 nap</option>
                <option value="90d">Utolsó 90 nap</option>
                <option value="1y">Utolsó év</option>
              </select>

              {/* View Selector */}
              <select
                value={selectedView}
                onChange={(e) => handleViewChange(e.target.value)}
                className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="overview">Áttekintés</option>
                <option value="financial">Pénzügyek</option>
                <option value="projects">Projektek</option>
                <option value="tasks">Feladatok</option>
              </select>

              <button className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100">
                <Bell className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktív Projektek</p>
                <div className="mt-2 flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{dashboardData.stats.activeProjects}</p>
                  <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                    <ArrowUp className="h-4 w-4 mr-1" />
                    8%
                  </p>
                </div>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Archive className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                <span>12 projekt vár jóváhagyásra</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Nyitott Támogatási Jegyek</p>
                <div className="mt-2 flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{dashboardData.stats.openTickets}</p>
                  <p className="ml-2 flex items-baseline text-sm font-semibold text-red-600">
                    <ArrowUp className="h-4 w-4 mr-1" />
                    12%
                  </p>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>Átlagos válaszidő: 2.5 óra</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Teljes Bevétel</p>
                <div className="mt-2 flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(dashboardData.stats.totalRevenue)}</p>
                  <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                    <ArrowUp className="h-4 w-4 mr-1" />
                    15%
                  </p>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Növekedés az előző hónaphoz képest</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Függőben Lévő Számlák</p>
                <div className="mt-2 flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{dashboardData.stats.pendingInvoices}</p>
                  <p className="ml-2 flex items-baseline text-sm font-semibold text-yellow-600">
                    <ArrowDown className="h-4 w-4 mr-1" />
                    5%
                  </p>
                </div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>3 számla lejár 7 napon belül</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktív Feladatok</p>
                <div className="mt-2 flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{dashboardData.stats.activeTasks}</p>
                  <p className="ml-2 flex items-baseline text-sm font-semibold text-blue-600">
                    <ArrowDown className="h-4 w-4 mr-1" />
                    5%
                  </p>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <CheckSquare className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>3 feladat közelgő határidővel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section - Conditional Rendering based on selectedView */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {selectedView === 'overview' && (
            <>
              {/* Financial Overview */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Pénzügyi Áttekintés</h2>
                    <p className="text-sm text-gray-500 mt-1">Havi bevétel és kiadások</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100">
                      <Download className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100">
                      <Share2 className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={processedFinancialData.monthly}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" stroke="#6B7280" />
                      <YAxis stroke="#6B7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '0.5rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10B981"
                        fillOpacity={1}
                        fill="url(#revenue)"
                        name="Bevétel"
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        stroke="#F59E0B"
                        fillOpacity={1}
                        fill="url(#expenses)"
                        name="Kiadás"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Project Status */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Projektek Állapota</h2>
                    <p className="text-sm text-gray-500 mt-1">Aktuális projekt eloszlás</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100">
                      <PieChartIcon className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100">
                      <BarChart2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={processedProjectStats.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {processedProjectStats.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={
                            index === 0 ? '#10B981' : // Aktív - zöld
                            index === 1 ? '#6366F1' : // Befejezett - indigo
                            index === 2 ? '#F59E0B' : // Felfüggesztett - sárga
                            '#94A3B8'  // Tervezés - szürke
                          } />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '0.5rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value) => [`${value} db`, 'Projektek']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {selectedView === 'tasks' && (
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Feladatok Áttekintése</h2>
                  <p className="text-sm text-gray-500 mt-1">Aktív és közelgő feladatok</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100">
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feladat</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioritás</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Határidő</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Haladás</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Státusz</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.tasks?.slice(0, 5).map((task, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.priority === 'high' ? 'bg-red-100 text-red-800' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.priority === 'high' ? 'Magas' : task.priority === 'medium' ? 'Közepes' : 'Alacsony'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(task.dueDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className={`h-2.5 rounded-full ${
                              task.progress >= 80 ? 'bg-green-500' :
                              task.progress >= 40 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} style={{ width: `${task.progress}%` }}></div>
                          </div>
                          <span className="text-xs mt-1 block text-right">{task.progress}%</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {task.status === 'completed' ? 'Befejezve' : 'Aktív'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!dashboardData.tasks || dashboardData.tasks.length === 0) && (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">Nincsenek feladatok</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedView === 'financial' && (
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Részletes Pénzügyi Adatok</h2>
                  <p className="text-sm text-gray-500 mt-1">Bevételek és kiadások részletes elemzése</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100">
                    <Download className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100">
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedFinancialData.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Bar dataKey="revenue" fill="#10B981" name="Bevétel" />
                    <Bar dataKey="expenses" fill="#F59E0B" name="Kiadás" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedView === 'projects' && (
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Projekt Teljesítmény</h2>
                  <p className="text-sm text-gray-500 mt-1">Projektek haladása és teljesítménye</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100">
                    <Download className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100">
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={processedProjectStats.monthlyCompletion}>
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis dataKey="month" stroke="#6B7280" />
                    <PolarRadiusAxis stroke="#6B7280" />
                    <Radar
                      name="Befejezett"
                      dataKey="completed"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.6}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Alerts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Alerts */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Figyelmeztetések</h2>
                <p className="text-sm text-gray-500 mt-1">Aktív rendszerfigyelmeztetések</p>
              </div>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Összes megtekintése
              </button>
            </div>
            {dashboardData.alerts.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg ${
                      alert.severity === 'high' ? 'bg-red-50 border-l-4 border-red-500' :
                      alert.severity === 'medium' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
                      'bg-blue-50 border-l-4 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`p-2 rounded-lg mr-3 ${
                        alert.severity === 'high' ? 'bg-red-100' :
                        alert.severity === 'medium' ? 'bg-yellow-100' :
                        'bg-blue-100'
                      }`}>
                        <AlertTriangle className={`h-5 w-5 ${
                          alert.severity === 'high' ? 'text-red-600' :
                          alert.severity === 'medium' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          alert.severity === 'high' ? 'text-red-800' :
                          alert.severity === 'medium' ? 'text-yellow-800' :
                          'text-blue-800'
                        }`}>
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(alert.timestamp)}
                        </p>
                      </div>
                    </div>
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

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Legutóbbi Aktivitás</h2>
                <p className="text-sm text-gray-500 mt-1">Rendszer események</p>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100">
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
            {dashboardData.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start">
                    <div className={`rounded-lg p-2 mr-3 ${
                      activity.type === 'project' ? 'bg-indigo-100' :
                      activity.type === 'invoice' ? 'bg-green-100' :
                      activity.type === 'ticket' ? 'bg-blue-100' :
                      activity.type === 'domain' ? 'bg-yellow-100' :
                      'bg-gray-100'
                    }`}>
                      {activity.type === 'project' && <Archive className="h-5 w-5 text-indigo-600" />}
                      {activity.type === 'invoice' && <CreditCard className="h-5 w-5 text-green-600" />}
                      {activity.type === 'ticket' && <MessageSquare className="h-5 w-5 text-blue-600" />}
                      {activity.type === 'domain' && <Globe className="h-5 w-5 text-yellow-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.type === 'project' && `Új projekt: ${activity.name}`}
                        {activity.type === 'invoice' && `Számla ${activity.action === 'paid' ? 'kifizetve' : 'létrehozva'}: ${activity.name}`}
                        {activity.type === 'ticket' && `Support jegy ${activity.action === 'resolved' ? 'megoldva' : 'létrehozva'}: ${activity.name}`}
                        {activity.type === 'domain' && `Domain ${activity.action === 'renewed' ? 'megújítva' : 'regisztrálva'}: ${activity.name}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Activity className="h-12 w-12 mb-2" />
                <p>Nincs közelmúltbeli aktivitás</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Gyors Műveletek</h2>
              <p className="text-sm text-gray-500 mt-1">Gyakran használt funkciók</p>
            </div>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Összes megtekintése
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
            <a href="/projects" className="group flex flex-col items-center justify-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
              <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                <Archive className="h-6 w-6 text-indigo-600" />
              </div>
              <span className="mt-2 text-sm font-medium text-indigo-700">Projektek</span>
            </a>

            <a href="/accounting" className="group flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <span className="mt-2 text-sm font-medium text-green-700">Számlák</span>
            </a>

            <a href="/support" className="group flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <span className="mt-2 text-sm font-medium text-blue-700">Support</span>
            </a>

            <a href="/domains" className="group flex flex-col items-center justify-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
              <div className="p-3 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                <Globe className="h-6 w-6 text-yellow-600" />
              </div>
              <span className="mt-2 text-sm font-medium text-yellow-700">Domain-ek</span>
            </a>

            <a href="/users" className="group flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <span className="mt-2 text-sm font-medium text-purple-700">Felhasználók</span>
            </a>

            <a href="/reports" className="group flex flex-col items-center justify-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
              <div className="p-3 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                <Clipboard className="h-6 w-6 text-red-600" />
              </div>
              <span className="mt-2 text-sm font-medium text-red-700">Jelentések</span>
            </a>
          </div>

          <div className="mt-6 flex items-center justify-center">
            <button className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors">
              <Plus className="h-5 w-5 mr-2" />
              Új projekt létrehozása
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;