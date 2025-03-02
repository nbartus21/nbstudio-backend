import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  Copy, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Calendar,
  ExternalLink,
  Edit,
  Trash2,
  Send,
  Eye
} from 'lucide-react';
import CreateQuoteForm from './CreateQuoteForm';
import { api } from '../../../services/auth';

// API URL beállítása
const API_URL = 'https://admin.nb-studio.net:5001';

const QuoteManagement = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateRange: 'all'
  });
  const [copySuccess, setCopySuccess] = useState('');

  // Árajánlatok lekérdezése a szervertől az api objektummal
  const fetchQuotes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Az api objektum használata az autentikált kéréshez
      const response = await api.get(`${API_URL}/api/quotes`);
      const data = await response.json();
      
      console.log('Árajánlatok sikeresen betöltve:', data);
      
      // Rendezzük dátum szerint (legújabbak elöl)
      const sortedQuotes = Array.isArray(data) 
      ? data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      : [];
      
      setQuotes(sortedQuotes);
    } catch (error) {
      console.error('Hiba az árajánlatok lekérdezésekor:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Betöltéskor lekérdezzük az árajánlatokat
  useEffect(() => {
    fetchQuotes();
  }, []);

  // Szűrés kezelése
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Szűrt árajánlatok listája
  const filteredQuotes = quotes.filter(quote => {
    // Státusz szűrés
    if (filters.status && quote.status !== filters.status) {
      return false;
    }
    
    // Keresés az ügyfél nevében vagy árajánlat számban
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const clientName = quote.client?.name?.toLowerCase() || '';
      const quoteNumber = quote.quoteNumber?.toLowerCase() || '';
      
      if (!clientName.includes(searchTerm) && !quoteNumber.includes(searchTerm)) {
        return false;
      }
    }
    
    // Dátum szűrés
    if (filters.dateRange !== 'all') {
      const quoteDate = new Date(quote.createdAt);
      const now = new Date();
      
      if (filters.dateRange === 'today') {
        // Ma
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (quoteDate < today) return false;
      } else if (filters.dateRange === 'week') {
        // Elmúlt hét
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        if (quoteDate < lastWeek) return false;
      } else if (filters.dateRange === 'month') {
        // Elmúlt hónap
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        if (quoteDate < lastMonth) return false;
      }
    }
    
    return true;
  });

  // Link másolása a vágólapra
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess('Másolva!');
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch(err => {
        console.error('Nem sikerült másolni:', err);
      });
  };

  // Részletek megjelenítése
  const showDetails = (quote) => {
    setSelectedQuote(quote);
    setShowDetailModal(true);
  };

  // Státusz jel komponens
  const StatusBadge = ({ status }) => {
    let color, icon, label;
    
    switch(status) {
      case 'piszkozat':
        color = 'bg-gray-100 text-gray-800';
        icon = <FileText className="w-3 h-3 mr-1" />;
        label = 'Piszkozat';
        break;
      case 'elküldve':
        color = 'bg-blue-100 text-blue-800';
        icon = <Send className="w-3 h-3 mr-1" />;
        label = 'Elküldve';
        break;
      case 'elfogadva':
        color = 'bg-green-100 text-green-800';
        icon = <CheckCircle className="w-3 h-3 mr-1" />;
        label = 'Elfogadva';
        break;
      case 'elutasítva':
        color = 'bg-red-100 text-red-800';
        icon = <XCircle className="w-3 h-3 mr-1" />;
        label = 'Elutasítva';
        break;
      case 'lejárt':
        color = 'bg-yellow-100 text-yellow-800';
        icon = <Clock className="w-3 h-3 mr-1" />;
        label = 'Lejárt';
        break;
      default:
        color = 'bg-gray-100 text-gray-800';
        icon = null;
        label = status;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {icon}
        {label}
      </span>
    );
  };

  // Új árajánlat létrehozása sikeres
  const handleQuoteCreated = (newQuote) => {
    setShowCreateForm(false);
    // Frissítjük a listát az új árajánlattal
    fetchQuotes();
  };

  // Árajánlat újragenerálása (pl. lejárt esetén)
  const regenerateQuote = async (quoteId) => {
    setLoading(true);
    try {
      await api.post(`${API_URL}/api/quotes/${quoteId}/regenerate`, {});
      
      // Frissítjük a listát
      fetchQuotes();
    } catch (error) {
      console.error('Hiba az árajánlat újragenerálásakor:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Árajánlat törlése
  const deleteQuote = async (quoteId) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt az árajánlatot?')) {
      return;
    }
    
    setLoading(true);
    try {
      await api.delete(`${API_URL}/api/quotes/${quoteId}`);
      
      // Frissítjük a listát
      fetchQuotes();
    } catch (error) {
      console.error('Hiba az árajánlat törlésekor:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Pénznem formázás
  const formatCurrency = (amount, currency = 'EUR') => {
    return `${amount.toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Árajánlatok kezelése</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Új árajánlat
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        {/* Szűrők */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-grow min-w-64">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Keresés ügyfél név vagy árajánlat szám alapján..."
                  className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Státusz:</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Minden státusz</option>
                <option value="piszkozat">Piszkozat</option>
                <option value="elküldve">Elküldve</option>
                <option value="elfogadva">Elfogadva</option>
                <option value="elutasítva">Elutasítva</option>
                <option value="lejárt">Lejárt</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Időszak:</label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">Összes időszak</option>
                <option value="today">Mai</option>
                <option value="week">Elmúlt hét</option>
                <option value="month">Elmúlt hónap</option>
              </select>
            </div>
            
            <button
              onClick={fetchQuotes}
              className="ml-auto px-3 py-2 bg-gray-100 text-gray-700 rounded flex items-center hover:bg-gray-200"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Frissítés
            </button>
          </div>
        </div>
        
        {/* Árajánlatok listája */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Árajánlatok betöltése...</p>
          </div>
        ) : filteredQuotes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Árajánlat
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ügyfél
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Összeg
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Létrehozva
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Érvényesség
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Státusz
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Megosztási link
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Műveletek
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuotes.map(quote => {
                  // Érvényességi dátum ellenőrzése
                  const now = new Date();
                  const validUntil = new Date(quote.validUntil);
                  const isExpired = validUntil < now;
                  
                  // Ha lejárt, de a státusz még nem "lejárt"
                  const effectiveStatus = isExpired && quote.status === 'elküldve' ? 'lejárt' : quote.status;
                  
                  // Megosztási link összeállítása
                  const shareLink = quote.shareLink || `${window.location.origin}/shared-quote/${quote.shareToken}`;
                  
                  // Szerkeszthető-e az árajánlat?
                  const isEditable = quote.status === 'piszkozat' || quote.status === 'elküldve';
                  
                  return (
                    <tr key={quote._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{quote.quoteNumber || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{quote.client?.name}</div>
                        <div className="text-gray-500 text-sm">{quote.client?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatCurrency(quote.totalAmount, quote.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(quote.createdAt).toLocaleDateString('hu-HU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                          {new Date(quote.validUntil).toLocaleDateString('hu-HU')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={effectiveStatus} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="max-w-xs truncate text-sm text-gray-500">
                            {shareLink}
                          </div>
                          <button
                            onClick={() => copyToClipboard(shareLink)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Link másolása"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          {copySuccess && <span className="text-xs text-green-600">{copySuccess}</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          PIN: <span className="font-mono font-medium">{quote.sharePin}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => showDetails(quote)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Részletek"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          
                          {isEditable && (
                            <button
                              onClick={() => alert('Szerkesztés funkció még fejlesztés alatt')}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Szerkesztés"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                          )}
                          
                          {(quote.status === 'lejárt' || isExpired) && (
                            <button
                              onClick={() => regenerateQuote(quote._id)}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Újragenerálás"
                            >
                              <RefreshCw className="h-5 w-5" />
                            </button>
                          )}
                          
                          {quote.status === 'piszkozat' && (
                            <button
                              onClick={() => deleteQuote(quote._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Törlés"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                          
                          <a
                            href={shareLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-900"
                            title="Megnyitás új ablakban"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nincsenek árajánlatok</h3>
            <p className="mt-1 text-gray-500">
              Hozz létre új árajánlatot a "+" gombra kattintva.
            </p>
          </div>
        )}
      </div>
      
      {/* Árajánlat létrehozása modal */}
      {showCreateForm && (
        <CreateQuoteForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleQuoteCreated}
        />
      )}
      
      {/* Részletek modal */}
      {showDetailModal && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  Árajánlat részletei
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Árajánlat adatok</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Árajánlat szám:</span> {selectedQuote.quoteNumber}</p>
                    <p><span className="font-medium">Állapot:</span> <StatusBadge status={selectedQuote.status} /></p>
                    <p><span className="font-medium">Létrehozva:</span> {new Date(selectedQuote.createdAt).toLocaleDateString('hu-HU')}</p>
                    <p>
                      <span className="font-medium">Érvényesség:</span> {new Date(selectedQuote.validUntil).toLocaleDateString('hu-HU')}
                      {new Date(selectedQuote.validUntil) < new Date() && 
                        <span className="text-red-600 ml-2">(Lejárt)</span>
                      }
                    </p>
                    <p><span className="font-medium">Fizetési feltételek:</span> {selectedQuote.paymentTerms}</p>
                    {selectedQuote.notes && (
                      <div>
                        <span className="font-medium">Megjegyzések:</span>
                        <p className="text-gray-600 mt-1">{selectedQuote.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Ügyfél adatok</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Név:</span> {selectedQuote.client?.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedQuote.client?.email}</p>
                    {selectedQuote.client?.phone && (
                      <p><span className="font-medium">Telefon:</span> {selectedQuote.client.phone}</p>
                    )}
                    {selectedQuote.client?.companyName && (
                      <p><span className="font-medium">Cégnév:</span> {selectedQuote.client.companyName}</p>
                    )}
                    {selectedQuote.client?.taxNumber && (
                      <p><span className="font-medium">Adószám:</span> {selectedQuote.client.taxNumber}</p>
                    )}
                    
                    {selectedQuote.client?.address && (
                      <div className="mt-2">
                        <span className="font-medium">Cím:</span>
                        <p className="text-gray-600">
                          {[
                            selectedQuote.client.address.street,
                            selectedQuote.client.address.postalCode,
                            selectedQuote.client.address.city,
                            selectedQuote.client.address.country
                          ].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Tételek</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leírás</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mennyiség</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Egységár</th>
                        {selectedQuote.items.some(item => item.discount > 0) && (
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kedvezmény</th>
                        )}
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Összesen</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedQuote.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm">{item.description}</td>
                          <td className="px-4 py-3 text-right text-sm">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-sm">{formatCurrency(item.unitPrice, selectedQuote.currency)}</td>
                          {selectedQuote.items.some(item => item.discount > 0) && (
                            <td className="px-4 py-3 text-right text-sm">{item.discount}%</td>
                          )}
                          <td className="px-4 py-3 text-right text-sm font-medium">{formatCurrency(item.total, selectedQuote.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan={selectedQuote.items.some(item => item.discount > 0) ? 4 : 3} className="px-4 py-3 text-right text-sm font-medium">
                          Részösszeg:
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {formatCurrency(selectedQuote.subtotal, selectedQuote.currency)}
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td colSpan={selectedQuote.items.some(item => item.discount > 0) ? 4 : 3} className="px-4 py-3 text-right text-sm font-medium">
                          ÁFA ({selectedQuote.vat}%):
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {formatCurrency(selectedQuote.totalAmount - selectedQuote.subtotal, selectedQuote.currency)}
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td colSpan={selectedQuote.items.some(item => item.discount > 0) ? 4 : 3} className="px-4 py-3 text-right font-medium">
                          Végösszeg:
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(selectedQuote.totalAmount, selectedQuote.currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Megosztási adatok</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-2">
                      <span className="font-medium">Megosztási link:</span>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={selectedQuote.shareLink || `${window.location.origin}/shared-quote/${selectedQuote.shareToken}`}
                        readOnly
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50"
                      />
                      <button
                        onClick={() => copyToClipboard(selectedQuote.shareLink || `${window.location.origin}/shared-quote/${selectedQuote.shareToken}`)}
                        className="ml-2 p-2 text-blue-600 hover:text-blue-800"
                        title="Link másolása"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-4">
                      <span className="font-medium">PIN kód:</span>
                      <div className="mt-1 font-mono text-lg tracking-wider text-center p-2 bg-gray-100 rounded border border-gray-200">
                        {selectedQuote.sharePin}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col justify-center">
                    <div className="space-y-4">
                      <p className="text-gray-600">
                        Küldd el a linket és a PIN kódot az ügyfélnek. Az ügyfél a linken megtekintheti az árajánlatot, 
                        és a PIN kód segítségével elfogadhatja vagy elutasíthatja azt.
                      </p>
                      
                      <div className="flex space-x-3">
                        <a
                          href={selectedQuote.shareLink || `${window.location.origin}/shared-quote/${selectedQuote.shareToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <ExternalLink className="mr-1.5 h-4 w-4" />
                          Megtekintés
                        </a>
                        
                        {selectedQuote.status === 'elfogadva' && (
                          <button
                            type="button"
                            onClick={() => alert('Projekt megnyitása funkció még fejlesztés alatt')}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <CheckCircle className="mr-1.5 h-4 w-4" />
                            Projekt megnyitása
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Bezárás
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteManagement;