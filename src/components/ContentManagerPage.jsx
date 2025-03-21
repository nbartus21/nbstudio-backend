import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';
import { 
  FileText, 
  RefreshCw,
  Edit, 
  Check,
  Lock,
  Shield,
  Cookie,
  Info,
  AlertTriangle
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

const ContentManagerPage = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState({
    total: 4,
    lastUpdated: null
  });

  useEffect(() => {
    // Kezdeti betöltéskor inicializáljuk az oldalakat
    fetchPages();
  }, []);
  
  // Oldalak létrehozása, ha nincsenek az adatbázisban
  const createDefaultPages = async () => {
    try {
      console.log("Oldalak létrehozása kezdeményezve...");
      const slugs = ['terms', 'privacy', 'cookies', 'imprint'];
      
      for (const slug of slugs) {
        try {
          // PUT kérés üres tartalommal, ami kiváltja az alapértelmezett tartalmak létrehozását
          await api.put(`${API_URL}/content-pages/${slug}`, {
            content: {}
          });
          console.log(`${slug} oldal létrehozva`);
        } catch (err) {
          console.error(`Hiba a ${slug} oldal létrehozásakor:`, err);
        }
      }
      
      // Újra lekérjük az oldalakat
      await fetchPages();
    } catch (error) {
      console.error("Hiba az oldalak létrehozásakor:", error);
    }
  };

  useEffect(() => {
    if (pages.length > 0) {
      const sortedPages = [...pages].sort((a, b) => 
        new Date(b.lastUpdated) - new Date(a.lastUpdated)
      );
      
      setStats({
        total: pages.length,
        lastUpdated: sortedPages[0]?.lastUpdated || null
      });
    }
  }, [pages]);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/content-pages`);
      const data = await response.json();
      
      console.log('API válasz:', data);
      
      if (!data || !Array.isArray(data)) {
        console.error('Nem megfelelő API válasz formátum:', data);
        setError('A szervertől érkező válasz nem megfelelő formátumú');
        setPages([]);
      } else {
        // Parse Map structure to objects
        const processedPages = data.map(page => ({
          ...page,
          content: page.content instanceof Map 
            ? Object.fromEntries(page.content) 
            : page.content
        }));
        setPages(processedPages);
      }
    } catch (error) {
      console.error('Error fetching content pages:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSavePage = async (e) => {
    e.preventDefault();
    
    try {
      await api.put(`${API_URL}/content-pages/${selectedPage.slug}`, {
        content: selectedPage.content
      });
      
      await fetchPages();
      setShowModal(false);
      setSelectedPage(null);
    } catch (error) {
      console.error('Hiba:', error);
      setError('Nem sikerült menteni az oldalt. Kérjük, próbáld újra később.');
    }
  };

  // Get icon for page type
  const getPageIcon = (slug) => {
    switch (slug) {
      case 'terms':
        return <FileText className="h-6 w-6 text-blue-600" />;
      case 'privacy':
        return <Shield className="h-6 w-6 text-green-600" />;
      case 'cookies':
        return <Cookie className="h-6 w-6 text-orange-600" />;
      case 'imprint':
        return <Info className="h-6 w-6 text-purple-600" />;
      default:
        return <FileText className="h-6 w-6 text-gray-600" />;
    }
  };

  // Get title for page type
  const getPageTitle = (slug) => {
    switch (slug) {
      case 'terms':
        return 'Általános Szerződési Feltételek';
      case 'privacy':
        return 'Adatvédelmi Szabályzat';
      case 'cookies':
        return 'Cookie Szabályzat';
      case 'imprint':
        return 'Impresszum';
      default:
        return slug;
    }
  };

  // Get all content sections for a page
  const getPageSections = (slug) => {
    switch (slug) {
      case 'terms':
        return [
          { key: 'seo.title', label: 'SEO Cím', type: 'text' },
          { key: 'seo.description', label: 'SEO Leírás', type: 'text' },
          { key: 'title', label: 'Cím', type: 'text' },
          { key: 'general.title', label: 'Általános szekció címe', type: 'text' },
          { key: 'general.content', label: 'Általános szekció tartalma', type: 'textarea' },
          { key: 'usage.title', label: 'Használat szekció címe', type: 'text' },
          { key: 'usage.content', label: 'Használat szekció tartalma', type: 'textarea' },
          { key: 'liability.title', label: 'Felelősség szekció címe', type: 'text' },
          { key: 'liability.content', label: 'Felelősség szekció tartalma', type: 'textarea' },
          { key: 'changes.title', label: 'Változtatások szekció címe', type: 'text' },
          { key: 'changes.content', label: 'Változtatások szekció tartalma', type: 'textarea' },
          { key: 'contact.title', label: 'Kapcsolat szekció címe', type: 'text' },
          { key: 'contact.name', label: 'Név címke', type: 'text' },
          { key: 'contact.email', label: 'Email címke', type: 'text' }
        ];
      case 'privacy':
        return [
          { key: 'seo.title', label: 'SEO Cím', type: 'text' },
          { key: 'seo.description', label: 'SEO Leírás', type: 'text' },
          { key: 'title', label: 'Cím', type: 'text' },
          { key: 'general.title', label: 'Általános szekció címe', type: 'text' },
          { key: 'general.content', label: 'Általános szekció tartalma', type: 'textarea' },
          { key: 'data.title', label: 'Adatok szekció címe', type: 'text' },
          { key: 'data.item1', label: 'Adat elem 1', type: 'text' },
          { key: 'data.item2', label: 'Adat elem 2', type: 'text' },
          { key: 'data.item3', label: 'Adat elem 3', type: 'text' },
          { key: 'data.item4', label: 'Adat elem 4', type: 'text' },
          { key: 'cookies.title', label: 'Cookie-k szekció címe', type: 'text' },
          { key: 'cookies.content', label: 'Cookie-k szekció tartalma', type: 'textarea' },
          { key: 'rights.title', label: 'Jogok szekció címe', type: 'text' },
          { key: 'rights.item1', label: 'Jog elem 1', type: 'text' },
          { key: 'rights.item2', label: 'Jog elem 2', type: 'text' },
          { key: 'rights.item3', label: 'Jog elem 3', type: 'text' },
          { key: 'rights.item4', label: 'Jog elem 4', type: 'text' },
          { key: 'rights.item5', label: 'Jog elem 5', type: 'text' },
          { key: 'contact.title', label: 'Kapcsolat szekció címe', type: 'text' },
          { key: 'contact.name', label: 'Név címke', type: 'text' },
          { key: 'contact.email', label: 'Email címke', type: 'text' }
        ];
      case 'cookies':
        return [
          { key: 'seo.title', label: 'SEO Cím', type: 'text' },
          { key: 'seo.description', label: 'SEO Leírás', type: 'text' },
          { key: 'title', label: 'Cím', type: 'text' },
          { key: 'general.title', label: 'Általános szekció címe', type: 'text' },
          { key: 'general.content', label: 'Általános szekció tartalma', type: 'textarea' },
          { key: 'types.title', label: 'Cookie típusok szekció címe', type: 'text' },
          { key: 'types.item1', label: 'Cookie típus 1', type: 'text' },
          { key: 'types.item2', label: 'Cookie típus 2', type: 'text' },
          { key: 'types.item3', label: 'Cookie típus 3', type: 'text' },
          { key: 'management.title', label: 'Kezelés szekció címe', type: 'text' },
          { key: 'management.content', label: 'Kezelés szekció tartalma', type: 'textarea' },
          { key: 'contact.title', label: 'Kapcsolat szekció címe', type: 'text' },
          { key: 'contact.name', label: 'Név címke', type: 'text' },
          { key: 'contact.email', label: 'Email címke', type: 'text' }
        ];
      case 'imprint':
        return [
          { key: 'seo.title', label: 'SEO Cím', type: 'text' },
          { key: 'seo.description', label: 'SEO Leírás', type: 'text' },
          { key: 'title', label: 'Cím', type: 'text' },
          { key: 'company.title', label: 'Cég szekció címe', type: 'text' },
          { key: 'contact.title', label: 'Kapcsolat szekció címe', type: 'text' },
          { key: 'contact.phone', label: 'Telefon címke', type: 'text' },
          { key: 'contact.email', label: 'Email címke', type: 'text' },
          { key: 'registration.title', label: 'Regisztráció szekció címe', type: 'text' },
          { key: 'registration.vatId', label: 'Adószám címke', type: 'text' },
          { key: 'responsibility.title', label: 'Felelősség szekció címe', type: 'text' },
          { key: 'responsibility.content', label: 'Felelősség szekció tartalma', type: 'textarea' },
          { key: 'disclaimer.title', label: 'Jogi nyilatkozat szekció címe', type: 'text' },
          { key: 'disclaimer.content', label: 'Jogi nyilatkozat szekció tartalma', type: 'textarea' }
        ];
      default:
        return [];
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Jogi Oldalak Kezelése</h1>
            <p className="text-gray-500 mt-1">Szerkeszd a weboldal jogi oldalainak tartalmát</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={fetchPages}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Frissítés
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Kezelt oldalak száma</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Utolsó frissítés</p>
                <p className="text-2xl font-bold">
                  {stats.lastUpdated 
                    ? new Date(stats.lastUpdated).toLocaleDateString('hu-HU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Nincs adat'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Pages List */}
        <div className="space-y-4">
          {pages.map(page => (
            <Card key={page.slug} className="p-0 overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="flex-grow p-4">
                  <h2 className="text-xl font-semibold hover:text-blue-700 cursor-pointer" onClick={() => {
                    setSelectedPage(page);
                    setShowModal(true);
                  }}>
                    {page.content.title || getPageTitle(page.slug)}
                  </h2>
                  
                  <div className="flex mt-2 space-x-4 text-sm">
                    <div className="flex items-center text-gray-500">
                      <span className="font-medium mr-1">Utolsó frissítés:</span>
                      <span>
                        {new Date(page.lastUpdated).toLocaleDateString('hu-HU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
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
                    
                    <a 
                      href={`/pages/${page.slug}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800 text-sm font-medium py-1 px-2 rounded hover:bg-green-50"
                    >
                      <FileText className="h-4 w-4 inline mr-1" />
                      Megtekintés
                    </a>
                  </div>
                </div>
                
                <div className="flex-shrink-0 flex items-center px-4 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-200">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                    {getPageIcon(page.slug)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          
          {pages.length === 0 && (
            <div className="text-center p-8 bg-white rounded-lg shadow">
              <div className="text-gray-400 mb-2">
                <AlertTriangle className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nincs találat</h3>
              <p className="text-gray-500">
                Nem található egyetlen jogi oldal sem az adatbázisban.
              </p>
              <button
                onClick={createDefaultPages}
                className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Oldalak létrehozása
              </button>
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
                    {`${getPageTitle(selectedPage.slug)} szerkesztése`}
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

                {/* Content sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {getPageSections(selectedPage.slug).map(({ key, label, type }) => (
                    <div key={key} className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={key}>
                        {label}
                      </label>
                      
                      {type === 'textarea' ? (
                        <textarea
                          id={key}
                          value={selectedPage.content[key] || ''}
                          onChange={(e) => setSelectedPage({
                            ...selectedPage,
                            content: {
                              ...selectedPage.content,
                              [key]: e.target.value
                            }
                          })}
                          rows="4"
                          className="w-full p-2 border rounded-lg text-gray-900"
                        />
                      ) : (
                        <input
                          type="text"
                          id={key}
                          value={selectedPage.content[key] || ''}
                          onChange={(e) => setSelectedPage({
                            ...selectedPage,
                            content: {
                              ...selectedPage.content,
                              [key]: e.target.value
                            }
                          })}
                          className="w-full p-2 border rounded-lg text-gray-900"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Submit buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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

export default ContentManagerPage;