import React, { useState, useEffect } from 'react';
import { 
  X, Repeat, Calendar, Activity, CheckCircle, XCircle, ChevronLeft, ChevronRight, 
  RefreshCw, AlertCircle, Clock 
} from 'lucide-react';
import { api } from '../../services/auth';
import { formatShortDate } from './utils';

const RecurringInvoiceLogsModal = ({ onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filter, setFilter] = useState({
    type: 'all'
  });

  // Logok lekérése
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Szűrési paraméterek összeállítása
      let queryParams = `?page=${pagination.page}&limit=${pagination.limit}`;
      if (filter.type !== 'all') {
        queryParams += `&type=${filter.type}`;
      }
      
      const response = await api.get(`/api/recurring/logs${queryParams}`);
      if (!response.ok) {
        throw new Error('Hiba a logok lekérésekor');
      }
      
      const data = await response.json();
      setLogs(data.logs);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        pages: data.pagination.pages
      }));
    } catch (err) {
      console.error('Hiba a logok lekérése közben:', err);
      setError('Nem sikerült betölteni a logokat: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Induláskor lekérjük a logokat
  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filter.type]);
  
  // Lapozás kezelése
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };
  
  // Szűrő változtatás
  const handleFilterChange = (e) => {
    const newFilter = { ...filter, [e.target.name]: e.target.value };
    setFilter(newFilter);
    setPagination(prev => ({ ...prev, page: 1 })); // Visszalépünk az első oldalra
  };
  
  // Táblázat renderelése
  const renderLogs = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="5" className="text-center py-4">
            <div className="flex justify-center items-center">
              <RefreshCw className="h-6 w-6 text-blue-500 animate-spin mr-2" />
              <span>Logok betöltése...</span>
            </div>
          </td>
        </tr>
      );
    }
    
    if (error) {
      return (
        <tr>
          <td colSpan="5" className="text-center py-4 text-red-600">
            <div className="flex justify-center items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </td>
        </tr>
      );
    }
    
    if (logs.length === 0) {
      return (
        <tr>
          <td colSpan="5" className="text-center py-8 text-gray-500">
            <div className="flex flex-col items-center">
              <Activity className="h-12 w-12 text-gray-400 mb-2" />
              <span className="text-lg font-medium">Nincsenek logbejegyzések</span>
              <span className="text-sm">Az ismétlődő számlák aktivitása itt fog megjelenni</span>
            </div>
          </td>
        </tr>
      );
    }
    
    return logs.map((log, index) => (
      <tr 
        key={log._id} 
        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
      >
        <td className="px-4 py-3 border-b">
          <div className="flex items-center">
            <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2 whitespace-nowrap">
              {log.type === 'auto' ? (
                <Clock className="h-4 w-4 text-purple-500 mr-1" />
              ) : (
                <Activity className="h-4 w-4 text-blue-500 mr-1" />
              )}
              {log.type === 'auto' ? 'Automatikus' : 'Manuális'}
            </span>
            <span className="text-sm font-medium">{log.description}</span>
          </div>
        </td>
        <td className="px-4 py-3 border-b text-sm text-center">
          <span className="font-medium">
            {new Date(log.timestamp).toLocaleString('hu-HU')}
          </span>
        </td>
        <td className="px-4 py-3 border-b text-sm text-center">
          <span className="font-bold">{log.generatedCount}</span>
        </td>
        <td className="px-4 py-3 border-b text-sm text-center">
          {log.success ? (
            <span className="inline-flex items-center text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              Sikeres
            </span>
          ) : (
            <span className="inline-flex items-center text-red-600">
              <XCircle className="h-4 w-4 mr-1" />
              Sikertelen
            </span>
          )}
        </td>
        <td className="px-4 py-3 border-b">
          <button
            onClick={() => toggleDetails(log._id)}
            className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
          >
            Részletek
          </button>
        </td>
      </tr>
    ));
  };
  
  // Részletek megjelenítése
  const [expandedLogId, setExpandedLogId] = useState(null);
  
  const toggleDetails = (logId) => {
    if (expandedLogId === logId) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(logId);
    }
  };
  
  const renderExpandedDetails = () => {
    if (!expandedLogId) return null;
    
    const log = logs.find(l => l._id === expandedLogId);
    if (!log) return null;
    
    return (
      <tr>
        <td colSpan="5" className="px-6 py-4 bg-gray-50 border-b">
          <div className="mb-2">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Részletes adatok</h3>
            {log.error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
                <p className="font-medium">Hiba: {log.error}</p>
              </div>
            )}
            
            {log.details && log.details.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left">Projekt</th>
                      <th className="px-4 py-2 text-left">Eredeti számla</th>
                      <th className="px-4 py-2 text-left">Új számla</th>
                      <th className="px-4 py-2 text-right">Összeg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.details.map((detail, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2">{detail.projectName}</td>
                        <td className="px-4 py-2">{detail.invoiceNumber || detail.invoiceId}</td>
                        <td className="px-4 py-2">{detail.newInvoiceNumber || '-'}</td>
                        <td className="px-4 py-2 text-right">{detail.amount ? `${detail.amount} EUR` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">Nincsenek részletes adatok</p>
            )}
          </div>
          <button
            onClick={() => setExpandedLogId(null)}
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
          >
            <X className="h-4 w-4 mr-1" />
            Bezárás
          </button>
        </td>
      </tr>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full p-6 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <Activity className="h-6 w-6 text-indigo-600 mr-2" />
            Ismétlődő számlák napló
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Szűrők */}
        <div className="mb-4 flex items-center">
          <div className="flex-grow-0 mr-4">
            <select
              name="type"
              value={filter.type}
              onChange={handleFilterChange}
              className="pl-3 pr-8 py-2 border rounded-md"
            >
              <option value="all">Összes típus</option>
              <option value="auto">Csak automatikus</option>
              <option value="manual">Csak manuális</option>
            </select>
          </div>
          
          <button
            onClick={() => fetchLogs()}
            className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Frissítés
          </button>
        </div>
        
        {/* Táblázat */}
        <div className="flex-1 overflow-y-auto border rounded-md">
          <table className="min-w-full">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leírás
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Időpont
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Számlák
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Státusz
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody>
              {renderLogs()}
              {expandedLogId && renderExpandedDetails()}
            </tbody>
          </table>
        </div>
        
        {/* Lapozó */}
        {logs.length > 0 && (
          <div className="flex items-center justify-between pt-4">
            <span className="text-sm text-gray-700">
              {pagination.total} log, {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)} megjelenítve
            </span>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`p-2 rounded ${
                  pagination.page === 1 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <span className="px-3 py-2 text-sm">
                {pagination.page} / {pagination.pages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className={`p-2 rounded ${
                  pagination.page === pagination.pages 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecurringInvoiceLogsModal;