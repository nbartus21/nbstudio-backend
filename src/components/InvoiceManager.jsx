import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Download, Edit, Eye, Trash2, DollarSign, Filter, Search, 
  Plus, ArrowUp, ArrowDown, CheckCircle, XCircle, AlertCircle, Calendar,
  UserPlus, RefreshCw, Printer
} from 'lucide-react';
import { api } from '../services/auth';
import { formatShortDate, showMessage } from './shared/utils';

// Modális komponensek
import InvoiceViewModal from './shared/InvoiceViewModal';
import NewInvoiceModal from './project/NewInvoiceModal';
import UpdateInvoiceStatusModal from './shared/UpdateInvoiceStatusModal';

const InvoiceManager = () => {
  // Állapotok
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  
  // Modális állapotok
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [showViewInvoiceModal, setShowViewInvoiceModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  
  // Szűrési állapotok
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  
  // Új számla állapota
  const [newInvoice, setNewInvoice] = useState({
    items: [{ description: '', quantity: 1, unitPrice: 0 }]
  });
  
  // Számlák lekérése
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Projektek lekérése
      const projectsResponse = await api.get('/api/projects');
      if (!projectsResponse.ok) throw new Error('Projektek lekérése sikertelen');
      const projectsData = await projectsResponse.json();
      setProjects(projectsData);
      
      // Számlák összegyűjtése a projektekből
      const allInvoices = [];
      projectsData.forEach(project => {
        if (project.invoices && project.invoices.length > 0) {
          project.invoices.forEach(invoice => {
            allInvoices.push({
              ...invoice,
              projectId: project._id,
              projectName: project.name,
              clientName: project.client?.name || 'Ismeretlen ügyfél',
              currency: project.financial?.currency || 'EUR'
            });
          });
        }
      });
      
      setInvoices(allInvoices);
      setFilteredInvoices(allInvoices);
      setError(null);
    } catch (err) {
      console.error('Hiba a számlák lekérésekor:', err);
      setError('Nem sikerült betölteni a számlákat. Kérjük, próbálja újra később.');
    } finally {
      setLoading(false);
    }
  };
  
  // Komponens betöltésekor
  useEffect(() => {
    fetchInvoices();
  }, []);
  
  // Státusz frissítése
  const handleUpdateStatus = async (invoice, newStatus) => {
    try {
      const projectId = invoice.projectId;
      const invoiceId = invoice._id;
      
      // Fizetett állapot esetén beállítjuk a fizetett összeget és dátumot
      let updateData = { status: newStatus };
      if (newStatus === 'fizetett') {
        updateData.paidAmount = invoice.totalAmount;
        updateData.paidDate = new Date();
      }
      
      const response = await api.patch(
        `/api/projects/${projectId}/invoices/${invoiceId}`,
        updateData
      );
      
      if (!response.ok) throw new Error('Számla frissítése sikertelen');
      
      // UI frissítése
      setInvoices(prevInvoices => 
        prevInvoices.map(inv => 
          inv._id === invoiceId ? { ...inv, ...updateData } : inv
        )
      );
      
      setFilteredInvoices(prevInvoices => 
        prevInvoices.map(inv => 
          inv._id === invoiceId ? { ...inv, ...updateData } : inv
        )
      );
      
      showMessage(setSuccessMessage, `Számla státusza frissítve: ${newStatus}`);
      setShowUpdateStatusModal(false);
    } catch (err) {
      console.error('Hiba a számla státuszának frissítésekor:', err);
      setError('Nem sikerült frissíteni a számla státuszát. Kérjük, próbálja újra később.');
    }
  };
  
  // PDF generálása
  const handleGeneratePDF = async (invoice) => {
    try {
      const projectId = invoice.projectId;
      const invoiceId = invoice._id;
      
      window.open(`/api/projects/${projectId}/invoices/${invoiceId}/pdf`, '_blank');
      showMessage(setSuccessMessage, 'PDF generálása folyamatban...');
    } catch (err) {
      console.error('Hiba a PDF generálásakor:', err);
      setError('Nem sikerült generálni a PDF-et. Kérjük, próbálja újra később.');
    }
  };
  
  // Számla törlése
  const handleDeleteInvoice = async (invoice) => {
    if (!window.confirm('Biztosan törölni szeretné ezt a számlát?')) return;
    
    try {
      const projectId = invoice.projectId;
      const invoiceId = invoice._id;
      
      const response = await api.delete(`/api/projects/${projectId}/invoices/${invoiceId}`);
      if (!response.ok) throw new Error('Számla törlése sikertelen');
      
      // UI frissítése
      setInvoices(prevInvoices => prevInvoices.filter(inv => inv._id !== invoiceId));
      setFilteredInvoices(prevInvoices => prevInvoices.filter(inv => inv._id !== invoiceId));
      
      showMessage(setSuccessMessage, 'Számla sikeresen törölve');
    } catch (err) {
      console.error('Hiba a számla törlésekor:', err);
      setError('Nem sikerült törölni a számlát. Kérjük, próbálja újra később.');
    }
  };
  
  // Szűrések alkalmazása
  const applyFilters = () => {
    let filtered = [...invoices];
    
    // Keresés
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice => 
        invoice.number?.toLowerCase().includes(searchLower) ||
        invoice.projectName?.toLowerCase().includes(searchLower) ||
        invoice.clientName?.toLowerCase().includes(searchLower)
      );
    }
    
    // Státusz szűrő
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }
    
    // Dátum szűrő
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.date);
        
        switch (dateFilter) {
          case 'today':
            return invoiceDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return invoiceDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return invoiceDate >= monthAgo;
          case 'overdue':
            return new Date(invoice.dueDate) < today && invoice.status !== 'fizetett';
          case 'thisMonth':
            return invoiceDate.getMonth() === today.getMonth() && 
                   invoiceDate.getFullYear() === today.getFullYear();
          case 'lastMonth':
            const lastMonth = new Date(today);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            return invoiceDate.getMonth() === lastMonth.getMonth() && 
                   invoiceDate.getFullYear() === lastMonth.getFullYear();
          default:
            return true;
        }
      });
    }
    
    // Projekt szűrő
    if (projectFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.projectId === projectFilter);
    }
    
    // Rendezés
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date) - new Date(a.date);
        case 'date-asc':
          return new Date(a.date) - new Date(b.date);
        case 'due-desc':
          return new Date(b.dueDate) - new Date(a.dueDate);
        case 'due-asc':
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'number':
          return a.number?.localeCompare(b.number);
        case 'amount-desc':
          return b.totalAmount - a.totalAmount;
        case 'amount-asc':
          return a.totalAmount - b.totalAmount;
        default:
          return 0;
      }
    });
    
    setFilteredInvoices(filtered);
  };
  
  // Szűrő változás követése
  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, dateFilter, projectFilter, sortBy, invoices]);
  
  // Új számla létrehozása
  const handleCreateInvoice = async () => {
    if (!selectedProject) {
      setError('Nincs kiválasztott projekt!');
      return;
    }
  
    try {
      const itemsWithTotal = newInvoice.items.map(item => {
        const total = item.quantity * item.unitPrice;
        return { ...item, total };
      });
  
      const totalAmount = itemsWithTotal.reduce((sum, item) => sum + item.total, 0);
      // Egyedi számlaszám generálása
      const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
  
      const invoiceData = {
        number: invoiceNumber,
        date: new Date(),
        items: itemsWithTotal,
        totalAmount,
        paidAmount: 0,
        status: 'kiállított',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 nap fizetési határidő
      };
  
      const response = await api.post(
        `/api/projects/${selectedProject._id}/invoices`,
        invoiceData
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Nem sikerült létrehozni a számlát');
      }
  
      const updatedProject = await response.json();
      
      // Új számla hozzáadása a listához
      const newlyCreatedInvoice = {
        ...invoiceData,
        _id: updatedProject.invoices[updatedProject.invoices.length - 1]._id,
        projectId: selectedProject._id,
        projectName: selectedProject.name,
        clientName: selectedProject.client?.name || 'Ismeretlen ügyfél',
        currency: selectedProject.financial?.currency || 'EUR'
      };
      
      setInvoices(prev => [...prev, newlyCreatedInvoice]);
  
      setShowNewInvoiceModal(false);
      setNewInvoice({ items: [{ description: '', quantity: 1, unitPrice: 0 }] });
      showMessage(setSuccessMessage, 'Számla sikeresen létrehozva');
    } catch (error) {
      console.error('Hiba a számla létrehozásakor:', error);
      setError(`Hiba történt a számla létrehozásakor: ${error.message}`);
    }
  };
  
  // Új tétel hozzáadása
  const handleAddInvoiceItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }]
    }));
  };
  
  // Státusz alapján formázás
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'fizetett':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'kiállított':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'késedelmes':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'törölt':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };
  
  // Fizetési határidő formázása
  const getDueDateClass = (dueDate, status) => {
    if (status === 'fizetett' || status === 'törölt') return 'text-gray-600';
    
    const now = new Date();
    const due = new Date(dueDate);
    
    if (due < now) return 'text-red-600 font-medium';
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    
    if (due <= threeDaysFromNow) return 'text-orange-600';
    
    return 'text-gray-600';
  };
  
  // Statisztikák számolása
  const statistics = {
    totalInvoices: filteredInvoices.length,
    totalAmount: filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
    paidAmount: filteredInvoices.reduce((sum, inv) => sum + (inv.status === 'fizetett' ? (inv.totalAmount || 0) : 0), 0),
    pendingAmount: filteredInvoices.reduce((sum, inv) => sum + (inv.status !== 'fizetett' && inv.status !== 'törölt' ? (inv.totalAmount || 0) : 0), 0),
    overdue: filteredInvoices.filter(inv => new Date(inv.dueDate) < new Date() && inv.status !== 'fizetett' && inv.status !== 'törölt').length
  };
  
  // Fizetési határidő visszajelzés
  const getDueStatus = (dueDate, status) => {
    if (status === 'fizetett' || status === 'törölt') return { icon: null, text: null };
    
    const now = new Date();
    const due = new Date(dueDate);
    
    if (due < now) {
      return { 
        icon: <AlertCircle className="h-4 w-4 text-red-600 mr-1" />, 
        text: 'Lejárt' 
      };
    }
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    
    if (due <= threeDaysFromNow) {
      return { 
        icon: <AlertCircle className="h-4 w-4 text-orange-600 mr-1" />, 
        text: 'Hamarosan lejár' 
      };
    }
    
    return { icon: null, text: null };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hibaüzenet */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
          <XCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Sikeres művelet üzenet */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}

      {/* Fejléc */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Számla Kezelő</h1>
        <button
          onClick={() => {
            if (projects.length === 0) {
              setError('Nincsenek projektek a számla létrehozásához. Kérjük, először hozzon létre egy projektet.');
              return;
            }
            setShowNewInvoiceModal(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Új számla
        </button>
      </div>

      {/* Statisztikai kártyák */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Összes számla</p>
              <p className="text-2xl font-bold">{statistics.totalInvoices} db</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Teljes összeg</p>
              <p className="text-2xl font-bold">{statistics.totalAmount.toLocaleString()} €</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Fizetésre vár</p>
              <p className="text-2xl font-bold">{statistics.pendingAmount.toLocaleString()} €</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Lejárt határidő</p>
              <p className="text-2xl font-bold">{statistics.overdue} db</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Szűrők */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-grow max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Keresés számla vagy ügyfél alapján..."
              className="pl-10 pr-3 py-2 w-full border rounded-md"
            />
          </div>
          
          <div className="flex-grow-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-3 pr-8 py-2 border rounded-md"
            >
              <option value="all">Összes státusz</option>
              <option value="kiállított">Kiállított</option>
              <option value="fizetett">Fizetett</option>
              <option value="késedelmes">Késedelmes</option>
              <option value="törölt">Törölt</option>
            </select>
          </div>
          
          <div className="flex-grow-0">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-3 pr-8 py-2 border rounded-md"
            >
              <option value="all">Összes dátum</option>
              <option value="today">Ma</option>
              <option value="week">Elmúlt hét</option>
              <option value="month">Elmúlt hónap</option>
              <option value="overdue">Lejárt határidejű</option>
              <option value="thisMonth">Aktuális hónap</option>
              <option value="lastMonth">Előző hónap</option>
            </select>
          </div>
          
          <div className="flex-grow-0">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="pl-3 pr-8 py-2 border rounded-md"
            >
              <option value="all">Összes projekt</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-grow-0 ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-3 pr-8 py-2 border rounded-md"
            >
              <option value="date-desc">Legújabb elöl</option>
              <option value="date-asc">Legrégebbi elöl</option>
              <option value="due-desc">Határidő (csökkenő)</option>
              <option value="due-asc">Határidő (növekvő)</option>
              <option value="number">Számlaszám szerint</option>
              <option value="amount-desc">Összeg (csökkenő)</option>
              <option value="amount-asc">Összeg (növekvő)</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-gray-500">
            {filteredInvoices.length} számla megjelenítve az összes {invoices.length} számla közül
          </span>
          
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDateFilter('all');
              setProjectFilter('all');
              setSortBy('date-desc');
            }}
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Szűrők törlése
          </button>
        </div>
      </div>

      {/* Számla lista */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Számlaszám
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projekt / Ügyfél
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dátum
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fizetési határidő
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Összeg
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Státusz
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => {
                  const dueStatus = getDueStatus(invoice.dueDate, invoice.status);
                  
                  return (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.projectName}</div>
                        <div className="text-sm text-gray-500">{invoice.clientName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatShortDate(invoice.date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${getDueDateClass(invoice.dueDate, invoice.status)} flex items-center`}>
                          {dueStatus.icon}
                          {formatShortDate(invoice.dueDate)}
                          {dueStatus.text && (
                            <span className="ml-2 text-xs font-medium">
                              ({dueStatus.text})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.totalAmount?.toLocaleString()} {invoice.currency}
                        </div>
                        {invoice.status === 'fizetett' && invoice.paidAmount > 0 && (
                          <div className="text-xs text-green-600">
                            Fizetve: {invoice.paidAmount?.toLocaleString()} {invoice.currency}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getStatusBadgeClass(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              const project = projects.find(p => p._id === invoice.projectId);
                              setShowViewInvoiceModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                            title="Megtekintés"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowUpdateStatusModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="Státusz módosítása"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleGeneratePDF(invoice)}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                            title="PDF letöltése"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(invoice)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Törlés"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                    {invoices.length > 0 ? (
                      <div>
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-lg font-medium">Nincs a szűrésnek megfelelő számla</p>
                        <p className="mt-1">Próbálja meg módosítani a szűrési feltételeket</p>
                      </div>
                    ) : (
                      <div>
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-lg font-medium">Nincsenek még számlák</p>
                        <p className="mt-1">Kattintson az "Új számla" gombra a létrehozáshoz</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nézet számla modal */}
      {showViewInvoiceModal && selectedInvoice && (
        <InvoiceViewModal
          invoice={selectedInvoice}
          project={projects.find(p => p._id === selectedInvoice.projectId)}
          onClose={() => setShowViewInvoiceModal(false)}
          onUpdateStatus={(invoice, status) => {
            setShowViewInvoiceModal(false);
            setShowUpdateStatusModal(true);
          }}
          onGeneratePDF={handleGeneratePDF}
        />
      )}

      {/* Státusz frissítés modal */}
      {showUpdateStatusModal && selectedInvoice && (
        <UpdateInvoiceStatusModal
          invoice={selectedInvoice}
          onClose={() => setShowUpdateStatusModal(false)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Új számla modal */}
      {showNewInvoiceModal && (
        <NewInvoiceModal
          projects={projects}
          onClose={() => {
            setShowNewInvoiceModal(false);
            setSelectedProject(null);
            setNewInvoice({ items: [{ description: '', quantity: 1, unitPrice: 0 }] });
          }}
          onCreateInvoice={(project, invoiceData) => {
            setSelectedProject(project);
            handleCreateInvoice();
          }}
          initialProjectId={selectedProject?._id}
        />
      )}
    </div>
  );
};

export default InvoiceManager;