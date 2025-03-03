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
const Filters = ({ onFilterChange, filters, onResetFilters }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Szűrők</h3>
        {(filters.search || filters.status || filters.priority || filters.category) && (
          <button
            onClick={onResetFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Szűrők törlése
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Keresés</label>
          <input
            type="text"
            placeholder="Üzenetek keresése..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Állapot</label>
          <select 
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
          >
            <option value="">Minden állapot</option>
            <option value="new">Új</option>
            <option value="in-progress">Folyamatban</option>
            <option value="completed">Befejezett</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prioritás</label>
          <select 
            value={filters.priority}
            onChange={(e) => onFilterChange('priority', e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
          >
            <option value="">Minden prioritás</option>
            <option value="high">Magas</option>
            <option value="medium">Közepes</option>
            <option value="low">Alacsony</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategória</label>
          <select 
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
          >
            <option value="">Minden kategória</option>
            <option value="support">Támogatás</option>
            <option value="inquiry">Érdeklődés</option>
            <option value="feedback">Visszajelzés</option>
            <option value="complaint">Panasz</option>
            <option value="other">Egyéb</option>
          </select>
        </div>
      </div>
      
      {/* Aktív szűrők megjelenítése */}
      {(filters.search || filters.status || filters.priority || filters.category) && (
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t">
          <span className="text-sm text-gray-500">Aktív szűrők:</span>
          
          {filters.search && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              Keresés: {filters.search}
            </span>
          )}
          
          {filters.status && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
              Állapot: {filters.status === 'new' ? 'Új' : filters.status === 'in-progress' ? 'Folyamatban' : 'Befejezett'}
            </span>
          )}
          
          {filters.priority && (
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
              Prioritás: {filters.priority === 'high' ? 'Magas' : filters.priority === 'medium' ? 'Közepes' : 'Alacsony'}
            </span>
          )}
          
          {filters.category && (
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
              Kategória: {filters.category}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Fő komponens
const ContactAdmin = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    category: ''
  });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'table' vagy 'cards'
  const [starredContacts, setStarredContacts] = useState(new Set());

  // Kapcsolatok lekérése
  const fetchContacts = async () => {
    try {
      setLoading(true);
      console.log('Kapcsolatok lekérése...');
      const response = await api.get(`${API_URL}/contacts`);
      console.log('Válasz:', response);
      if (!response.ok) throw new Error('A kapcsolatok lekérése sikertelen');
      const data = await response.json();
      console.log('Lekért adatok:', data);
      setContacts(data);
      
      // Csillagozott elemek betöltése a localStorage-ből
      const savedStarred = localStorage.getItem('starredContacts');
      if (savedStarred) {
        try {
          setStarredContacts(new Set(JSON.parse(savedStarred)));
        } catch (e) {
          console.error('Hiba a csillagozott kapcsolatok betöltésekor:', e);
        }
      }
    } catch (error) {
      console.error('Hiba a kapcsolatok lekérésekor:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

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

  // Szűrők kezelése
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      category: ''
    });
  };

  // Csillagozás kezelése
  const toggleStarred = (contactId) => {
    const newStarred = new Set(starredContacts);
    if (newStarred.has(contactId)) {
      newStarred.delete(contactId);
    } else {
      newStarred.add(contactId);
    }
    setStarredContacts(newStarred);
    
    // Mentés localStorage-be
    localStorage.setItem('starredContacts', JSON.stringify([...newStarred]));
  };

  // Kapcsolatok szűrése
  const filteredContacts = contacts.filter(contact => {
    const searchMatch = 
      !filters.search ||
      contact.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      contact.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      contact.message.toLowerCase().includes(filters.search.toLowerCase()) ||
      (contact.subject && contact.subject.toLowerCase().includes(filters.search.toLowerCase()));
    
    const statusMatch = !filters.status || contact.status === filters.status;
    const priorityMatch = !filters.priority || contact.priority === filters.priority;
    const categoryMatch = !filters.category || contact.category === filters.category;
    
    return searchMatch && statusMatch && priorityMatch && categoryMatch;
  });

  // Üzenet részleteinek megtekintése
  const handleViewMessage = async (contact) => {
    setSelectedContact(contact);
    setIsModalOpen(true);
    setResponseText(''); // Új üzenet megnyitásakor töröljük a válasz szöveget
    
    if (!contact.aiAnalysis) {
      await startAIAnalysis(contact.message);
    } else {
      // Ha már volt AI elemzés, használjuk azt
      setAiAnalysis({
        category: contact.category,
        priority: contact.priority,
        sentiment: contact.sentiment,
        summary: contact.summary,
        tags: contact.tags || [],
        suggestedResponse: contact.aiSuggestedResponse
      });
    }
  };

  // Kapcsolat frissítése
  const handleUpdate = async (id, updateData) => {
    try {
      const response = await api.put(`${API_URL}/contacts/${id}`, updateData);
      if (!response.ok) throw new Error('A kapcsolat frissítése sikertelen');
      
      // Frissítjük a helyi adatokat
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact._id === id ? { ...contact, ...updateData } : contact
        )
      );
      
      // Ha a kiválasztott kapcsolat frissült, azt is frissítjük
      if (selectedContact && selectedContact._id === id) {
        setSelectedContact(prev => ({ ...prev, ...updateData }));
      }
      
      return true;
    } catch (error) {
      console.error('Hiba a kapcsolat frissítésekor:', error);
      setError(error.message);
      return false;
    }
  };

  // Kapcsolat törlése
  const handleDelete = async (id) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a kapcsolatot?')) return;
    
    try {
      const response = await api.delete(`${API_URL}/contacts/${id}`);
      if (!response.ok) throw new Error('A kapcsolat törlése sikertelen');
      
      // Eltávolítjuk a helyi adatokból
      setContacts(prevContacts => prevContacts.filter(contact => contact._id !== id));
      
      // Ha a kiválasztott kapcsolatot töröltük, bezárjuk a modált
      if (selectedContact && selectedContact._id === id) {
        setIsModalOpen(false);
      }
      
      // Ha csillagozott volt, eltávolítjuk onnan is
      if (starredContacts.has(id)) {
        const newStarred = new Set(starredContacts);
        newStarred.delete(id);
        setStarredContacts(newStarred);
        localStorage.setItem('starredContacts', JSON.stringify([...newStarred]));
      }
    } catch (error) {
      console.error('Hiba a kapcsolat törlésekor:', error);
      setError(error.message);
    }
  };

  // Válasz küldése (szimulált)
  const handleSendResponse = async () => {
    if (!responseText.trim() || !selectedContact) {
      alert('Kérjük, írj be egy üzenetet a küldés előtt!');
      return;
    }
    
    setSendingResponse(true);
    
    try {
      // Szimulált válasz küldés
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Frissítjük a kapcsolat státuszát
      await handleUpdate(selectedContact._id, {
        status: 'in-progress',
        responseText,
        responseDate: new Date().toISOString()
      });
      
      alert('Válasz sikeresen elküldve!');
      setResponseText('');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Hiba a válasz küldésekor:', error);
      alert('Hiba történt a válasz küldésekor');
    } finally {
      setSendingResponse(false);
    }
  };

  // Színek
  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  };

  const statusColors = {
    'new': 'bg-blue-100 text-blue-800',
    'in-progress': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Kapcsolati üzenetek</h1>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchContacts}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Frissítés
            </button>
            
            <div className="flex border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 ${viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Táblázat
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 ${viewMode === 'cards' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Kártyák
              </button>
            </div>
          </div>
        </div>
        
        {/* Statisztikák */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white shadow-sm rounded-lg p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-500">Összes üzenet</div>
            <div className="text-2xl font-bold">{contacts.length}</div>
          </div>
          
          <div className="bg-white shadow-sm rounded-lg p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-500">Új üzenetek</div>
            <div className="text-2xl font-bold">{contacts.filter(c => c.status === 'new').length}</div>
          </div>
          
          <div className="bg-white shadow-sm rounded-lg p-4 border-l-4 border-yellow-500">
            <div className="text-sm text-gray-500">Folyamatban</div>
            <div className="text-2xl font-bold">{contacts.filter(c => c.status === 'in-progress').length}</div>
          </div>
          
          <div className="bg-white shadow-sm rounded-lg p-4 border-l-4 border-red-500">
            <div className="text-sm text-gray-500">Magas prioritású</div>
            <div className="text-2xl font-bold">{contacts.filter(c => c.priority === 'high').length}</div>
          </div>
        </div>
        
        <Filters 
          onFilterChange={handleFilterChange} 
          filters={filters}
          onResetFilters={resetFilters}
        />

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            <p>Hiba történt: {error}</p>
            <button 
              onClick={fetchContacts}
              className="mt-2 px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800"
            >
              Újrapróbálkozás
            </button>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-sm text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nincsenek megjeleníthető üzenetek</h3>
            <p className="mt-1 text-sm text-gray-500">
              {contacts.length === 0 
                ? 'Még nem érkeztek kapcsolati üzenetek.' 
                : 'Nincsenek a szűrési feltételeknek megfelelő üzenetek.'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          // Táblázat nézet
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleStarred(contact._id)}
                          className={`mr-2 ${starredContacts.has(contact._id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}
                        >
                          <svg className="h-5 w-5" fill={starredContacts.has(contact._id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                        {contact.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{contact.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${priorityColors[contact.priority || 'medium']}`}>
                        {contact.priority === 'high' ? 'Magas' : contact.priority === 'low' ? 'Alacsony' : 'Közepes'}
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
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewMessage(contact)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                          title="Megtekintés"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        <button 
                          onClick={() => handleDelete(contact._id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          title="Törlés"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Kártya nézet
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => (
              <div key={contact._id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start">
                    <button
                      onClick={() => toggleStarred(contact._id)}
                      className={`mr-2 ${starredContacts.has(contact._id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}
                    >
                      <svg className="h-5 w-5" fill={starredContacts.has(contact._id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                    <div>
                      <h3 className="font-medium">{contact.name}</h3>
                      <p className="text-sm text-gray-600">{contact.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${priorityColors[contact.priority || 'medium']}`}>
                    {contact.priority === 'high' ? 'Magas' : contact.priority === 'low' ? 'Alacsony' : 'Közepes'}
                  </span>
                </div>
                
                <div className="border-t border-b py-3 my-2">
                  <p className="text-sm text-gray-600 line-clamp-3">{contact.message}</p>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${statusColors[contact.status]}`}>
                      {contact.status === 'new' ? 'Új' : contact.status === 'in-progress' ? 'Folyamatban' : 'Befejezett'}
                      </span>
                    {contact.category && (
                      <span className="ml-2 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                        {contact.category}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewMessage(contact)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                      title="Megtekintés"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => handleDelete(contact._id)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                      title="Törlés"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                  <span>{new Date(contact.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Üzenet részletei Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          {selectedContact && (
            <div className="space-y-6">
              {/* Fejléc */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Üzenet részletei</h2>
                  <button 
                    onClick={() => toggleStarred(selectedContact._id)}
                    className={`ml-3 ${starredContacts.has(selectedContact._id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}
                  >
                    <svg className="h-5 w-5" fill={starredContacts.has(selectedContact._id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                </div>
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
                    <select
                      value={selectedContact.category || 'other'}
                      onChange={(e) => handleUpdate(selectedContact._id, { category: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="support">Támogatás</option>
                      <option value="inquiry">Érdeklődés</option>
                      <option value="feedback">Visszajelzés</option>
                      <option value="complaint">Panasz</option>
                      <option value="other">Egyéb</option>
                    </select>
                  </div>

                  {aiAnalysis && aiAnalysis.tags && aiAnalysis.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Címkék</h3>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {aiAnalysis.tags.map((tag, index) => (
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
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tárgy</h3>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {selectedContact.subject || 'Nincs tárgy'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Üzenet</h3>
                <div className="mt-1 bg-gray-50 p-4 rounded-md border text-gray-900 dark:text-white whitespace-pre-wrap">
                  {selectedContact.message}
                </div>
              </div>

              {/* Válasz szekció */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-2">Válasz</h3>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  rows={4}
                  placeholder="Írd be a választ..."
                ></textarea>
                
                {aiAnalysis && aiAnalysis.suggestedResponse && (
                  <div className="mt-2">
                    <button
                      onClick={() => setResponseText(aiAnalysis.suggestedResponse)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      AI által javasolt válasz használata
                    </button>
                  </div>
                )}
                
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleSendResponse}
                    disabled={!responseText.trim() || sendingResponse}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    {sendingResponse ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Küldés...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Válasz küldése
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* AI elemzés rész */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">AI elemzés</h3>
                  <button
                    onClick={() => startAIAnalysis(selectedContact.message)}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 flex items-center"
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Elemzés...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Elemzés frissítése
                      </>
                    )}
                  </button>
                </div>

                {analyzing ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
                  </div>
                ) : aiAnalysis ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-md border">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Hangulatelemzés</h4>
                      <p className={`capitalize ${
                        aiAnalysis.sentiment === 'positive' ? 'text-green-600' :
                        aiAnalysis.sentiment === 'negative' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {aiAnalysis.sentiment === 'positive' ? 'Pozitív' : 
                         aiAnalysis.sentiment === 'negative' ? 'Negatív' : 'Semleges'}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md border">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Javasolt kategória</h4>
                      <p className="font-medium">
                        {aiAnalysis.category === 'support' ? 'Támogatás' :
                         aiAnalysis.category === 'inquiry' ? 'Érdeklődés' :
                         aiAnalysis.category === 'feedback' ? 'Visszajelzés' :
                         aiAnalysis.category === 'complaint' ? 'Panasz' : 'Egyéb'}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md border col-span-2">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Összefoglaló</h4>
                      <p className="mt-1">{aiAnalysis.summary}</p>
                    </div>

                    <div className="col-span-2 bg-gray-50 p-4 rounded-md border">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Javasolt válasz</h4>
                      <p className="whitespace-pre-wrap">{aiAnalysis.suggestedResponse}</p>
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(aiAnalysis.suggestedResponse);
                          }}
                          className="text-sm text-blue-500 hover:text-blue-700 flex items-center"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Másolás
                        </button>
                        <button
                          onClick={() => setResponseText(aiAnalysis.suggestedResponse)}
                          className="ml-3 text-sm text-blue-500 hover:text-blue-700 flex items-center"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Használat válaszként
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Kattints az "Elemzés frissítése" gombra az AI elemzés elindításához.</p>
                  </div>
                )}
              </div>

              {/* Előzmények (ha van) */}
              {selectedContact.responseText && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-3">Előzmények</h3>
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-blue-700">Válasz üzenet</h4>
                      <span className="text-xs text-gray-500">
                        {selectedContact.responseDate ? new Date(selectedContact.responseDate).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedContact.responseText}</p>
                  </div>
                </div>
              )}

              {/* Művelet gombok */}
              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  onClick={() => handleDelete(selectedContact._id)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded flex items-center"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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
    </div>
  );
};

export default ContactAdmin;