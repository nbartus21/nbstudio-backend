import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/auth';
import { 
  MessageCircle, User, Calendar, Tag, AlertCircle, 
  Check, Clock, Paperclip, ArrowUp, Mail, Search,
  ChevronLeft, ChevronRight, Filter, X, Send, Download,
  Phone, MessageSquare, HelpCircle, Edit, Trash2, ExternalLink,
  Plus, RefreshCw
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
    }
  });
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    assignedTo: '',
    tag: ''
  });
  
  // Show filter panel
  const [showFilters, setShowFilters] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchTickets();
  }, [pagination.page, filters]);
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
      queryParams.append('page', pagination.page);
      queryParams.append('limit', pagination.limit);
      
      const response = await api.get(`/api/support/tickets?${queryParams.toString()}`);
      const data = await response.json();
      
      setTickets(data.tickets);
      setPagination(data.pagination);
      setLoading(false);
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
      tag: ''
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
        }
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

  // Attach files
  const fileInputRef = useRef(null);
  
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
  
  // Render pagination
  const renderPagination = () => {
    if (pagination.pages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg">
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

  // Filter panel megjelenítése
  const renderFilterPanel = () => {
    if (!showFilters) return null;
    
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Speciális szűrők</h3>
          <button 
            onClick={() => setShowFilters(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Státusz
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Összes státusz</option>
              <option value="new">Új</option>
              <option value="open">Nyitott</option>
              <option value="pending">Várakozó</option>
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
              className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
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
              name="tag"
              value={filters.tag}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Összes címke</option>
              <option value="bug">Hiba</option>
              <option value="feature">Új funkció</option>
              <option value="feedback">Visszajelzés</option>
              <option value="question">Kérdés</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Szűrők törlése
          </button>
        </div>
      </div>
    );
  };

  // Ticket részletek megjelenítése
  const renderTicketDetails = () => {
    if (!selectedTicket) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center p-6">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Nincs kiválasztott ticket</h3>
            <p className="text-gray-500">
              Válasszon egy ticketet a baloldali listából a megtekintéshez
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        {/* Ticket fejléc */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-medium text-gray-900">{selectedTicket.subject}</h2>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Clock className="h-4 w-4 mr-1.5" />
                <span className="mr-3">{formatDate(selectedTicket.createdAt)}</span>
                <User className="h-4 w-4 mr-1.5" />
                <span>{selectedTicket.client.name || selectedTicket.client.email}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={selectedTicket.status}
                onChange={(e) => updateTicket({ status: e.target.value })}
                className={`p-1.5 border rounded text-sm font-medium ${getStatusColor(selectedTicket.status)}`}
              >
                <option value="new">Új</option>
                <option value="open">Nyitott</option>
                <option value="pending">Várakozó</option>
                <option value="resolved">Megoldott</option>
                <option value="closed">Lezárt</option>
              </select>
              
              <select
                value={selectedTicket.priority}
                onChange={(e) => updateTicket({ priority: e.target.value })}
                className={`p-1.5 border rounded text-sm font-medium ${getPriorityColor(selectedTicket.priority)}`}
              >
                <option value="low">Alacsony</option>
                <option value="medium">Közepes</option>
                <option value="high">Magas</option>
                <option value="urgent">Sürgős</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Ticket tartalma és beszélgetés */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Eredeti üzenet */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full h-8 w-8 flex items-center justify-center mr-2">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium">{selectedTicket.client.name || selectedTicket.client.email}</span>
              </div>
              <span className="text-xs text-gray-500">{formatDate(selectedTicket.createdAt)}</span>
            </div>
            <div className="prose max-w-none text-gray-800">
              <div dangerouslySetInnerHTML={{ __html: selectedTicket.content.replace(/\n/g, '<br>') }} />
            </div>
            
            {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-blue-100">
                <p className="text-sm font-medium text-gray-700 mb-2">Csatolmányok:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTicket.attachments.map((attachment, index) => (
                    <div 
                      key={index} 
                      className="flex items-center bg-white rounded border border-gray-200 px-3 py-1.5"
                    >
                      <Paperclip className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm truncate max-w-xs">{attachment.filename}</span>
                      <a 
                        href={attachment.url || `data:${attachment.contentType};base64,${attachment.content}`}
                        download={attachment.filename}
                        className="ml-2 text-indigo-600 hover:text-indigo-800"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Válaszok és belső jegyzetek */}
          {selectedTicket.responses && selectedTicket.responses.length > 0 && (
            <div className="space-y-4 mb-6">
              {selectedTicket.responses.map((resp, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${
                    resp.isInternal 
                      ? 'bg-yellow-50 border-yellow-100' 
                      : resp.from === selectedTicket.client.email
                        ? 'bg-blue-50 border-blue-100'
                        : 'bg-green-50 border-green-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <div className={`rounded-full h-8 w-8 flex items-center justify-center mr-2 ${
                        resp.isInternal 
                          ? 'bg-yellow-100' 
                          : resp.from === selectedTicket.client.email
                            ? 'bg-blue-100'
                            : 'bg-green-100'
                      }`}>
<User className={`h-4 w-4 ${
                          resp.isInternal 
                            ? 'text-yellow-600' 
                            : resp.from === selectedTicket.client.email
                              ? 'text-blue-600'
                              : 'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <span className="font-medium">
                          {resp.from === selectedTicket.client.email 
                            ? (selectedTicket.client.name || resp.from)
                            : 'Support Team'}
                        </span>
                        {resp.isInternal && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 bg-yellow-200 text-yellow-800 rounded">
                            Belső jegyzet
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(resp.timestamp)}</span>
                  </div>
                  <div className="prose max-w-none text-gray-800">
                    <div dangerouslySetInnerHTML={{ __html: resp.content.replace(/\n/g, '<br>') }} />
                  </div>
                  
                  {resp.attachments && resp.attachments.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Csatolmányok:</p>
                      <div className="flex flex-wrap gap-2">
                        {resp.attachments.map((attachment, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center bg-white rounded border border-gray-200 px-3 py-1.5"
                          >
                            <Paperclip className="h-4 w-4 text-gray-500 mr-2" />
                            <span className="text-sm truncate max-w-xs">{attachment.filename}</span>
                            <a 
                              href={attachment.url || `data:${attachment.contentType};base64,${attachment.content}`}
                              download={attachment.filename}
                              className="ml-2 text-indigo-600 hover:text-indigo-800"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Válaszadó szekció */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center mb-3">
            <div className="flex items-center space-x-4 text-sm">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 mr-1.5"
                />
                <span className={isInternalNote ? "text-yellow-600 font-medium" : "text-gray-700"}>
                  Belső jegyzet
                </span>
              </label>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center text-gray-700 hover:text-indigo-600"
              >
                <Paperclip className="h-4 w-4 mr-1.5" />
                <span>Csatolmány</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />
            </div>
          </div>
          
          {/* Kiválasztott csatolmányok */}
          {selectedAttachments.length > 0 && (
            <div className="mb-3 p-3 bg-gray-100 rounded">
              <p className="text-sm font-medium text-gray-700 mb-2">Kiválasztott csatolmányok:</p>
              <div className="flex flex-wrap gap-2">
                {selectedAttachments.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center bg-white rounded border border-gray-200 px-3 py-1.5"
                  >
                    <Paperclip className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm truncate max-w-xs">{file.filename}</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="ml-2 text-gray-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="relative">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder={isInternalNote ? "Írja be a belső jegyzetet..." : "Írja be a válaszát..."}
              className={`w-full p-3 border ${
                isInternalNote ? 'border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
              } rounded-lg shadow-sm resize-none transition-colors`}
              rows={4}
            ></textarea>
            
            <button
              onClick={sendResponse}
              disabled={!response.trim()}
              className={`absolute bottom-3 right-3 p-2 rounded-full shadow ${
                response.trim() 
                  ? isInternalNote 
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Új ticket form megjelenítése
  const renderNewTicketForm = () => {
    if (!showNewTicketForm) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Új Support Ticket Létrehozása</h2>
            <button 
              onClick={() => setShowNewTicketForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tárgy
              </label>
              <input
                type="text"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ticket tárgya"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tartalom
              </label>
              <textarea
                value={newTicket.content}
                onChange={(e) => setNewTicket({ ...newTicket, content: e.target.value })}
                className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ticket részletes leírása"
                rows={6}
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioritás
              </label>
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="low">Alacsony</option>
                <option value="medium">Közepes</option>
                <option value="high">Magas</option>
                <option value="urgent">Sürgős</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ügyfél neve
                </label>
                <input
                  type="text"
                  value={newTicket.client.name}
                  onChange={(e) => setNewTicket({ 
                    ...newTicket, 
                    client: { ...newTicket.client, name: e.target.value }
                  })}
                  className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ügyfél neve"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ügyfél email
                </label>
                <input
                  type="email"
                  value={newTicket.client.email}
                  onChange={(e) => setNewTicket({ 
                    ...newTicket, 
                    client: { ...newTicket.client, email: e.target.value }
                  })}
                  className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Email cím"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ügyfél telefonszáma (opcionális)
                </label>
                <input
                  type="tel"
                  value={newTicket.client.phone}
                  onChange={(e) => setNewTicket({ 
                    ...newTicket, 
                    client: { ...newTicket.client, phone: e.target.value }
                  })}
                  className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Telefonszám"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewTicketForm(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Mégse
              </button>
              <button
                onClick={createTicket}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Ticket létrehozása
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Komponens fő visszatérési értéke
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Fő komponens title */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support Ticket kezelő</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 flex items-center text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Szűrők
          </button>
          <button
            onClick={() => fetchTickets()}
            className="px-4 py-2 flex items-center text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Frissítés
          </button>
          <button
            onClick={() => setShowNewTicketForm(true)}
            className="px-4 py-2 flex items-center text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Új Ticket
          </button>
        </div>
      </div>
      
      {/* Error és success üzenetek */}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center">
          <Check className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}
      
      {/* Filter panel */}
      {renderFilterPanel()}
      
      {/* Search box */}
      <div className="flex items-center mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Keresés tárgy, tartalom, email alapján..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>
      
      {/* Ticket kezelés kétsoros elrendezés */}
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        {/* Bal oldal - ticket lista */}
        <div className="w-full md:w-1/3">
          {renderTicketList()}
          {renderPagination()}
        </div>
        
        {/* Jobb oldal - ticket részletek */}
        <div className="w-full md:w-2/3 flex">
          {renderTicketDetails()}
        </div>
      </div>
      
      {/* Új ticket form modal */}
      {renderNewTicketForm()}
    </div>
  );
};

export default SupportTicketManager;