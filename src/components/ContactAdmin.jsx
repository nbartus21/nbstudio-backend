import React, { useState, useEffect } from 'react';
import { categorizeMessage, generateResponseSuggestion, generateSummary, suggestTags } from '../services/deepseekService';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

// Modal komponens
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// Filter komponens
const Filters = ({ onFilterChange }) => {
  return (
    <div className="flex gap-4 mb-6 flex-wrap">
      <input
        type="text"
        placeholder="Üzenetek keresése..."
        onChange={(e) => onFilterChange('search', e.target.value)}
        className="px-4 py-2 border rounded"
      />
      <select 
        onChange={(e) => onFilterChange('status', e.target.value)}
        className="px-4 py-2 border rounded"
      >
        <option value="">Minden állapot</option>
        <option value="new">Új</option>
        <option value="in-progress">Folyamatban</option>
        <option value="completed">Befejezett</option>
      </select>
      <select 
        onChange={(e) => onFilterChange('priority', e.target.value)}
        className="px-4 py-2 border rounded"
      >
        <option value="">Minden prioritás</option>
        <option value="high">Magas</option>
        <option value="medium">Közepes</option>
        <option value="low">Alacsony</option>
      </select>
    </div>
  );
};

const ContactAdmin = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: ''
  });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // AI elemzés indítása
  const startAIAnalysis = async (message) => {
    setAnalyzing(true);
    try {
      const [categoryData, summary, tags, suggestedResponse] = await Promise.all([
        categorizeMessage(message),
        generateSummary(message),
        suggestTags(message),
        generateResponseSuggestion(message)
      ]);

      setAiAnalysis({
        category: categoryData.category,
        priority: categoryData.priority,
        sentiment: categoryData.sentiment,
        summary,
        tags,
        suggestedResponse
      });
    } catch (error) {
      console.error('AI elemzés sikertelen:', error);
      setError('AI elemzés sikertelen');
    } finally {
      setAnalyzing(false);
    }
  };

  // Kapcsolatok lekérése
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/contacts`);
      if (!response.ok) throw new Error('A kapcsolatok lekérése sikertelen');
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Kapcsolatok szűrése
  const filteredContacts = contacts.filter(contact => {
    const searchMatch = 
      contact.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      contact.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      contact.message.toLowerCase().includes(filters.search.toLowerCase());
    
    const statusMatch = !filters.status || contact.status === filters.status;
    const priorityMatch = !filters.priority || contact.priority === filters.priority;
    
    return searchMatch && statusMatch && priorityMatch;
  });

  // Üzenet részleteinek megtekintése
  const handleViewMessage = async (contact) => {
    setSelectedContact(contact);
    setIsModalOpen(true);
    if (!contact.aiAnalysis) {
      await startAIAnalysis(contact.message);
    }
  };

  // Kapcsolat frissítése
  const handleUpdate = async (id, updateData) => {
    try {
      const response = await fetch(`${API_URL}/contacts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error('A kapcsolat frissítése sikertelen');
      fetchContacts();
    } catch (error) {
      setError(error.message);
    }
  };

  // Kapcsolat törlése
  const handleDelete = async (id) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a kapcsolatot?')) return;
    
    try {
      const response = await fetch(`${API_URL}/contacts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('A kapcsolat törlése sikertelen');
      fetchContacts();
      if (selectedContact?._id === id) {
        setIsModalOpen(false);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Kapcsolati üzenetek</h1>
        
        <Filters onFilterChange={(key, value) => 
          setFilters(prev => ({ ...prev, [key]: value }))
        } />

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 shadow-sm rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Név</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioritás</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Állapot</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategória</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Műveletek</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <tr key={contact._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{contact.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{contact.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${priorityColors[contact.priority || 'medium']}`}>
                      {contact.priority || 'közepes'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={contact.status}
                      onChange={(e) => handleUpdate(contact._id, { status: e.target.value })}
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="new">Új</option>
                      <option value="in-progress">Folyamatban</option>
                      <option value="completed">Befejezett</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contact.category || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleViewMessage(contact)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Megtekintés
                    </button>
                    <button onClick={() => handleDelete(contact._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Törlés
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Üzenet részletei Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {selectedContact && (
          <div className="space-y-6">
            {/* Fejléc */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Üzenet részletei</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Kapcsolat információk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Feladó</h3>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {selectedContact.name} ({selectedContact.email})
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Dátum</h3>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {new Date(selectedContact.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Állapot</h3>
                  <select
                    value={selectedContact.status}
                    onChange={(e) => handleUpdate(selectedContact._id, { status: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="new">Új</option>
                    <option value="in-progress">Folyamatban</option>
                    <option value="completed">Befejezett</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Prioritás</h3>
                  <select
                    value={selectedContact.priority || 'medium'}
                    onChange={(e) => handleUpdate(selectedContact._id, { priority: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="high">Magas</option>
                    <option value="medium">Közepes</option>
                    <option value="low">Alacsony</option>
                  </select>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Kategória</h3>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {selectedContact.category || 'Nincs kategorizálva'}
                  </p>
                </div>

                {selectedContact.tags && selectedContact.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Címkék</h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedContact.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Üzenet tartalma */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Üzenet</h3>
              <p className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">
                {selectedContact.message}
              </p>
            </div>

            {/* AI elemzés rész */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">AI elemzés</h3>
                <button
                  onClick={() => startAIAnalysis(selectedContact.message)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  disabled={analyzing}
                >
                  {analyzing ? 'Elemzés folyamatban...' : 'Elemzés frissítése'}
                </button>
              </div>

              {analyzing ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : aiAnalysis ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Hangulatelemzés</h4>
                    <p className={`mt-1 capitalize ${
                      aiAnalysis.sentiment === 'positive' ? 'text-green-600' :
                      aiAnalysis.sentiment === 'negative' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {aiAnalysis.sentiment}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Összefoglaló</h4>
                    <p className="mt-1">{aiAnalysis.summary}</p>
                  </div>

                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">Javasolt válasz</h4>
                    <textarea
                      value={aiAnalysis.suggestedResponse}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      rows={4}
                      readOnly
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiAnalysis.suggestedResponse);
                      }}
                      className="mt-2 text-sm text-blue-500 hover:text-blue-700"
                    >
                      Másolás vágólapra
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Művelet gombok */}
            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                onClick={() => handleDelete(selectedContact._id)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded"
              >
                Törlés
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Bezárás
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ContactAdmin.jsx-ben adj hozzá console.log-okat
const fetchContacts = async () => {
    try {
      setLoading(true);
      console.log('Kapcsolatok lekérése...');
      const response = await fetch(`${API_URL}/contacts`);
      console.log('Válasz:', response);
      if (!response.ok) throw new Error('A kapcsolatok lekérése sikertelen');
      const data = await response.json();
      console.log('Lekért adatok:', data);
      setContacts(data);
    } catch (error) {
      console.error('Hiba a kapcsolatok lekérésekor:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

export default ContactAdmin;