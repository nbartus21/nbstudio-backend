import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';
import { Editor } from '@tinymce/tinymce-react';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Check, 
  RefreshCw,
  Globe,
  ExternalLink
} from 'lucide-react';

const API_URL = 'https://admin.nb-studio.net:5001/api';

// Card component
const Card = ({ children, className = "" }) => {
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {children}
    </div>
  );
};

const WebPagesAdmin = () => {
  const [webPages, setWebPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState('de');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0
  });

  useEffect(() => {
    fetchWebPages();
  }, []);

  useEffect(() => {
    if (webPages.length > 0) {
      setStats({
        total: webPages.length,
        active: webPages.filter(page => page.active).length
      });
    }
  }, [webPages]);

  const fetchWebPages = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/webpages`);
      const data = await response.json();
      
      console.log('API válasz:', data);
      
      if (!data || !Array.isArray(data)) {
        console.error('Nem megfelelő API válasz formátum:', data);
        setError('A szervertől érkező válasz nem megfelelő formátumú');
        setWebPages([]);
      } else {
        setWebPages(data);
      }
    } catch (error) {
      console.error('Error fetching web pages:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt az oldalt?')) return;
    
    try {
      await api.delete(`${API_URL}/webpages/${id}`);
      await fetchWebPages();
    } catch (error) {
      console.error('Hiba:', error);
      setError('Nem sikerült törölni az oldalt. Kérjük, próbáld újra később.');
    }
  };

  const handleSavePage = async (e) => {
    e.preventDefault();
    
    try {
      if (selectedPage._id) {
        await api.put(`${API_URL}/webpages/${selectedPage._id}`, selectedPage);
      } else {
        await api.post(`${API_URL}/webpages`, selectedPage);
      }
      
      await fetchWebPages();
      setShowModal(false);
      setSelectedPage(null);
    } catch (error) {
      console.error('Hiba:', error);
      setError('Nem sikerült menteni az oldalt. Kérjük, próbáld újra később.');
    }
  };

  const handleToggleActive = async (page) => {
    try {
      const updatedPage = { ...page, active: !page.active };
      await api.put(`${API_URL}/webpages/${page._id}`, updatedPage);
      await fetchWebPages();
    } catch (error) {
      console.error('Hiba:', error);
      setError('Nem sikerült frissíteni az oldal állapotát. Kérjük, próbáld újra később.');
    }
  };

  // Filter pages
  const filteredPages = webPages.filter(page => {
    // Search filter
    const titleMatch = page.title?.de?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    page.title?.en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    page.title?.hu?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    page.identifier?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return titleMatch;
  });

  // Sort pages alphabetically
  const sortedPages = [...filteredPages].sort((a, b) => {
    return a.identifier?.localeCompare(b.identifier) || 0;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Oldalak Kezelése</h1>
            <p className="text-gray-500 mt-1">Hozz létre, szerkeszt és kezelj oldaltartalmakat</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={fetchWebPages}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Frissítés
            </button>
            
            <button
              onClick={() => {
                setSelectedPage({
                  identifier: '',
                  title: { de: '', en: '', hu: '' },
                  content: { de: '', en: '', hu: '' },
                  active: true
                });
                setShowModal(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Új oldal
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Összes oldal</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Aktív oldalak</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Oldalak keresése..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>
        </Card>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Web Pages List */}
        <div className="space-y-4">
          {sortedPages.map(page => (
            <Card key={page._id} className="p-0 overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="flex-grow p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        page.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {page.active ? 'Aktív' : 'Inaktív'}
                    </span>
                  </div>
                  
                  <h2 className="text-xl font-semibold hover:text-blue-700 cursor-pointer" onClick={() => {
                    setSelectedPage(page);
                    setShowModal(true);
                  }}>
                    {page.title?.[activeLanguage] || 'Nincs cím'}
                  </h2>
                  
                  <div className="flex mt-2 space-x-4 text-sm">
                    <div className="flex items-center text-gray-500">
                      <span className="font-medium mr-1">Azonosító:</span>
                      <span className="text-gray-600">{page.identifier}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedPage(page);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium py-1 px-2 rounded hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4 inline mr-1" />
                      Szerkesztés
                    </button>
                    
                    <button 
                      onClick={() => handleToggleActive(page)}
                      className={`text-sm font-medium py-1 px-2 rounded ${
                        page.active 
                          ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50' 
                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                      }`}
                    >
                      {page.active ? 'Deaktiválás' : 'Aktiválás'}
                    </button>
                    
                    <button 
                      onClick={() => handleDelete(page._id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium py-1 px-2 rounded hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 inline mr-1" />
                      Törlés
                    </button>
                  </div>
                </div>
                
                {/* Language tabs */}
                <div className="flex md:flex-col p-4 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-200">
                  {['de', 'en', 'hu'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => setActiveLanguage(lang)}
                      className={`px-3 py-1 text-sm rounded-md ${
                        activeLanguage === lang
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          ))}
          
          {sortedPages.length === 0 && (
            <div className="text-center p-8 bg-white rounded-lg shadow">
              <div className="text-gray-400 mb-2">
                <Globe className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nincs találat</h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? 'Próbáld meg módosítani a keresést'
                  : 'Hozz létre egy új oldalt'
                }
              </p>
              {!searchQuery && (
                <button
                  onClick={() => {
                    setSelectedPage({
                      identifier: '',
                      title: { de: '', en: '', hu: '' },
                      content: { de: '', en: '', hu: '' },
                      active: true
                    });
                    setShowModal(true);
                  }}
                  className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Új oldal
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showModal && selectedPage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-white rounded-lg w-full max-w-4xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSavePage}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    {selectedPage._id ? 'Oldal szerkesztése' : 'Új oldal létrehozása'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Bezárás</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Identifier */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1" htmlFor="identifier">
                    Oldal azonosító (URL-ben használva)
                  </label>
                  <input
                    type="text"
                    id="identifier"
                    value={selectedPage.identifier || ''}
                    onChange={(e) => setSelectedPage({
                      ...selectedPage,
                      identifier: e.target.value
                    })}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Egyedi azonosító, ami az oldal URL-jében fog megjelenni (pl. "about-us")
                  </p>
                </div>

                {/* Language Tabs */}
                <div className="border-b border-gray-200 mb-4">
                  <nav className="-mb-px flex space-x-4">
                    {['de', 'en', 'hu'].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setActiveLanguage(lang)}
                        className={`${
                          activeLanguage === lang
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Title input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1" htmlFor="title">
                    Cím ({activeLanguage.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={selectedPage.title?.[activeLanguage] || ''}
                    onChange={(e) => setSelectedPage({
                      ...selectedPage,
                      title: {
                        ...selectedPage.title,
                        [activeLanguage]: e.target.value
                      }
                    })}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>

                {/* Content */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Tartalom ({activeLanguage.toUpperCase()})
                  </label>
                  <Editor
                    apiKey="kshcdddb1ogetllqn5eoqe0xny2tf1hhr9xf4e69hrdmy667"
                    value={selectedPage.content?.[activeLanguage] || ''}
                    init={{
                      height: 400,
                      menubar: false,
                      plugins: 'link image code table lists',
                      toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent | link image | code'
                    }}
                    onEditorChange={(content) => setSelectedPage({
                      ...selectedPage,
                      content: {
                        ...selectedPage.content,
                        [activeLanguage]: content
                      }
                    })}
                  />
                </div>

                {/* Active setting */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="active"
                      checked={selectedPage.active || false}
                      onChange={(e) => setSelectedPage({
                        ...selectedPage,
                        active: e.target.checked
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                      Oldal megjelenítése a weboldalon
                    </label>
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Mentés
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebPagesAdmin;