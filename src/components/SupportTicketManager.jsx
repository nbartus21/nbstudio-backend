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
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg">
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
  // Render ticket details
  const renderTicketDetails = () => {
    if (!selectedTicket) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 h-full flex flex-col items-center justify-center text-center">
          <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">Nincs kiválasztott ticket</h3>
          <p className="text-gray-500 mt-1">Válasszon ki egy ticketet a bal oldali listából</p>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col overflow-hidden">
        {/* Ticket header */}
        <div className="px-6 py-4 border-b border-gray-200">
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
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 text-xs rounded-full border ${getStatusColor(selectedTicket.status)}`}>
                {selectedTicket.status}
              </span>
              <span className={`px-2.5 py-1 text-xs rounded-full border ${getPriorityColor(selectedTicket.priority)}`}>
                {selectedTicket.priority}
              </span>
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  onClick={() => updateTicket({ status: 'closed' })}
                  className="relative inline-flex items-center rounded-l-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Lezár
                </button>
                <button
                  onClick={() => setShowTicketForm(true)}
                  className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ticket content */}
        <div className="flex-grow overflow-y-auto p-6">
          {/* Original message */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <p className="whitespace-pre-line text-gray-700">{selectedTicket.content}</p>
            
            {/* Attachments */}
            {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Csatolmányok:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTicket.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center bg-white p-2 rounded border border-gray-200">
                      <Paperclip className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-600 mr-2">{attachment.filename}</span>
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => downloadAttachment(attachment)}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Responses */}
          {selectedTicket.responses && selectedTicket.responses.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700 mb-2">Válaszok:</h3>
              {selectedTicket.responses.map((resp, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${
                    resp.isInternal
                      ? 'bg-yellow-50 border-yellow-200'
                      : resp.isClient
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 mr-2">
                        {resp.isInternal
                          ? 'Belső jegyzet'
                          : resp.isClient
                            ? 'Ügyfél'
                            : 'Ügyfélszolgálat'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(resp.createdAt)}
                      </span>
                    </div>
                    {resp.isClient && (
                      <button
                        onClick={() => replyToClient(resp)}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        <ArrowUp className="h-3.5 w-3.5 mr-1" />
                        Válasz
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-line text-gray-700">{resp.content}</p>
                  
                  {/* Response attachments */}
                  {resp.attachments && resp.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {resp.attachments.map((attachment, attachIndex) => (
                          <div key={attachIndex} className="flex items-center bg-white p-2 rounded border border-gray-200">
                            <Paperclip className="h-4 w-4 text-gray-500 mr-2" />
                            <span className="text-sm text-gray-600 mr-2">{attachment.filename}</span>
                            <button
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => downloadAttachment(attachment)}
                            >
                              <Download className="h-4 w-4" />
                            </button>
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
        
        {/* Response form */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Válasz:</h3>
            <div className="ml-auto flex items-center space-x-2">
              <label className="flex items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                  className="mr-1.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Belső jegyzet
              </label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <Paperclip className="h-4 w-4 mr-1" />
                Csatolmány
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                />
              </button>
            </div>
          </div>
          
          {/* Selected attachments */}
          {selectedAttachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedAttachments.map((file, index) => (
                <div key={index} className="bg-white rounded-md border border-gray-200 px-3 py-1 flex items-center">
                  <span className="text-sm text-gray-700 truncate max-w-xs">{file.filename}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex space-x-2">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Írja be a választ..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              rows={4}
            />
            <div className="flex flex-col justify-end">
              <button
                onClick={sendResponse}
                disabled={!response.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Send className="h-4 w-4 mr-2" />
                Küldés
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  // Render new ticket form
  const renderNewTicketForm = () => {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Új Support Ticket</h2>
            <button
              onClick={() => setShowNewTicketForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Tárgy
              </label>
              <input
                type="text"
                id="subject"
                className="block w-full rounded-md border border-gray-300 p-2.5 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                value={newTicket.subject}
                onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Prioritás
              </label>
              <select
                id="priority"
                className="block w-full rounded-md border border-gray-300 p-2.5 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                value={newTicket.priority}
                onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="low">Alacsony</option>
                <option value="medium">Közepes</option>
                <option value="high">Magas</option>
                <option value="urgent">Sürgős</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
                  Ügyfél neve
                </label>
                <input
                  type="text"
                  id="clientName"
                  className="block w-full rounded-md border border-gray-300 p-2.5 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                  value={newTicket.client.name}
                  onChange={(e) => setNewTicket(prev => ({ 
                    ...prev, 
                    client: { ...prev.client, name: e.target.value } 
                  }))}
                />
              </div>
              
              <div>
                <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Ügyfél email (kötelező)
                </label>
                <input
                  type="email"
                  id="clientEmail"
                  className="block w-full rounded-md border border-gray-300 p-2.5 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                  value={newTicket.client.email}
                  onChange={(e) => setNewTicket(prev => ({ 
                    ...prev, 
                    client: { ...prev.client, email: e.target.value } 
                  }))}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Ügyfél telefonszáma
              </label>
              <input
                type="tel"
                id="clientPhone"
                className="block w-full rounded-md border border-gray-300 p-2.5 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                value={newTicket.client.phone}
                onChange={(e) => setNewTicket(prev => ({ 
                  ...prev, 
                  client: { ...prev.client, phone: e.target.value } 
                }))}
              />
            </div>
            
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Üzenet (kötelező)
              </label>
              <textarea
                id="content"
                rows={5}
                className="block w-full rounded-md border border-gray-300 p-2.5 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                value={newTicket.content}
                onChange={(e) => setNewTicket(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowNewTicketForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Mégsem
              </button>
              <button
                type="button"
                onClick={createTicket}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Létrehozás
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  // Render filters panel
  const renderFiltersPanel = () => {
    return (
      <div className={`mb-6 bg-white rounded-lg border border-gray-200 p-4 ${showFilters ? '' : 'hidden'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Állapot
            </label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="block w-full rounded-md border border-gray-300 p-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Összes állapot</option>
              <option value="new">Új</option>
              <option value="open">Nyitott</option>
              <option value="pending">Függőben lévő</option>
              <option value="resolved">Megoldott</option>
              <option value="closed">Lezárt</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Prioritás
            </label>
            <select
              id="priority"
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className="block w-full rounded-md border border-gray-300 p-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Összes prioritás</option>
              <option value="low">Alacsony</option>
              <option value="medium">Közepes</option>
              <option value="high">Magas</option>
              <option value="urgent">Sürgős</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Keresés
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                className="block w-full rounded-md border border-gray-300 pl-10 p-2.5 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Keresés tárgy vagy tartalom alapján"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Szűrők törlése
          </button>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support Ticketek</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-md border text-sm font-medium ${
              showFilters 
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4 inline mr-2" />
            Szűrők
          </button>
          <button
            onClick={() => setShowNewTicketForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium shadow-sm"
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Új Ticket
          </button>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      
      {/* Success message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
          <Check className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}
      
      {/* Filters panel */}
      {renderFiltersPanel()}
      
      {/* Content grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Ticketek</h2>
            <button
              onClick={fetchTickets}
              className="text-indigo-600 hover:text-indigo-900"
              title="Frissítés"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
          {renderTicketList()}
          {renderPagination()}
        </div>
        
        <div className="md:col-span-2 h-[calc(100vh-320px)]">
          {renderTicketDetails()}
        </div>
      </div>
      
      {/* New ticket modal */}
      {showNewTicketForm && renderNewTicketForm()}
    </div>
  );
};

export default SupportTicketManager;