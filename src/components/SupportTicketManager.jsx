import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/auth';
import { 
  MessageCircle, User, Calendar, Tag, AlertCircle, 
  Check, Clock, Paperclip, ArrowUp, Mail, Search,
  ChevronLeft, ChevronRight, Filter, X, Send, Download,
  Phone, MessageSquare, HelpCircle, Edit, Trash2, ExternalLink,
  Plus, RefreshCw, Palette, Bell, Clock8, Eye
} from 'lucide-react';

// Formázó segédfüggvények
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Előre definiált színek a ticket címkékhez
const LABEL_COLORS = [
  { name: 'Piros', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', value: 'red' },
  { name: 'Narancs', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', value: 'orange' },
  { name: 'Sárga', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', value: 'yellow' },
  { name: 'Zöld', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', value: 'green' },
  { name: 'Türkiz', bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', value: 'teal' },
  { name: 'Kék', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', value: 'blue' },
  { name: 'Indigó', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', value: 'indigo' },
  { name: 'Lila', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', value: 'purple' },
  { name: 'Rózsaszín', bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', value: 'pink' },
  { name: 'Barna', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', value: 'amber' },
  { name: 'Szürke', bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', value: 'gray' }
];

const getStatusColor = (status) => {
  switch(status) {
    case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'open': return 'bg-green-100 text-green-800 border-green-200';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'resolved': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPriorityColor = (priority) => {
  switch(priority) {
    case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Visszaadja a megfelelő színkódokat egy adott ticket-címke színhez
const getLabelColorClasses = (colorValue) => {
  const colorObj = LABEL_COLORS.find(c => c.value === colorValue);
  if (!colorObj) return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
  return { bg: colorObj.bg, text: colorObj.text, border: colorObj.border };
};

const getSourceIcon = (source) => {
  switch(source) {
    case 'email': return <Mail className="h-4 w-4" />;
    case 'form': return <MessageCircle className="h-4 w-4" />;
    case 'phone': return <Phone className="h-4 w-4" />;
    case 'chat': return <MessageSquare className="h-4 w-4" />;
    default: return <HelpCircle className="h-4 w-4" />;
  }
};

// Main component
const SupportTicketManager = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  
  // Új ticket címke szín beállítása
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('');
  const [labelText, setLabelText] = useState('');
  
  // Automatikus frissítés beállítása
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // másodperc
  const autoRefreshIntervalRef = useRef(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());

  // Értesítések
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // New ticket form
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    content: '',
    priority: 'medium',
    client: {
      name: '',
      email: '',
      phone: ''
    },
    labels: []
  });
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    assignedTo: '',
    tag: '',
    label: ''
  });
  
  // Show filter panel
  const [showFilters, setShowFilters] = useState(false);

  // Refs
  const colorPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const notificationsRef = useRef(null);

  // Load initial data
  useEffect(() => {
    fetchTickets();
    
    // Inicializáljuk az értesítések számát
    fetchUnreadNotificationsCount();
    
    // Polling frissítés beállítása
    const intervalId = setInterval(() => {
      fetchUnreadNotificationsCount();
    }, 60000); // 1 perc
    
    return () => {
      clearInterval(intervalId);
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, []);

  // AutoRefresh watch
  useEffect(() => {
    if (autoRefresh) {
      // Az előző időzítő törlése, ha létezik
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      
      // Új időzítő beállítása
      autoRefreshIntervalRef.current = setInterval(() => {
        fetchTickets();
        setLastRefreshTime(new Date());
      }, refreshInterval * 1000);
      
      // Azonnal frissítünk, amikor bekapcsoljuk
      fetchTickets();
      setLastRefreshTime(new Date());
    } else {
      // Kikapcsoljuk az időzítőt
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    }
    
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);
  
  // Függés a pagination.page és filters változókra
  useEffect(() => {
    fetchTickets();
  }, [pagination.page, filters]);
  
  // Click outside handler for color picker
  useEffect(() => {
    function handleClickOutside(event) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
      
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [colorPickerRef, notificationsRef]);
  
  // Fetch unread notifications count
  const fetchUnreadNotificationsCount = async () => {
    try {
      const response = await api.get('/api/notifications');
      const data = await response.json();
      
      // Count unread notifications
      const unreadCount = Array.isArray(data) ? data.length : 0;
      setUnreadNotificationsCount(unreadCount);
    } catch (error) {
      console.error('Hiba az olvasatlan értesítések számának lekérésekor:', error);
    }
  };
  
  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications');
      const data = await response.json();
      
      setNotifications(Array.isArray(data) ? data : []);
      // Frissítjük az olvasatlan értesítések számát is
      setUnreadNotificationsCount(Array.isArray(data) ? data.length : 0);
    } catch (error) {
      console.error('Hiba az értesítések lekérésekor:', error);
    }
  };
  
  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      
      // Frissítjük az értesítéseket
      fetchNotifications();
      fetchUnreadNotificationsCount();
    } catch (error) {
      console.error('Hiba az értesítés olvasottnak jelölésekor:', error);
    }
  };
  
  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      
      // Frissítjük az értesítéseket
      fetchNotifications();
      fetchUnreadNotificationsCount();
    } catch (error) {
      console.error('Hiba az összes értesítés olvasottnak jelölésekor:', error);
    }
  };
  
  // Fetch tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      
      // Build query string
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.assignedTo) queryParams.append('assignedTo', filters.assignedTo);
      if (filters.tag) queryParams.append('tag', filters.tag);
      if (filters.label) queryParams.append('label', filters.label);
      queryParams.append('page', pagination.page);
      queryParams.append('limit', pagination.limit);
      
      const response = await api.get(`/api/support/tickets?${queryParams.toString()}`);
      const data = await response.json();
      
      setTickets(data.tickets);
      setPagination(data.pagination);
      setLoading(false);
      
      // Ha van selected ticket, frissítsük azt is
      if (selectedTicket) {
        const updatedSelectedTicket = data.tickets.find(t => t._id === selectedTicket._id);
        if (updatedSelectedTicket) {
          setSelectedTicket(updatedSelectedTicket);
        }
      }
    } catch (error) {
      console.error('Hiba a ticketek betöltésekor:', error);
      setError('Nem sikerült betölteni a ticketeket');
      setLoading(false);
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  // Fetch ticket details
  const fetchTicketDetails = async (id) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/support/tickets/${id}`);
      const data = await response.json();
      
      setSelectedTicket(data);
      setLoading(false);
    } catch (error) {
      console.error('Hiba a ticket részletek betöltésekor:', error);
      setError('Nem sikerült betölteni a ticket részleteit');
      setLoading(false);
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      search: '',
      assignedTo: '',
      tag: '',
      label: ''
    });
  };
  
  // Create new ticket
  const createTicket = async () => {
    try {
      if (!newTicket.subject || !newTicket.content || !newTicket.client.email) {
        setError('Tárgy, tartalom és email cím megadása kötelező!');
        return;
      }
      
      setLoading(true);
      const response = await api.post('/api/support/tickets', newTicket);
      const data = await response.json();
      
      setSuccessMessage('Ticket sikeresen létrehozva');
      setShowNewTicketForm(false);
      setNewTicket({
        subject: '',
        content: '',
        priority: 'medium',
        client: {
          name: '',
          email: '',
          phone: ''
        },
        labels: []
      });
      
      // Refresh tickets and select the new one
      await fetchTickets();
      fetchTicketDetails(data._id);
      
      setLoading(false);
    } catch (error) {
      console.error('Hiba a ticket létrehozásakor:', error);
      setError('Nem sikerült létrehozni a ticketet');
      setLoading(false);
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  // Handle file select
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const filePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            filename: file.name,
            contentType: file.type,
            size: file.size,
            content: e.target.result.split(',')[1] // Base64 content without mime type
          });
        };
        reader.readAsDataURL(file);
      });
    });
    
    Promise.all(filePromises).then(fileAttachments => {
      setSelectedAttachments([...selectedAttachments, ...fileAttachments]);
    });
  };
  
  const removeAttachment = (index) => {
    setSelectedAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  // Send response
  const sendResponse = async () => {
    if (!response.trim()) return;
    
    try {
      const responseData = {
        content: response,
        isInternal: isInternalNote,
        attachments: selectedAttachments
      };
      
      const apiResponse = await api.post(
        `/api/support/tickets/${selectedTicket._id}/responses`, 
        responseData
      );
      
      const updatedTicket = await apiResponse.json();
      
      setSelectedTicket(updatedTicket);
      setResponse('');
      setIsInternalNote(false);
      setSelectedAttachments([]);
      
      setSuccessMessage(isInternalNote ? 
        'Belső jegyzet sikeresen hozzáadva' : 
        'Válasz sikeresen elküldve');
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      // Refresh tickets list
      fetchTickets();
    } catch (error) {
      console.error('Hiba a válasz küldésekor:', error);
      setError('Nem sikerült elküldeni a választ');
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  // Update ticket
  const updateTicket = async (updatedData) => {
    try {
      const response = await api.put(
        `/api/support/tickets/${selectedTicket._id}`, 
        updatedData
      );
      
      const updatedTicket = await response.json();
      
      setSelectedTicket(updatedTicket);
      
      setSuccessMessage('Ticket sikeresen frissítve');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      // Refresh tickets list
      fetchTickets();
    } catch (error) {
      console.error('Hiba a ticket frissítésekor:', error);
      setError('Nem sikerült frissíteni a ticketet');
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };
  
  // Delete ticket
  const deleteTicket = async (id) => {
    if (!window.confirm('Biztosan törölni szeretné ezt a ticketet?')) return;
    
    try {
      setLoading(true);
      await api.delete(`/api/support/tickets/${id}`);
      
      setSuccessMessage('Ticket sikeresen törölve');
      setSelectedTicket(null);
      
      // Refresh tickets list
      fetchTickets();
      setLoading(false);
    } catch (error) {
      console.error('Hiba a ticket törlésekor:', error);
      setError('Nem sikerült törölni a ticketet');
      setLoading(false);
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };
  
  // Címke hozzáadása
  const addLabel = () => {
    if (!labelText.trim() || !selectedColor) return;
    
    const newLabel = {
      text: labelText.trim(),
      color: selectedColor
    };
    
    if (selectedTicket) {
      // Ha van kiválasztott ticket, ahhoz adjuk hozzá a címkét
      const updatedLabels = [...(selectedTicket.labels || []), newLabel];
      
      updateTicket({
        ...selectedTicket,
        labels: updatedLabels
      });
    } else {
      // Új ticket készítésekor a newTicket-hez adjuk
      setNewTicket(prev => ({
        ...prev,
        labels: [...(prev.labels || []), newLabel]
      }));
    }
    
    // Mezők ürítése
    setLabelText('');
    setSelectedColor('');
    setShowColorPicker(false);
  };
  
  // Címke törlése
  const removeLabel = (index) => {
    if (selectedTicket) {
      const updatedLabels = [...selectedTicket.labels];
      updatedLabels.splice(index, 1);
      
      updateTicket({
        ...selectedTicket,
        labels: updatedLabels
      });
    } else {
      setNewTicket(prev => {
        const updatedLabels = [...prev.labels];
        updatedLabels.splice(index, 1);
        return {
          ...prev,
          labels: updatedLabels
        };
      });
    }
  };
  
  // Toggle notifications panel
  const toggleNotificationsPanel = () => {
    if (!showNotifications) {
      // Ha megnyitjuk, lekérjük az értesítéseket
      fetchNotifications();
    }
    setShowNotifications(!showNotifications);
  };
  
  // Értesítés kezelése és a kapcsolódó ticket megnyitása
  const handleNotificationClick = async (notification) => {
    // Olvasottnak jelöljük
    await markNotificationAsRead(notification._id);
    
    // Ha van ticketId, megnyitjuk
    if (notification.ticketId) {
      fetchTicketDetails(notification.ticketId);
    }
    
    // Bezárjuk az értesítések panelt
    setShowNotifications(false);
  };
  
  // Rendering helpers
  const renderTicketList = () => {
    if (loading && tickets.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      );
    }
    
    if (tickets.length === 0) {
      return (
        <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
          <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">Nincsenek ticketek</h3>
          <p className="text-gray-500 mt-1">Nincs megjeleníthető support ticket a kiválasztott szűrők alapján.</p>
          {Object.values(filters).some(f => f) && (
            <button
              onClick={resetFilters}
              className="mt-4 px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Szűrők törlése
            </button>
          )}
        </div>
      );
    }
    
    return (
      <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">
        {tickets.map(ticket => (
          <div 
            key={ticket._id} 
            className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
              selectedTicket && selectedTicket._id === ticket._id ? 'bg-indigo-50' : ''
            }`}
            onClick={() => fetchTicketDetails(ticket._id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`rounded-full p-2 ${
                  ticket.isRead ? 'bg-gray-100' : 'bg-blue-100'
                }`}>
                  {getSourceIcon(ticket.source)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 flex items-center">
                    {!ticket.isRead && (
                      <span className="h-2 w-2 bg-blue-500 rounded-full mr-2" />
                    )}
                    {ticket.subject}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <User className="h-3.5 w-3.5 mr-1.5" />
                    <span className="mr-3">{ticket.client.name || ticket.client.email}</span>
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    <span>{formatDate(ticket.createdAt)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    {ticket.responses && ticket.responses.length > 0 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                        {ticket.responses.length} válasz
                      </span>
                    )}
                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 border border-gray-200 flex items-center">
                        <Paperclip className="h-3 w-3 mr-1" />
                        {ticket.attachments.length}
                      </span>
                    )}
                    
                    {/* Színes címkék megjelenítése */}
                    {ticket.labels && ticket.labels.map((label, idx) => {
                      const { bg, text, border } = getLabelColorClasses(label.color);
                      return (
                        <span key={idx} className={`px-2 py-0.5 text-xs rounded-full border ${bg} ${text} ${border}`}>
                          {label.text}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTicket(ticket._id);
                  }}
                  className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-gray-100"
                  title="Ticket törlése"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderPagination = () => {
    if (tickets.length === 0 || pagination.pages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Előző
          </button>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Következő
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">{pagination.total}</span> találat összesen, 
              <span className="font-medium"> {pagination.page}</span> / <span className="font-medium">{pagination.pages}</span> oldal
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Előző</span>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: pagination.pages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    pagination.page === i + 1
                      ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Következő</span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };
  
  const renderTicketDetails = () => {
    if (!selectedTicket) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-200 p-8">
          <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">Nincs kiválasztott ticket</h3>
          <p className="text-gray-500 mt-1 text-center">Válasszon ki egy ticketet a bal oldali listából vagy hozzon létre egy újat.</p>
        </div>
      );
    }
    
    return (
      <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Ticket header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedTicket.subject}</h2>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <User className="h-4 w-4 mr-1.5" />
                <span className="mr-3">{selectedTicket.client.name || selectedTicket.client.email}</span>
                <Calendar className="h-4 w-4 mr-1.5" />
                <span>{formatDate(selectedTicket.createdAt)}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setSelectedTicket(null);
                }}
                className="px-2 py-1 text-gray-500 hover:text-gray-700 bg-white border border-gray-300 rounded"
              >
                Bezárás
              </button>
            </div>
          </div>
          
          {/* Tags and labels */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(selectedTicket.status)}`}>
              {selectedTicket.status}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(selectedTicket.priority)}`}>
              {selectedTicket.priority}
            </span>
            
            {/* Színes címkék */}
            {selectedTicket.labels && selectedTicket.labels.map((label, idx) => {
              const { bg, text, border } = getLabelColorClasses(label.color);
              return (
                <div key={idx} className="flex items-center">
                  <span className={`px-2 py-1 text-xs rounded-l-full border-y border-l ${bg} ${text} ${border}`}>
                    {label.text}
                  </span>
                  <button
                    onClick={() => removeLabel(idx)}
                    className={`p-1 rounded-r-full border-y border-r ${bg} ${text} ${border} hover:bg-opacity-80`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
            
            {/* Címke hozzáadás gomb */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center px-2 py-1 text-xs rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                <Palette className="h-3 w-3 mr-1" />
                Címke hozzáadása
              </button>
              
              {/* Színválasztó panel */}
              {showColorPicker && (
                <div 
                  ref={colorPickerRef}
                  className="absolute right-0 mt-2 z-10 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
                >
                  <h4 className="font-medium text-gray-700 mb-2">Új címke hozzáadása</h4>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Címke szövege
                    </label>
                    <input
                      type="text"
                      value={labelText}
                      onChange={(e) => setLabelText(e.target.value)}
                      placeholder="Címke neve"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Címke színe
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {LABEL_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setSelectedColor(color.value)}
                          className={`h-8 w-full ${color.bg} ${color.border} border rounded-md flex items-center justify-center ${
                            selectedColor === color.value ? 'ring-2 ring-offset-2 ring-indigo-500' : ''
                          }`}
                          title={color.name}
                        >
                          {selectedColor === color.value && (
                            <Check className="h-4 w-4 text-gray-800" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => setShowColorPicker(false)}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md mr-2 hover:bg-gray-50"
                    >
                      Mégse
                    </button>
                    <button
                      onClick={addLabel}
                      disabled={!labelText.trim() || !selectedColor}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Hozzáadás
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Ticket content */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: selectedTicket.content }} />
          </div>
          
          {/* Csatolmányok megjelenítése */}
          {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Csatolmányok</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTicket.attachments.map((attachment, idx) => (
                  <a
                    key={idx}
                    href={attachment.url || `data:${attachment.contentType};base64,${attachment.content}`}
                    download={attachment.filename}
                    className="flex items-center px-3 py-2 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200"
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    <span>{attachment.filename}</span>
                    <Download className="h-4 w-4 ml-2 text-gray-500" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Ticket válaszok */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedTicket.responses && selectedTicket.responses.map((response, idx) => (
            <div 
              key={idx} 
              className={`p-4 rounded-lg ${
                response.isInternal 
                  ? 'bg-yellow-50 border border-yellow-200' 
                  : response.isFromClient 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-green-50 border border-green-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-2 ${
                    response.isInternal 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : response.isFromClient 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                  }`}>
                    {response.isInternal ? (
                      <Eye className="h-4 w-4" />
                    ) : response.isFromClient ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">
                      {response.isInternal ? 'Belső jegyzet' : response.isFromClient ? 'Ügyfél' : 'Támogatás'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(response.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {response.author || 'Admin'}
                </div>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: response.content }} />
              </div>
              
              {/* Válasz csatolmányok */}
              {response.attachments && response.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {response.attachments.map((attachment, idx) => (
                      <a
                        key={idx}
                        href={attachment.url || `data:${attachment.contentType};base64,${attachment.content}`}
                        download={attachment.filename}
                        className="flex items-center px-2 py-1 bg-white border border-gray-200 text-gray-700 rounded text-sm hover:bg-gray-50"
                      >
                        <Paperclip className="h-3 w-3 mr-1.5" />
                        <span>{attachment.filename}</span>
                        <Download className="h-3 w-3 ml-1.5 text-gray-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Állapot gyors váltás panel */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Gyors műveletek</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Állapot módosítása
              </label>
              <select
                value={selectedTicket ? selectedTicket.status : ''}
                onChange={(e) => {
                  if (selectedTicket) {
                    updateTicket({
                      ...selectedTicket,
                      status: e.target.value
                    });
                  }
                }}
                className="w-full py-1.5 px-2 border border-gray-300 bg-white rounded-md text-sm"
              >
                <option value="new">Új</option>
                <option value="open">Nyitott</option>
                <option value="pending">Függőben</option>
                <option value="resolved">Megoldott</option>
                <option value="closed">Lezárt</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Prioritás módosítása
              </label>
              <select
                value={selectedTicket ? selectedTicket.priority : ''}
                onChange={(e) => {
                  if (selectedTicket) {
                    updateTicket({
                      ...selectedTicket,
                      priority: e.target.value
                    });
                  }
                }}
                className="w-full py-1.5 px-2 border border-gray-300 bg-white rounded-md text-sm"
              >
                <option value="low">Alacsony</option>
                <option value="medium">Közepes</option>
                <option value="high">Magas</option>
                <option value="urgent">Sürgős</option>
              </select>
            </div>
          </div>
          
          {/* Gyakori válaszok/sablonok */}
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Válasz sablon beszúrása
            </label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  setResponse(prev => prev + e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full py-1.5 px-2 border border-gray-300 bg-white rounded-md text-sm"
            >
              <option value="">Válasszon sablont...</option>
              <option value="Köszönjük megkeresését! Kérjük, legyen türelemmel, amíg kollégánk megvizsgálja a problémát.">Általános fogadó üzenet</option>
              <option value="A problémát sikeresen megoldottuk. Kérjük, jelezze vissza, ha minden rendben működik.">Megoldás jelzése</option>
              <option value="További információra van szükségünk a probléma kivizsgálásához. Kérjük, küldje el nekünk a következőket:\n\n1. Pontos hibaüzenet\n2. A probléma előfordulásának időpontja\n3. Képernyőkép a hibáról (ha lehetséges)">További információ kérése</option>
              <option value="Sajnáljuk a kellemetlenséget. Fejlesztőcsapatunk dolgozik a probléma megoldásán. A javítás várható időpontja: ">Hibajelzés válasz</option>
              <option value="Ticket lezárása: Mivel az elmúlt 3 napban nem érkezett válasz, ezt a ticketet most lezárjuk. Ha továbbra is fennáll a probléma, kérjük, nyisson új ticketet vagy válaszoljon erre az üzenetre.">Inaktív ticket lezárás</option>
            </select>
          </div>
          
          {/* Egyéb gyors műveletek */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => {
                if (selectedTicket) {
                  updateTicket({
                    ...selectedTicket,
                    isRead: true
                  });
                }
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
            >
              Olvasottnak jelölés
            </button>
            
            <button
              onClick={() => {
                if (selectedTicket) {
                  updateTicket({
                    ...selectedTicket,
                    isEscalated: !selectedTicket.isEscalated
                  });
                }
              }}
              className={`px-3 py-1.5 text-sm rounded-md ${
                selectedTicket && selectedTicket.isEscalated
                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {selectedTicket && selectedTicket.isEscalated ? 'Eszkaláció visszavonása' : 'Eszkaláció kérése'}
            </button>
            
            <button
              onClick={() => {
                if (selectedTicket) {
                  const newEmail = window.prompt('Kérjük, adja meg a feladó emailcímét:', selectedTicket.client.email);
                  if (newEmail) {
                    window.open(`mailto:${newEmail}?subject=RE: ${selectedTicket.subject}&body=Hivatkozási szám: ${selectedTicket._id}`);
                  }
                }
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
            >
              Email küldése
            </button>
            
            <button
              onClick={() => {
                if (!window.confirm('Biztosan törölni szeretné ezt a ticketet?')) return;
                if (selectedTicket) {
                  deleteTicket(selectedTicket._id);
                }
              }}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200"
            >
              Ticket törlése
            </button>
          </div>
        </div>
        
        {/* Válasz szerkesztő */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center mb-2 space-x-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={isInternalNote}
                onChange={() => setIsInternalNote(!isInternalNote)}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Belső jegyzet (csak a támogatás látja)</span>
            </label>
          </div>
          
          <div className="mb-3">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder={isInternalNote ? "Belső jegyzet hozzáadása..." : "Válasz írása..."}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">HTML támogatott: &lt;p&gt;, &lt;b&gt;, &lt;i&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, stb.</p>
          </div>
          
          {/* Csatolmányok listája */}
          {selectedAttachments.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Választott fájlok</h3>
              <div className="flex flex-wrap gap-2">
                {selectedAttachments.map((file, idx) => (
                  <div key={idx} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm">
                    <Paperclip className="h-4 w-4 mr-1.5" />
                    <span>{file.filename}</span>
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="ml-1.5 text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-between">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 flex items-center hover:bg-gray-50"
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Fájl csatolása
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
              multiple
            />
            
            <button
              onClick={sendResponse}
              disabled={!response.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Send className="h-4 w-4 mr-2" />
              {isInternalNote ? 'Jegyzet hozzáadása' : 'Válasz küldése'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Új ticket form
  const renderNewTicketForm = () => {
    if (!showNewTicketForm) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Új Ticket Létrehozása</h2>
              <button
                onClick={() => setShowNewTicketForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Ügyfél adatok */}
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-2">Ügyfél adatok</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Név</label>
                    <input
                      type="text"
                      value={newTicket.client.name}
                      onChange={(e) => setNewTicket(prev => ({
                        ...prev,
                        client: {
                          ...prev.client,
                          name: e.target.value
                        }
                      }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                    <input
                      type="email"
                      value={newTicket.client.email}
                      onChange={(e) => setNewTicket(prev => ({
                        ...prev,
                        client: {
                          ...prev.client,
                          email: e.target.value
                        }
                      }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefon</label>
                    <input
                      type="tel"
                      value={newTicket.client.phone}
                      onChange={(e) => setNewTicket(prev => ({
                        ...prev,
                        client: {
                          ...prev.client,
                          phone: e.target.value
                        }
                      }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              {/* Ticket adatok */}
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-2">Ticket adatok</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tárgy *</label>
                    <input
                      type="text"
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket(prev => ({
                        ...prev,
                        subject: e.target.value
                      }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tartalom *</label>
                    <textarea
                      value={newTicket.content}
                      onChange={(e) => setNewTicket(prev => ({
                        ...prev,
                        content: e.target.value
                      }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={5}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">HTML támogatott: &lt;p&gt;, &lt;b&gt;, &lt;i&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, stb.</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prioritás</label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket(prev => ({
                        ...prev,
                        priority: e.target.value
                      }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="low">Alacsony</option>
                      <option value="medium">Közepes</option>
                      <option value="high">Magas</option>
                      <option value="urgent">Sürgős</option>
                    </select>
                  </div>
                  
                  {/* Címkék */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Címkék</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {newTicket.labels && newTicket.labels.map((label, idx) => {
                        const { bg, text, border } = getLabelColorClasses(label.color);
                        return (
                          <div key={idx} className="flex items-center">
                            <span className={`px-2 py-1 text-xs rounded-l-full border-y border-l ${bg} ${text} ${border}`}>
                              {label.text}
                            </span>
                            <button
                              onClick={() => removeLabel(idx)}
                              className={`p-1 rounded-r-full border-y border-r ${bg} ${text} ${border} hover:bg-opacity-80`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="relative">
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Palette className="h-4 w-4 mr-2" />
                        Címke hozzáadása
                      </button>
                      
                      {showColorPicker && (
                        <div 
                          ref={colorPickerRef}
                          className="absolute left-0 mt-2 z-10 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
                        >
                          <h4 className="font-medium text-gray-700 mb-2">Új címke hozzáadása</h4>
                          
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Címke szövege
                            </label>
                            <input
                              type="text"
                              value={labelText}
                              onChange={(e) => setLabelText(e.target.value)}
                              placeholder="Címke neve"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Címke színe
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                              {LABEL_COLORS.map((color) => (
                                <button
                                  key={color.value}
                                  onClick={() => setSelectedColor(color.value)}
                                  className={`h-8 w-full ${color.bg} ${color.border} border rounded-md flex items-center justify-center ${
                                    selectedColor === color.value ? 'ring-2 ring-offset-2 ring-indigo-500' : ''
                                  }`}
                                  title={color.name}
                                >
                                  {selectedColor === color.value && (
                                    <Check className="h-4 w-4 text-gray-800" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex justify-end mt-3">
                            <button
                              onClick={() => setShowColorPicker(false)}
                              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md mr-2 hover:bg-gray-50"
                            >
                              Mégse
                            </button>
                            <button
                              onClick={addLabel}
                              disabled={!labelText.trim() || !selectedColor}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Hozzáadás
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowNewTicketForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md mr-3 hover:bg-gray-50"
              >
                Mégse
              </button>
              <button
                onClick={createTicket}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Ticket létrehozása
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render notifications panel
  const renderNotificationsPanel = () => {
    if (!showNotifications) return null;
    
    return (
      <div 
        ref={notificationsRef}
        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-20"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-800">Értesítések</h3>
          <button
            onClick={markAllNotificationsAsRead}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Összes olvasottnak jelölése
          </button>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nincsenek értesítések
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map(notification => (
                <div 
                  key={notification._id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start">
                    <div className={`rounded-full p-2 ${
                      notification.severity === 'error' ? 'bg-red-100 text-red-700' :
                      notification.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    } mr-3`}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(notification.createdAt)}
                      </p>
                      <p className="text-sm text-gray-700 mt-1 break-words">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render auto-refresh controls
  const renderAutoRefreshControls = () => {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={() => setAutoRefresh(!autoRefresh)}
            className="mr-1.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Auto frissítés
        </label>
        
        {autoRefresh && (
          <>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="py-1 px-2 border border-gray-300 rounded text-sm"
            >
              <option value="10">10 mp</option>
              <option value="30">30 mp</option>
              <option value="60">1 perc</option>
              <option value="300">5 perc</option>
            </select>
            
            <span>
              <Clock8 className="h-3.5 w-3.5 inline mr-1" />
              {lastRefreshTime && (
                <span>
                  Utolsó frissítés: {formatDate(lastRefreshTime)}
                </span>
              )}
            </span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-full bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Support Ticket Kezelő</h1>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <button
                  onClick={toggleNotificationsPanel}
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-0 right-0 h-4 w-4 text-xs flex items-center justify-center rounded-full bg-red-500 text-white">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
                {renderNotificationsPanel()}
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Szűrők
                {Object.values(filters).some(f => f) && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {Object.values(filters).filter(Boolean).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowNewTicketForm(true)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Új Ticket
              </button>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keresés
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="search"
                      value={filters.search}
                      onChange={handleFilterChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Keresés..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Állapot
                  </label>
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm"
                  >
                    <option value="">Összes állapot</option>
                    <option value="new">Új</option>
                    <option value="open">Nyitott</option>
                    <option value="pending">Függőben</option>
                    <option value="resolved">Megoldott</option>
                    <option value="closed">Lezárt</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioritás
                  </label>
                  <select
                    name="priority"
                    value={filters.priority}
                    onChange={handleFilterChange}
                    className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm"
                  >
                    <option value="">Összes prioritás</option>
                    <option value="low">Alacsony</option>
                    <option value="medium">Közepes</option>
                    <option value="high">Magas</option>
                    <option value="urgent">Sürgős</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Címke
                  </label>
                  <select
                    name="label"
                    value={filters.label}
                    onChange={handleFilterChange}
                    className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm"
                  >
                    <option value="">Összes címke</option>
                    {LABEL_COLORS.map(color => (
                      <option key={color.value} value={color.value}>{color.name} címkék</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-indigo-700"
                >
                  Szűrők törlése
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="ml-3 px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                >
                  Alkalmaz
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        
        {/* Success message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center">
            <Check className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Ticket List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Ticketek</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchTickets}
                  className="flex items-center text-gray-600 hover:text-gray-800"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  <span className="text-sm">Frissítés</span>
                </button>
              </div>
            </div>
            
            {/* Auto refresh controls */}
            <div className="mb-4">
              {renderAutoRefreshControls()}
            </div>
            
            {renderTicketList()}
            {renderPagination()}
          </div>
          
          {/* Right Panel - Ticket Details */}
          <div className="lg:col-span-3">
            {renderTicketDetails()}
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {renderNewTicketForm()}
    </div>
  );
};

export default SupportTicketManager;