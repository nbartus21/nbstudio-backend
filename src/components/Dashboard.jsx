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
  LineChart as LineChartIcon, Activity, AlertTriangle, Layout, GripVertical, X
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
  const [layout, setLayout] = useState(() => {
    // Load saved layout from localStorage or use default
    const savedLayout = localStorage.getItem('dashboardLayout');
    return savedLayout ? JSON.parse(savedLayout) : {
      widgets: [
        { id: 'quickStats', type: 'quickStats', position: 0, visible: true },
        { id: 'financialOverview', type: 'financialOverview', position: 1, visible: true },
        { id: 'projectStatus', type: 'projectStatus', position: 2, visible: true },
        { id: 'alerts', type: 'alerts', position: 3, visible: true },
        { id: 'recentActivity', type: 'recentActivity', position: 4, visible: true },
        { id: 'quickActions', type: 'quickActions', position: 5, visible: true }
      ],
      columns: 3,
      theme: 'light'
    };
  });
  const [isEditing, setIsEditing] = useState(false);
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

  // Save layout to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('dashboardLayout', JSON.stringify(layout));
  }, [layout]);

  // Handle widget visibility toggle
  const handleWidgetVisibilityToggle = (widgetId) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget =>
        widget.id === widgetId
          ? { ...widget, visible: !widget.visible }
          : widget
      )
    }));
  };

  // Handle widget position change
  const handleWidgetPositionChange = (widgetId, newPosition) => {
    setLayout(prev => {
      const widgets = [...prev.widgets];
      const widgetIndex = widgets.findIndex(w => w.id === widgetId);
      const widget = widgets[widgetIndex];
      widgets.splice(widgetIndex, 1);
      widgets.splice(newPosition, 0, widget);
      return { ...prev, widgets };
    });
  };

  // Handle column count change
  const handleColumnCountChange = (count) => {
    setLayout(prev => ({ ...prev, columns: count }));
  };

  // Handle theme change
  const handleThemeChange = (theme) => {
    setLayout(prev => ({ ...prev, theme }));
  };

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
        recentActivity: []
      };
      
      // Fetch all data in parallel for better performance
      const [
        projectsResponse,
        ticketsResponse,
        domainsResponse,
        financialResponse,
        tasksResponse
      ] = await Promise.allSettled([
        api.get(`${API_URL}/projects`),
        api.get(`${API_URL}/support/tickets`),
        api.get(`${API_URL}/domains`),
        api.get(`${API_URL}/accounting/transactions`),
        api.get(`${API_URL}/tasks`)
      ]);

      // Process projects data
      if (projectsResponse.status === 'fulfilled' && projectsResponse.value.ok) {
        data.projects = await projectsResponse.value.json();
      } else {
        throw new Error('Projektek betöltése sikertelen');
      }

      // Process tickets data
      if (ticketsResponse.status === 'fulfilled' && ticketsResponse.value.ok) {
        const ticketsData = await ticketsResponse.value.json();
        data.tickets = ticketsData.tickets || ticketsData || [];
      }

      // Process domains data
      if (domainsResponse.status === 'fulfilled' && domainsResponse.value.ok) {
        data.domains = await domainsResponse.value.json();
      }

      // Process financial data
      if (financialResponse.status === 'fulfilled' && financialResponse.value.ok) {
        data.financialData = await financialResponse.value.json();
      }

      // Process tasks data
      if (tasksResponse.status === 'fulfilled' && tasksResponse.value.ok) {
        data.tasks = await tasksResponse.value.json();
      }

      // Process data for the dashboard
      const now = new Date();
      const thirtyDaysFromNow = new Date(now);
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      
      // Process projects data with real status values
      const activeProjects = data.projects.filter(project => project.status === 'aktív').length;
      
      // Process tickets data with real status values
      const tickets = data.tasks || data.tickets; // Use tasks if available, fallback to tickets
      const newTickets = tickets.filter(ticket => ticket.status === 'new').length;
      const openTickets = tickets.filter(ticket => ticket.status === 'open').length;
      const pendingTickets = tickets.filter(ticket => ticket.status === 'pending').length;
      
      // Process tasks data
      const activeTasks = data.tasks?.filter(task => task.status === 'aktív').length || 0;
      
      // Process domains data with real status values
      const activeDomainsCount = data.domains.filter(domain => domain.status === 'active').length;
      const expiringSoonDomainsCount = data.domains.filter(domain => {
        if (!domain.expiryDate) return false;
        const expiryDate = new Date(domain.expiryDate);
        return domain.status === 'active' && expiryDate <= thirtyDaysFromNow;
      }).length;
      
      // Get real server status data
      const serverStatusResponse = await api.get(`${API_URL}/system/status`);
      const serverStatus = serverStatusResponse.ok ? 
        await serverStatusResponse.json() : 
        {
          cpu: 0,
          memory: 0,
          disk: 0,
          uptime: 0
        };
      
      // Get real user statistics
      const userStatsResponse = await api.get(`${API_URL}/users/stats`);
      const userStats = userStatsResponse.ok ? 
        await userStatsResponse.json() : 
        {
          total: 0,
          active: 0,
          newThisMonth: 0
        };
      
      // Process financial data with real values
      const paidInvoices = data.financialData.filter(
        transaction => transaction.type === 'income' && transaction.paymentStatus === 'paid'
      );
      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      
      const pendingInvoices = data.financialData.filter(
        transaction => transaction.type === 'income' && transaction.paymentStatus === 'pending'
      ).length;
      
      // Prepare monthly financial data with real data
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
      
      // Prepare invoice status data with real values
      const paidCount = data.financialData.filter(t => t.type === 'income' && t.paymentStatus === 'paid').length;
      const pendingCount = data.financialData.filter(t => t.type === 'income' && t.paymentStatus === 'pending').length;
      const overdueCount = data.financialData.filter(t => t.type === 'income' && t.paymentStatus === 'overdue').length;
      
      const invoiceStatusData = [
        { name: 'Fizetve', value: paidCount },
        { name: 'Függőben', value: pendingCount },
        { name: 'Lejárt', value: overdueCount }
      ];
      
      // Get real quarterly growth data
      const quarterlyGrowthResponse = await api.get(`${API_URL}/accounting/quarterly-growth`);
      const quarterlyGrowth = quarterlyGrowthResponse.ok ? 
        await quarterlyGrowthResponse.json() : 
        [
          { quarter: 'Q1', revenue: 0, growth: 0 },
          { quarter: 'Q2', revenue: 0, growth: 0 },
          { quarter: 'Q3', revenue: 0, growth: 0 },
          { quarter: 'Q4', revenue: 0, growth: 0 }
        ];
      
      // Process project statistics with real data
      const projectStatusCounts = {
        active: data.projects.filter(p => p.status === 'aktív').length,
        completed: data.projects.filter(p => p.status === 'befejezett').length,
        suspended: data.projects.filter(p => p.status === 'felfüggesztett').length,
        planning: data.projects.filter(p => p.status === 'tervezés').length
      };
      
      const projectStatusDistribution = [
        { name: 'Aktív', value: projectStatusCounts.active },
        { name: 'Befejezett', value: projectStatusCounts.completed },
        { name: 'Felfüggesztett', value: projectStatusCounts.suspended },
        { name: 'Tervezés', value: projectStatusCounts.planning }
      ];
      
      // Get real project type distribution
      const projectTypeResponse = await api.get(`${API_URL}/projects/types`);
      const projectTypeDistribution = projectTypeResponse.ok ? 
        await projectTypeResponse.json() : 
        [
          { name: 'Webfejlesztés', value: 0 },
          { name: 'Mobilalkalmazás', value: 0 },
          { name: 'UI/UX Design', value: 0 },
          { name: 'Tanácsadás', value: 0 }
        ];
      
      // Get real monthly project completion data
      const monthlyCompletionResponse = await api.get(`${API_URL}/projects/completion`);
      const monthlyProjectCompletion = monthlyCompletionResponse.ok ? 
        await monthlyCompletionResponse.json() : 
        getLastMonths(6).map(month => ({
          month: month.name,
          completed: 0
        }));
      
      // Prepare recent activity with real data
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
      
      // Prepare alerts with real data
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

  // Render widget based on type
  const renderWidget = (widget) => {
    if (!widget.visible) return null;

    switch (widget.type) {
      case 'quickStats':
        return (
          <div key={widget.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Gyors Statisztikák</h2>
              {isEditing && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleWidgetVisibilityToggle(widget.id)}
                    className="p-1 text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 text-gray-400 hover:text-gray-500 cursor-move"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('widgetId', widget.id);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const newPosition = parseInt(e.dataTransfer.getData('newPosition'));
                      handleWidgetPositionChange(widget.id, newPosition);
                    }}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            </div>
          </div>
        );

      case 'financialOverview':
        return (
          <div key={widget.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Pénzügyi Áttekintés</h2>
              {isEditing && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleWidgetVisibilityToggle(widget.id)}
                    className="p-1 text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 text-gray-400 hover:text-gray-500 cursor-move"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('widgetId', widget.id);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const newPosition = parseInt(e.dataTransfer.getData('newPosition'));
                      handleWidgetPositionChange(widget.id, newPosition);
                    }}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                </div>
              )}
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
        );

      // Add similar cases for other widget types...

      default:
        return null;
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

  return (
    <div className={`min-h-screen ${layout.theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
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
              </select>

              {/* Layout customization controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`p-2 rounded-lg ${
                    isEditing
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Layout className="h-5 w-5" />
                </button>

                {isEditing && (
                  <>
                    <select
                      value={layout.columns}
                      onChange={(e) => handleColumnCountChange(Number(e.target.value))}
                      className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="1">1 oszlop</option>
                      <option value="2">2 oszlop</option>
                      <option value="3">3 oszlop</option>
                      <option value="4">4 oszlop</option>
                    </select>

                    <select
                      value={layout.theme}
                      onChange={(e) => handleThemeChange(e.target.value)}
                      className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="light">Világos</option>
                      <option value="dark">Sötét</option>
                    </select>
                  </>
                )}

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
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Render widgets based on layout */}
        <div className={`grid grid-cols-1 md:grid-cols-${layout.columns} gap-6`}>
          {layout.widgets
            .sort((a, b) => a.position - b.position)
            .map(widget => renderWidget(widget))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;