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
  LineChart as LineChartIcon, Activity, AlertTriangle, CheckSquare,
  MoreHorizontal, Loader, X, Calendar as CalendarIcon, Check
} from 'lucide-react';
import { api } from '../services/auth'; // Import api with authentication

// Base API URL
const API_URL = '/api'; // Use relative path - no need for full domain

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 perc
  const [dateRange, setDateRange] = useState('30d'); // 30 nap alapértelmezett
  const [selectedView, setSelectedView] = useState('overview'); // overview, financial, projects
  const [systemStatus, setSystemStatus] = useState({
    status: 'loading', // loading, online, warning, error
    services: {
      database: { status: 'loading', latency: 0 },
      api: { status: 'loading', latency: 0 },
      storage: { status: 'loading', latency: 0 },
      email: { status: 'loading', latency: 0 }
    },
    lastCheck: new Date()
  });
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [activeWorkflows, setActiveWorkflows] = useState([]);
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
    projects: [],
    tickets: [],
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

  // Fetch calendar events
  const fetchCalendarEvents = async () => {
    try {
      const response = await api.get(`${API_URL}/calendar/events`);
      if (response.ok) {
        const eventsData = await response.json();
        setCalendarEvents(eventsData);
      } else {
        console.warn('Could not fetch calendar events:', response.statusText);
        // Fallback mock data
        const today = new Date();
        const mockEvents = [
          {
            id: 1,
            title: 'Domain megújítás - example.com',
            date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
            type: 'domain'
          },
          {
            id: 2,
            title: 'Weboldal éves karbantartás',
            date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
            type: 'maintenance'
          },
          {
            id: 3,
            title: 'Ügyfél egyeztetés - XYZ Projekt',
            date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
            type: 'meeting'
          },
          {
            id: 4,
            title: 'Havi számlázás',
            date: new Date(today.getFullYear(), today.getMonth() + 1, 1),
            type: 'invoice'
          },
          {
            id: 5,
            title: 'Projekt határidő - Webáruház',
            date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7),
            type: 'project'
          }
        ];
        setCalendarEvents(mockEvents);
      }
    } catch (err) {
      console.warn('Error fetching calendar events:', err);
      // Fallback to default empty array already set in state
    }
  };

  // Fetch active workflows
  const fetchActiveWorkflows = async () => {
    try {
      const response = await api.get(`${API_URL}/workflows/active`);
      if (response.ok) {
        const workflowsData = await response.json();
        setActiveWorkflows(workflowsData);
      } else {
        console.warn('Could not fetch active workflows:', response.statusText);
        // Fallback mock data
        const mockWorkflows = [
          {
            id: 'wf-1',
            name: 'E-commerce Weboldal Fejlesztés',
            status: 'in-progress',
            progress: 68,
            tasks: [
              { name: 'Design jóváhagyás', status: 'completed' },
              { name: 'Frontend fejlesztés', status: 'in-progress' },
              { name: 'Backend integrálás', status: 'pending' }
            ],
            dueDate: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000)
          },
          {
            id: 'wf-2',
            name: 'Marketing Kampány - Q2',
            status: 'in-progress',
            progress: 42,
            tasks: [
              { name: 'Stratégia kidolgozás', status: 'completed' },
              { name: 'Tartalom készítés', status: 'in-progress' },
              { name: 'Hirdetések beállítása', status: 'pending' }
            ],
            dueDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
          },
          {
            id: 'wf-3',
            name: 'Domain és Szerver Migráció',
            status: 'in-progress',
            progress: 85,
            tasks: [
              { name: 'Előkészítés', status: 'completed' },
              { name: 'DNS beállítások', status: 'completed' },
              { name: 'Tartalom migráció', status: 'in-progress' }
            ],
            dueDate: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000)
          }
        ];
        setActiveWorkflows(mockWorkflows);
      }
    } catch (err) {
      console.warn('Error fetching active workflows:', err);
      // Fallback to default empty array already set in state
    }
  };

  // Check system health status
  const checkSystemHealth = async () => {
    try {
      const response = await api.get(`${API_URL}/system/health`);
      if (response.ok) {
        const healthData = await response.json();
        setSystemStatus(healthData);
      } else {
        console.warn('Could not fetch system health:', response.statusText);
        // Generate mock system health data
        const mockSystemStatus = {
          status: ['online', 'warning', 'error'][Math.floor(Math.random() * 3)],
          services: {
            database: { 
              status: Math.random() > 0.1 ? 'online' : 'warning', 
              latency: Math.floor(Math.random() * 20) + 5 
            },
            api: { 
              status: Math.random() > 0.1 ? 'online' : 'warning', 
              latency: Math.floor(Math.random() * 30) + 10 
            },
            storage: { 
              status: Math.random() > 0.1 ? 'online' : 'warning', 
              latency: Math.floor(Math.random() * 15) + 5 
            },
            email: { 
              status: Math.random() > 0.1 ? 'online' : 'warning', 
              latency: Math.floor(Math.random() * 40) + 20 
            }
          },
          lastCheck: new Date()
        };
        setSystemStatus(mockSystemStatus);
      }
    } catch (err) {
      console.warn('Error checking system health:', err);
      setSystemStatus(prev => ({
        ...prev,
        status: 'error',
        lastCheck: new Date()
      }));
    }
  };

  // Init additional data on component mount
  useEffect(() => {
    fetchCalendarEvents();
    fetchActiveWorkflows();
    checkSystemHealth();

    // Auto-refresh system health every minute
    const healthCheckInterval = setInterval(() => {
      checkSystemHealth();
    }, 60000);

    return () => clearInterval(healthCheckInterval);
  }, []);

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
        projects: data.projects || [],
        tickets: data.tickets || [],
        tasks: data.tasks || [],
        alerts
      };

      setDashboardData(processedData);
      setIsLoading(false);

      // Also refresh additional data
      fetchCalendarEvents();
      fetchActiveWorkflows();
      checkSystemHealth();
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
      setIsLoading(false);
      
      // Show a more user-friendly error message
      let userFriendlyMessage = 'Hiba történt az adatok betöltése közben.';
      
      if (err.message.includes('401') || err.message.includes('403')) {
        userFriendlyMessage = 'Munkamenet lejárt vagy nincs jogosultsága. Kérjük jelentkezzen be újra.';
      } else if (err.message.includes('404')) {
        userFriendlyMessage = 'A kért erőforrás nem található.';
      } else if (err.message.includes('500')) {
        userFriendlyMessage = 'Szerver hiba történt. Kérjük próbálja később.';
      } else if (err.message.includes('timeout') || err.message.includes('NetworkError')) {
        userFriendlyMessage = 'Hálózati hiba történt. Kérjük ellenőrizze internetkapcsolatát.';
      }
      
      setError(userFriendlyMessage);
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

  // Format date for calendar
  const formatEventDate = (date) => {
    if (!date) return 'N/A';
    try {
      const eventDate = new Date(date);
      return eventDate.toLocaleDateString('hu-HU', {
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'Invalid date';
    }
  };

  // Get event icon based on type
  const getEventIcon = (type) => {
    switch (type) {
      case 'domain':
        return <Globe className="h-4 w-4" />;
      case 'maintenance':
        return <Settings className="h-4 w-4" />;
      case 'meeting':
        return <Users className="h-4 w-4" />;
      case 'invoice':
        return <CreditCard className="h-4 w-4" />;
      case 'project':
        return <FileText className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  // Get service status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      case 'loading':
      default:
        return 'text-gray-400';
    }
  };

  // Get service status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <X className="h-5 w-5 text-red-500" />;
      case 'loading':
      default:
        return <Loader className="h-5 w-5 text-gray-400 animate-spin" />;
    }
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

  // Színek a grafikonokhoz
  const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Fejléc */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Utolsó frissítés: {new Date().toLocaleTimeString('hu-HU')}
              </span>
              <button 
                onClick={fetchDashboardData}
                className="inline-flex items-center p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Fő tartalom */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Riasztások - ha vannak */}
        {dashboardData.alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
              Figyelmeztetések ({dashboardData.alerts.length})
            </h2>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {dashboardData.alerts.slice(0, 5).map(alert => (
                  <li key={alert.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 p-1 rounded-full ${
                        alert.severity === 'high' ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        {alert.type === 'domain' && <Globe className={`h-5 w-5 ${
                          alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                        }`} />}
                        {alert.type === 'invoice' && <CreditCard className={`h-5 w-5 ${
                          alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                        }`} />}
                        {alert.type === 'ticket' && <MessageSquare className={`h-5 w-5 ${
                          alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                        }`} />}
                        {alert.type === 'server' && <Server className={`h-5 w-5 ${
                          alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                        }`} />}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(alert.timestamp)}</p>
                      </div>
                      <div>
                        <button className="p-1 text-gray-400 hover:text-gray-500 rounded-full">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {dashboardData.alerts.length > 5 && (
                <div className="bg-gray-50 px-4 py-3 text-center">
                  <button className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    Összes figyelmeztetés megtekintése ({dashboardData.alerts.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Statisztikai kártyák */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Aktív projektek */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktív projektek</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{dashboardData.stats.activeProjects}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <FileText className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center text-sm text-gray-500">
                <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                {dashboardData.stats.completedProjects} befejezett projekt
              </span>
            </div>
          </div>
          
          {/* Bevételek */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bevételek</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{formatCurrency(dashboardData.stats.totalRevenue)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1 text-yellow-500" />
                {dashboardData.stats.pendingInvoices} függőben lévő számla
              </span>
            </div>
          </div>
          
          {/* Domain-ek */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Domain-ek</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{dashboardData.stats.domains.active}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center text-sm text-gray-500">
                <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" />
                {dashboardData.stats.domains.expiringSoon} domain lejár 30 napon belül
              </span>
            </div>
          </div>
          
          {/* Támogatási jegyek */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Támogatási jegyek</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{dashboardData.stats.openTickets}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center text-sm text-gray-500">
                <AlertCircle className="h-4 w-4 mr-1 text-red-500" />
                {dashboardData.stats.criticalTickets} sürgős válaszra vár
              </span>
            </div>
          </div>
        </div>
        
        {/* Rendszer állapot monitor */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Server className="h-5 w-5 mr-2 text-gray-500" />
              Rendszer Állapot
              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                systemStatus.status === 'online' ? 'bg-green-100 text-green-800' :
                systemStatus.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                systemStatus.status === 'error' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {systemStatus.status === 'online' ? 'Minden rendszer működik' :
                 systemStatus.status === 'warning' ? 'Részleges fennakadások' :
                 systemStatus.status === 'error' ? 'Szolgáltatás kiesés' :
                 'Ellenőrzés...'}
              </span>
              <span className="ml-auto text-xs text-gray-500">
                Utolsó ellenőrzés: {formatDate(systemStatus.lastCheck)}
              </span>
              <button 
                onClick={checkSystemHealth}
                className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                title="Frissítés"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Szolgáltatások állapota */}
              <div className="col-span-2 grid grid-cols-2 gap-4">
                {/* Adatbázis állapot */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Database className="h-5 w-5 text-indigo-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Adatbázis</span>
                    </div>
                    {getStatusIcon(systemStatus.services.database.status)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Válaszidő: {systemStatus.services.database.latency}ms
                  </div>
                </div>
                
                {/* API állapot */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Server className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">API Szerver</span>
                    </div>
                    {getStatusIcon(systemStatus.services.api.status)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Válaszidő: {systemStatus.services.api.latency}ms
                  </div>
                </div>
                
                {/* Tárhely állapot */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <HardDrive className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Tárhely</span>
                    </div>
                    {getStatusIcon(systemStatus.services.storage.status)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Válaszidő: {systemStatus.services.storage.latency}ms
                  </div>
                </div>
                
                {/* Email állapot */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-amber-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Email Szolgáltatás</span>
                    </div>
                    {getStatusIcon(systemStatus.services.email.status)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Válaszidő: {systemStatus.services.email.latency}ms
                  </div>
                </div>
              </div>
              
              {/* CPU Használat */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">CPU Használat</span>
                  <span className="text-sm font-semibold text-gray-900">{dashboardData.stats.serverStatus.cpu}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div 
                    className={`h-2.5 rounded-full ${
                      dashboardData.stats.serverStatus.cpu > 80 ? 'bg-red-500' : 
                      dashboardData.stats.serverStatus.cpu > 60 ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`} 
                    style={{ width: `${dashboardData.stats.serverStatus.cpu}%` }}
                  ></div>
                </div>
                
                {/* Memória Használat */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Memória Használat</span>
                  <span className="text-sm font-semibold text-gray-900">{dashboardData.stats.serverStatus.memory}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div 
                    className={`h-2.5 rounded-full ${
                      dashboardData.stats.serverStatus.memory > 80 ? 'bg-red-500' : 
                      dashboardData.stats.serverStatus.memory > 60 ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`} 
                    style={{ width: `${dashboardData.stats.serverStatus.memory}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Lemez Használat */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Lemez Használat</span>
                  <span className="text-sm font-semibold text-gray-900">{dashboardData.stats.serverStatus.disk}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div 
                    className={`h-2.5 rounded-full ${
                      dashboardData.stats.serverStatus.disk > 80 ? 'bg-red-500' : 
                      dashboardData.stats.serverStatus.disk > 60 ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`} 
                    style={{ width: `${dashboardData.stats.serverStatus.disk}%` }}
                  ></div>
                </div>
                
                {/* Uptime */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Üzemidő</span>
                  <span className="text-sm font-semibold text-gray-900">{dashboardData.stats.serverStatus.uptime} nap</span>
                </div>
                <div className="w-full flex items-center">
                  <HardDrive className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-xs text-gray-500">Utolsó újraindítás: {formatDate(new Date(Date.now() - dashboardData.stats.serverStatus.uptime * 24 * 60 * 60 * 1000))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Naptár és Aktív Munkafolyamatok */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Közelgő események */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-indigo-500" />
                Közelgő események
              </h3>
              <button className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Naptár
                <ChevronRight className="ml-1 h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {calendarEvents.length > 0 ? (
                calendarEvents
                  .filter(event => new Date(event.date) >= new Date())
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .slice(0, 5)
                  .map(event => (
                    <div key={event.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 bg-indigo-100 rounded-md p-2">
                          {getEventIcon(event.type)}
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900">{event.title}</p>
                          <p className="mt-1 text-xs text-gray-500">{formatEventDate(event.date)}</p>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <CalendarIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                  <p>Nincs közelgő esemény a következő 30 napban</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Aktív munkafolyamatok */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-green-500" />
                Aktív munkafolyamatok
              </h3>
              <button className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Összes folyamat
                <ChevronRight className="ml-1 h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              {activeWorkflows.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {activeWorkflows.map(workflow => (
                    <div key={workflow.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-gray-900">{workflow.name}</h4>
                        <span className="text-xs text-gray-500">Határidő: {formatDate(workflow.dueDate)}</span>
                      </div>
                      <div className="mb-3">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="h-2.5 rounded-full bg-green-500" style={{ width: `${workflow.progress}%` }}></div>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-gray-500">Haladás</span>
                          <span className="text-xs font-medium text-gray-700">{workflow.progress}%</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {workflow.tasks.map((task, index) => (
                          <div 
                            key={`${workflow.id}-task-${index}`}
                            className={`text-xs px-2 py-1 rounded-md ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {task.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <Activity className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                  <p>Jelenleg nincs aktív munkafolyamat</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Grafikonok és táblázatok */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bevétel/Kiadás grafikon */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Bevételek és kiadások</h3>
              <div className="flex items-center space-x-2">
                <BarChart2 className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={processedFinancialData.monthly}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar name="Bevétel" dataKey="revenue" fill="#4f46e5" />
                  <Bar name="Kiadás" dataKey="expenses" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Projekt státusz kördiagram */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Projektek státusz szerint</h3>
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedProjectStats.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {processedProjectStats.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Legfrissebb projektek */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Legújabb projektek</h3>
            <button className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Összes projekt
              <span className="ml-1">→</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projekt</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ügyfél</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Státusz</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Létrehozva</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Műveletek</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(dashboardData.projects || [])
                  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                  .slice(0, 5)
                  .map(project => (
                    <tr key={project._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{project.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{project.client?.name}</div>
                        <div className="text-xs text-gray-500">{project.client?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          project.status === 'aktív' ? 'bg-green-100 text-green-800' :
                          project.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
                          project.status === 'felfüggesztett' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(project.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-indigo-600 hover:text-indigo-900 mr-3">Megtekintés</button>
                        <button className="text-gray-600 hover:text-gray-900">Szerkesztés</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Legújabb támogatási jegyek */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Legújabb támogatási jegyek</h3>
            <button className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Összes jegy
              <span className="ml-1">→</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tárgy</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ügyfél</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioritás</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Státusz</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Létrehozva</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(dashboardData.tickets || [])
                  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                  .slice(0, 5)
                  .map(ticket => (
                    <tr key={ticket._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{ticket.subject}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{ticket.client?.name}</div>
                        <div className="text-xs text-gray-500">{ticket.client?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ticket.status === 'new' ? 'bg-blue-100 text-blue-800' :
                          ticket.status === 'open' ? 'bg-green-100 text-green-800' :
                          ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          ticket.status === 'resolved' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(ticket.createdAt)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;