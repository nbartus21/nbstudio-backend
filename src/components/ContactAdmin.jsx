import React, { useState, useEffect } from 'react';
import { categorizeMessage, generateResponseSuggestion, generateSummary, suggestTags } from '../services/deepseekService';
import { api } from '../services/auth';
import { Mail } from 'lucide-react';

const API_URL = 'https://admin.nb-studio.net:5001/api';

// Language detection function
const detectLanguage = (text) => {
  // Simple language detection based on common words
  const germanWords = ['der', 'die', 'das', 'und', 'ist', 'in', 'ich', 'zu', 'den', 'für'];
  const hungarianWords = ['és', 'van', 'nem', 'hogy', 'az', 'egy', 'kell', 'vagyok', 'miatt', 'lesz'];
  
  const words = text.toLowerCase().split(/\s+/);
  let germanCount = 0;
  let hungarianCount = 0;
  
  words.forEach(word => {
    if (germanWords.includes(word)) germanCount++;
    if (hungarianWords.includes(word)) hungarianCount++;
  });
  
  if (germanCount > hungarianCount) return 'de';
  if (hungarianCount > germanCount) return 'hu';
  return 'en';
};

// Email sending function
const sendEmail = async (to, subject, body) => {
  try {
    await api.post(`${API_URL}/send-email`, {
      to,
      subject: 'Re: ' + subject,
      body
    });
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

// Enhanced Modal component with improved styling
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="absolute right-4 top-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-2">{children}</div>
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
      const detectedLang = detectLanguage(message);
      const [categoryData, summary, tags, suggestedResponse] = await Promise.all([
        categorizeMessage(message, detectedLang),
        generateSummary(message, detectedLang),
        suggestTags(message),
        generateResponseSuggestion(message, detectedLang)
      ]);

      setAiAnalysis({
        category: categoryData.category,
        priority: categoryData.priority,
        sentiment: categoryData.sentiment,
        summary,
        tags,
        suggestedResponse,
        language: detectedLang
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
      await api.put(`${API_URL}/contacts/${id}`, updateData);
      fetchContacts();
    } catch (error) {
      setError(error.message);
    }
  };

  // Kapcsolat törlése
  const handleDelete = async (id) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a kapcsolatot?')) return;
    
    try {
      await api.delete(`${API_URL}/contacts/${id}`);
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
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleViewMessage(contact)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-colors duration-200"
                        title="Megtekintés"
                      >
                        <svg 
                          className="w-5 h-5" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>

                      <button 
                        onClick={() => handleDelete(contact._id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-colors duration-200"
                        title="Törlés"
                      >
                        <svg 
                          className="w-5 h-5" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
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
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Észlelt nyelv</h4>
                      <p className="text-lg font-medium">
                        {aiAnalysis.language === 'de' ? 'Német' :
                         aiAnalysis.language === 'hu' ? 'Magyar' : 'Angol'}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Hangulatelemzés</h4>
                      <p className={`text-lg font-medium ${
                        aiAnalysis.sentiment === 'positive' ? 'text-green-600' :
                        aiAnalysis.sentiment === 'negative' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {aiAnalysis.sentiment === 'positive' ? 'Pozitív' :
                         aiAnalysis.sentiment === 'negative' ? 'Negatív' : 'Semleges'}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Összefoglaló</h4>
                      <p className="text-gray-900">{aiAnalysis.summary}</p>
                    </div>
                  </div>

                  {/* Javasolt válasz szekció */}
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-500">Javasolt válasz</h4>
                      <div className="space-x-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(aiAnalysis.suggestedResponse);
                          }}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                        >
                          Másolás
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={aiAnalysis.suggestedResponse}
                      className="w-full rounded-lg border border-gray-300 p-4 min-h-[150px] mb-3"
                      readOnly
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={async () => {
                          try {
                            const success = await sendEmail(
                              selectedContact.email,
                              'Válasz a megkeresésére',
                              aiAnalysis.suggestedResponse
                            );
                            if (success) {
                              alert('Email sikeresen elküldve!');
                              handleUpdate(selectedContact._id, { status: 'completed' });
                            } else {
                              alert('Az email küldése sikertelen.');
                            }
                          } catch (error) {
                            console.error('Email küldési hiba:', error);
                            alert('Hiba történt az email küldése közben.');
                          }
                        }}
                        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Email küldése
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Művelet gombok */}
            <div className="flex justify-end gap-3 border-t pt-4 mt-6">
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

export default ContactAdmin;