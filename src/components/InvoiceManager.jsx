import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Download, Edit, Eye, Trash2, DollarSign, Filter, Search,
  Plus, ArrowUp, ArrowDown, CheckCircle, XCircle, AlertCircle, Calendar,
  UserPlus, RefreshCw, Printer, Repeat, List, Clock, Activity, Terminal,
  CheckSquare, Square, MoreHorizontal, Trash
} from 'lucide-react';
import { api } from '../services/auth';
import { formatShortDate, showMessage } from './shared/utils';

// Modális komponensek
import InvoiceViewModal from './shared/InvoiceViewModal';
import NewInvoiceModal from './project/NewInvoiceModal';
import UpdateInvoiceStatusModal from './shared/UpdateInvoiceStatusModal';
import RecurringInvoiceLogsModal from './shared/RecurringInvoiceLogsModal';

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
  const [showRecurringLogsModal, setShowRecurringLogsModal] = useState(false);

  // Szűrési állapotok
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [recurringFilter, setRecurringFilter] = useState('all'); // Ismétlődő számlák szűrője

  // Tömeges műveletek állapotai
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkActionMenu, setShowBulkActionMenu] = useState(false);

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
  const handleUpdateStatus = async (invoice, newStatus, updateData) => {
    try {
      const projectId = invoice.projectId;
      const invoiceId = invoice._id;

      console.log('Státusz frissítése:', {
        projectId,
        invoiceId,
        newStatus,
        updateData
      });

      // Ha nem kaptunk külön updateData objektumot, akkor készítünk egy alapértelmezetet
      if (!updateData) {
        updateData = { status: newStatus };

        // Fizetett állapot esetén beállítjuk a fizetett összeget és dátumot
        if (newStatus === 'fizetett') {
          updateData.paidAmount = invoice.totalAmount;
          updateData.paidDate = new Date().toISOString();
        }
      }

      console.log('Küldés előtti updateData:', updateData);

      // Használjuk a PATCH végpontot, amely a részleges frissítésre való
      const response = await api.patch(
        `/api/projects/${projectId}/invoices/${invoiceId}`,
        updateData
      );

      // Mindenképpen próbáljuk meg kiolvasni a választ
      let responseData;
      try {
        responseData = await response.json();
        console.log('Backend válasz:', responseData);
      } catch (jsonError) {
        console.error('Nem sikerült a válasz JSON feldolgozása:', jsonError);
      }

      if (!response.ok) {
        throw new Error(responseData?.message || 'Számla frissítése sikertelen');
      }

      console.log('Státusz frissítés sikeres');

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

      // Frissítsük a számlák listáját, hogy biztos legyen a frissítés
      setTimeout(() => {
        fetchInvoices();
      }, 1000);

      showMessage(setSuccessMessage, `Számla státusza frissítve: ${newStatus}`);
      setShowUpdateStatusModal(false);
    } catch (err) {
      console.error('Hiba a számla státuszának frissítésekor:', err);
      setError(`Nem sikerült frissíteni a számla státuszát: ${err.message}`);
    }
  };

  // Ismétlődő számla generálása
  const handleGenerateRecurring = async (invoice) => {
    if (!window.confirm('Biztosan létre szeretne hozni egy új számlát ebből az ismétlődő számla sablonból?')) {
      return;
    }

    try {
      const projectId = invoice.projectId;
      const invoiceId = invoice._id;

      const response = await api.post(`/api/projects/${projectId}/invoices/${invoiceId}/generate`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba az ismétlődő számla generálása során');
      }

      const result = await response.json();
      console.log('Új számla létrehozva:', result);

      // Frissítsük a számlalistát
      await fetchInvoices();

      showMessage(setSuccessMessage, 'Ismétlődő számla sikeresen létrehozva');
    } catch (err) {
      console.error('Hiba az ismétlődő számla generálásakor:', err);
      setError(`Nem sikerült létrehozni az ismétlődő számlát: ${err.message}`);
    }
  };

  // PDF generálása
  const handleGeneratePDF = async (invoice) => {
    try {
      const projectId = invoice.projectId;
      const invoiceId = invoice._id;

      // Megfelelő URL-t használunk, ami kompatibilis a backend-del
      // A teljes "/api" útvonalon kérjük le a PDF-et
      console.log(`PDF generálás: /api/projects/${projectId}/invoices/${invoiceId}/pdf`);

      // Token ellenőrzése
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('Nincs bejelentkezési token!');
      } else {
        console.log('Token elérhető a sessionStorage-ban');
      }

      // Közvetlenül a natív fetch()-et használjuk, hogy blob típusú választ kaphassunk
      console.log('Fetch kérés indítása...');
      const response = await fetch(`/api/projects/${projectId}/invoices/${invoiceId}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Fetch válasz:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(err => 'Nem olvasható hibaüzenet');
        console.error('PDF letöltési hiba:', errorText);
        throw new Error(`PDF generálása sikertelen: ${response.status} ${response.statusText}`);
      }

      console.log('PDF letöltése sikeres, blob létrehozása...');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `szamla-${invoice.number}.pdf`);
      document.body.appendChild(link);
      console.log('Letöltés indítása...');
      link.click();
      document.body.removeChild(link);

      // Felszabadítjuk a blob URL-t
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);

      showMessage(setSuccessMessage, 'PDF sikeresen letöltve');
    } catch (err) {
      console.error('Hiba a PDF generálásakor:', err);
      setError(`Hiba a PDF generálásakor: ${err.message}`);
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

  // Számla kijelölése
  const toggleInvoiceSelection = (invoice) => {
    setSelectedInvoices(prev => {
      // Ellenőrizzük, hogy a számla már ki van-e jelölve
      const isSelected = prev.some(i => i.invoiceId === invoice._id && i.projectId === invoice.projectId);

      if (isSelected) {
        // Ha már ki van jelölve, akkor távolítsuk el
        return prev.filter(i => !(i.invoiceId === invoice._id && i.projectId === invoice.projectId));
      } else {
        // Ha nincs kijelölve, akkor adjuk hozzá
        return [...prev, { invoiceId: invoice._id, projectId: invoice.projectId }];
      }
    });
  };

  // Összes számla kijelölése/kijelölés megszüntetése
  const toggleSelectAll = () => {
    if (selectAll) {
      // Ha minden ki van jelölve, töröljük a kijelöléseket
      setSelectedInvoices([]);
    } else {
      // Ha nincs minden kijelölve, jelöljük ki az összes szűrt számlát
      const allInvoices = filteredInvoices.map(invoice => ({
        invoiceId: invoice._id,
        projectId: invoice.projectId
      }));
      setSelectedInvoices(allInvoices);
    }
    setSelectAll(!selectAll);
  };

  // Tömeges törlés
  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) {
      setError('Nincs kijelölt számla a törléshez');
      return;
    }

    if (!window.confirm(`Biztosan törölni szeretné a kijelölt ${selectedInvoices.length} számlát?`)) {
      return;
    }

    try {
      // Tömeges törlés végpont hívása
      const response = await api.post('/invoices/bulk-delete', { invoices: selectedInvoices });
      if (!response.ok) throw new Error('Tömeges törlés sikertelen');

      // Frissítjük a számlák listáját és töröljük a kijelöléseket
      fetchInvoices();
      setSelectedInvoices([]);
      setSelectAll(false);
      setShowBulkActionMenu(false);

      showMessage(setSuccessMessage, `${selectedInvoices.length} számla sikeresen törölve`);
    } catch (err) {
      console.error('Hiba a tömeges törlés során:', err);
      setError('Nem sikerült végrehajtani a tömeges törlést. Kérjük, próbálja újra később.');
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

    // Ismétlődő számlák szűrője
    if (recurringFilter !== 'all') {
      if (recurringFilter === 'recurring') {
        filtered = filtered.filter(invoice =>
          invoice.recurring && invoice.recurring.isRecurring === true
        );
      } else {
        filtered = filtered.filter(invoice =>
          !invoice.recurring || invoice.recurring.isRecurring !== true
        );
      }
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
  }, [searchTerm, statusFilter, dateFilter, projectFilter, sortBy, recurringFilter, invoices]);

// Új számla létrehozása
const handleCreateInvoice = async (selectedProjectForInvoice, invoiceData) => {
  if (!selectedProjectForInvoice) {
    setError('Nincs kiválasztott projekt!');
    return;
  }

  try {
    console.log('Számla létrehozása a következő projekthez:', selectedProjectForInvoice.name);
    console.log('Kapott számla adatok:', invoiceData);

    // Ellenőrizzük az összes tételt
    const validItems = [];

    for (const item of invoiceData.items) {
      // Ellenőrizzük, hogy a leírás nem üres
      if (!item.description || item.description.trim() === '') {
        setError('A tétel leírása nem lehet üres!');
        return;
      }

      // Biztosítsuk, hogy a mennyiség és egységár számok
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);

      if (isNaN(quantity) || quantity <= 0) {
        setError('A mennyiség pozitív szám kell, hogy legyen!');
        return;
      }

      if (isNaN(unitPrice) || unitPrice < 0) {
        setError('Az egységár nem lehet negatív!');
        return;
      }

      // Számoljuk ki a teljes árat
      const total = quantity * unitPrice;

      // Adjuk hozzá a validált tételt
      validItems.push({
        description: item.description.trim(),
        quantity: quantity,
        unitPrice: unitPrice,
        total: total
      });
    }

    // Számoljuk ki a végösszeget
    const totalAmount = validItems.reduce((sum, item) => sum + item.total, 0);

    // Egyedi számlaszám generálása
    const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Ismétlődő számla beállítások hozzáadása
    let recurringSettings = null;
    if (invoiceData.recurring && invoiceData.recurring.isRecurring) {
      recurringSettings = {
        isRecurring: true,
        interval: invoiceData.recurring.interval || 'havonta',
        nextDate: invoiceData.recurring.nextDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 nap múlva alapértelmezetten
        endDate: invoiceData.recurring.endDate || null,
        remainingOccurrences: invoiceData.recurring.remainingOccurrences || null
      };
    }

    // Számla adatok összeállítása - MongoDB ObjectId-t nem tudunk generálni frontenden, ezt a szerver fogja hozzáadni
    const finalInvoiceData = {
      number: invoiceNumber,
      date: new Date(),
      items: validItems,
      totalAmount: totalAmount,
      paidAmount: 0,
      status: 'kiállított',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 nap fizetési határidő
      notes: invoiceData.notes || '',
      recurring: recurringSettings
    };

    console.log('Küldendő számla adatok:', JSON.stringify(finalInvoiceData, null, 2));

    const response = await api.post(
      `/api/projects/${selectedProjectForInvoice._id}/invoices`,
      finalInvoiceData
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Nem sikerült létrehozni a számlát');
    }

    const updatedProject = await response.json();
    console.log('Számla létrehozása sikeres', updatedProject);

    // Keressük ki az újonnan létrehozott számlát
    const latestInvoice = updatedProject.invoices[updatedProject.invoices.length - 1];

    if (!latestInvoice) {
      throw new Error('Nem sikerült azonosítani az újonnan létrehozott számlát');
    }

    // Új számla hozzáadása a listához
    const newlyCreatedInvoice = {
      ...finalInvoiceData,
      _id: latestInvoice._id,
      projectId: selectedProjectForInvoice._id,
      projectName: selectedProjectForInvoice.name,
      clientName: selectedProjectForInvoice.client?.name || 'Ismeretlen ügyfél',
      currency: selectedProjectForInvoice.financial?.currency || 'EUR'
    };

    setInvoices(prev => [...prev, newlyCreatedInvoice]);
    setFilteredInvoices(prev => [...prev, newlyCreatedInvoice]);

    setShowNewInvoiceModal(false);
    setSelectedProject(null);
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
        <div className="flex space-x-2">
          <button
            onClick={() => setShowRecurringLogsModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            title="Ismétlődő számlák napló megtekintése"
          >
            <Activity className="h-5 w-5 mr-1" />
            Naplók
          </button>

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
              value={recurringFilter}
              onChange={(e) => setRecurringFilter(e.target.value)}
              className="pl-3 pr-8 py-2 border rounded-md"
            >
              <option value="all">Összes számla</option>
              <option value="recurring">Ismétlődő számlák</option>
              <option value="non-recurring">Egyszeri számlák</option>
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
              setRecurringFilter('all');
              setSortBy('date-desc');
            }}
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Szűrők törlése
          </button>
        </div>
      </div>

      {/* Tömeges műveletek */}
      {selectedInvoices.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow mb-4 flex justify-between items-center">
          <div>
            <span className="text-sm font-medium text-gray-700">{selectedInvoices.length} számla kijelölve</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 flex items-center text-sm"
            >
              <Trash className="h-4 w-4 mr-1" />
              Törlés
            </button>
            <button
              onClick={() => setSelectedInvoices([])}
              className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 text-sm"
            >
              Kijelölés törlése
            </button>
          </div>
        </div>
      )}

      {/* Számla lista */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <button
                      onClick={toggleSelectAll}
                      className="focus:outline-none"
                      title={selectAll ? 'Kijelölés megszüntetése' : 'Összes kijelölése'}
                    >
                      {selectAll ?
                        <CheckSquare className="h-5 w-5 text-indigo-600" /> :
                        <Square className="h-5 w-5 text-gray-400" />
                      }
                    </button>
                  </div>
                </th>
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

                  const isSelected = selectedInvoices.some(i => i.invoiceId === invoice._id && i.projectId === invoice.projectId);

                  return (
                    <tr key={invoice._id} className={`hover:bg-gray-50 ${isSelected ? 'bg-indigo-50' : ''}`}>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleInvoiceSelection(invoice)}
                            className="focus:outline-none"
                            title={isSelected ? 'Kijelölés megszüntetése' : 'Kijelölés'}
                          >
                            {isSelected ?
                              <CheckSquare className="h-5 w-5 text-indigo-600" /> :
                              <Square className="h-5 w-5 text-gray-400" />
                            }
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">{invoice.number}</div>
                          {invoice.recurring && invoice.recurring.isRecurring && (
                            <span title={`Ismétlődő számla (${invoice.recurring.interval})`} className="ml-2">
                              <Repeat className="h-4 w-4 text-indigo-500" />
                            </span>
                          )}
                        </div>
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
                          {invoice.recurring && invoice.recurring.isRecurring && (
                            <button
                              onClick={() => handleGenerateRecurring(invoice)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                              title="Új számla generálása az ismétlődőből"
                            >
                              <Repeat className="h-5 w-5" />
                            </button>
                          )}
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
            console.log("Új számla létrehozása:", project?.name, invoiceData);
            handleCreateInvoice(project, invoiceData);
          }}
          initialProjectId={selectedProject?._id}
        />
      )}

      {/* Ismétlődő számlák napló modal */}
      {showRecurringLogsModal && (
        <RecurringInvoiceLogsModal
          onClose={() => setShowRecurringLogsModal(false)}
        />
      )}
    </div>
  );
};

export default InvoiceManager;