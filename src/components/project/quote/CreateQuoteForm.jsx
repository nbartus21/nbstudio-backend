import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Save, Send, Search, Bug, AlertTriangle } from 'lucide-react';

// ======= DEBUG MÓD =======
// Ez a komponens az eredeti verzió részletes debugging funkcionalitással kiegészítve
// Az összes API hívás és minden lépés naplózva van

const CreateQuoteForm = ({ client, project: initialProject, onClose, onSuccess }) => {
  // Alap állapotok
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState(initialProject || null);
  
  // Debug állapotok
  const [debugMode, setDebugMode] = useState(true);
  const [debugLogs, setDebugLogs] = useState([]);
  const [apiKey, setApiKey] = useState(
    localStorage.getItem('debug_api_key') || 
    'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
  );
  const [baseUrl, setBaseUrl] = useState(
    localStorage.getItem('debug_base_url') || 
    ''  // Üres string a relatív útvonalakhoz
  );

  // Ensure client object has the expected structure with default values
  const initialClient = {
    name: '',
    email: '',
    phone: '',
    companyName: '',
    taxNumber: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'Magyarország'
    }
  };

  // DEBUG: Log hozzáadása
  const addLog = (message, type = 'info', data = null) => {
    if (!debugMode) return;
    
    const log = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      message,
      type,
      data
    };
    
    console.log(`[${log.type.toUpperCase()}] ${log.message}`, log.data);
    setDebugLogs(prev => [log, ...prev].slice(0, 100));
  };

  // DEBUG: API kulcs mentése
  useEffect(() => {
    localStorage.setItem('debug_api_key', apiKey);
  }, [apiKey]);

  // DEBUG: Base URL mentése
  useEffect(() => {
    localStorage.setItem('debug_base_url', baseUrl);
  }, [baseUrl]);

  // Safely merge provided client with default structure
  const mergeClientData = (providedClient) => {
    if (!providedClient) return initialClient;
    
    return {
      name: providedClient.name || '',
      email: providedClient.email || '',
      phone: providedClient.phone || '',
      companyName: providedClient.companyName || '',
      taxNumber: providedClient.taxNumber || '',
      address: {
        street: providedClient.address?.street || '',
        city: providedClient.address?.city || '',
        postalCode: providedClient.address?.postalCode || '',
        country: providedClient.address?.country || 'Magyarország'
      }
    };
  };

  // Get headers with JWT token
  const getAuthHeaders = () => {
    // Alap headers minden kéréshez
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    };
    
    // Ha van JWT token, azt is hozzáadjuk
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    addLog('Auth headers előkészítve', 'debug', headers);
    return headers;
  };

  // Get currency from selected project or default to EUR
  const getCurrency = () => {
    return selectedProject?.financial?.currency || 'EUR';
  };

  // Initialize state once
  const [quoteData, setQuoteData] = useState({
    client: mergeClientData(client),
    items: [
      { description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }
    ],
    vat: 27,
    subtotal: 0,
    totalAmount: 0,
    paymentTerms: 'Fizetés 8 napon belül banki átutalással',
    notes: 'Az árajánlat 30 napig érvényes.',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    projectId: initialProject?._id || null
  });

  // DEBUG: Manuális projekt lekérés
  const manualFetchProjects = async (endpoint) => {
    setLoadingProjects(true);
    setError(null);
    
    const url = `${baseUrl}${endpoint}`;
    addLog(`Manuális projekt lekérés: ${url}`, 'debug');
    
    try {
      const headers = getAuthHeaders();
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      addLog(`Válasz státusz: ${response.status}`, response.ok ? 'success' : 'error');
      
      if (!response.ok) {
        const errorText = await response.text();
        addLog(`API hiba: ${errorText}`, 'error');
        throw new Error(`Nem sikerült lekérni a projekteket: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      addLog(`${data.length} projekt betöltve`, 'success', data);
      setProjects(data || []);
      setError(null);
    } catch (error) {
      addLog(`Hiba a projektek lekérésekor: ${error.message}`, 'error');
      setError(`Hiba a projektek lekérésekor: ${error.message}`);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      setError(null);
      
      addLog('Projektek lekérése', 'info');
      
      const endpointsToTry = [
        { url: '/api/projects', name: 'Védett API' },
        { url: '/api/public/projects', name: 'Publikus API' }
      ];
      
      for (const endpoint of endpointsToTry) {
        try {
          const url = `${baseUrl}${endpoint.url}`;
          addLog(`Próbálkozás: ${endpoint.name} (${url})`, 'debug');
          
          const headers = getAuthHeaders();
          
          addLog('Kérés indítása...', 'debug', { url, headers });
          const response = await fetch(url, {
            method: 'GET',
            headers
          });
          
          addLog(`Válasz státusz: ${response.status}`, response.ok ? 'success' : 'warning');
          
          if (!response.ok) {
            const errorText = await response.text();
            addLog(`${endpoint.name} hiba: ${errorText}`, 'warning');
            continue; // Próbáljuk a következő végpontot
          }
          
          const data = await response.json();
          addLog(`${data.length} projekt betöltve a(z) ${endpoint.name} végpontról`, 'success');
          setProjects(data || []);
          setLoadingProjects(false);
          return; // Sikeres lekérés, kilépés
        } catch (error) {
          addLog(`Hiba a(z) ${endpoint.name} végponttal: ${error.message}`, 'error');
          // Folytatjuk a következő végponttal
        }
      }
      
      // Ha idáig eljutottunk, akkor egyik végpont sem működött
      addLog('Egyik végpont sem működött', 'error');
      setError('Nem sikerült betölteni a projekteket. Próbálja meg manuálisan a gombokkal.');
      setLoadingProjects(false);
    };

    if (debugMode) {
      addLog('Automatikus lekérés debug módban kikapcsolva', 'info');
      // Debug módban nem töltjük be automatikusan
    } else {
      fetchProjects();
    }
  }, [baseUrl, debugMode]);

  // Ha nincs kezdeti projekt, de van kiválasztott, akkor frissítsük a quoteData-t
  useEffect(() => {
    if (selectedProject && selectedProject._id !== quoteData.projectId) {
      addLog(`Projekt kiválasztva: ${selectedProject.name}`, 'info');
      setQuoteData(prev => ({
        ...prev,
        projectId: selectedProject._id
      }));
    }
  }, [selectedProject, quoteData.projectId]);

  // Projekt kiválasztása
  const handleProjectSelect = (e) => {
    const projectId = e.target.value;
    
    if (!projectId || projectId === "null") {
      addLog('Projekt kiválasztás törölve', 'info');
      setSelectedProject(null);
      setQuoteData(prev => ({
        ...prev,
        projectId: null
      }));
      return;
    }

    const selected = projects.find(p => p._id === projectId);
    addLog(`Projekt kiválasztva: ${selected?.name || projectId}`, 'info');
    setSelectedProject(selected || null);
    
    // Ha van ügyfél adat a projektben, használjuk azt
    if (selected && selected.client) {
      addLog('Ügyfél adatok átvéve a projektből', 'info');
      setQuoteData(prev => ({
        ...prev,
        projectId: selected._id,
        client: mergeClientData(selected.client)
      }));
    } else {
      setQuoteData(prev => ({
        ...prev,
        projectId: selected?._id || null
      }));
    }
  };

  // Memoize the calculation function to prevent recreating it on each render
  const calculateTotals = useCallback(() => {
    if (!Array.isArray(quoteData.items) || quoteData.items.length === 0) {
      return {
        items: quoteData.items || [],
        subtotal: 0,
        totalAmount: 0
      };
    }

    // Create new items array with calculated totals
    const items = quoteData.items.map(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      const discountMultiplier = 1 - discount / 100;
      const total = quantity * unitPrice * discountMultiplier;
      
      return { 
        ...item, 
        quantity, 
        unitPrice, 
        discount, 
        total 
      };
    });

    // Calculate subtotal and total
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const vat = parseFloat(quoteData.vat) || 0;
    const totalAmount = subtotal * (1 + vat / 100);

    return { items, subtotal, totalAmount };
  }, [quoteData.items, quoteData.vat]);

  // Process calculations without infinite update loop
  useEffect(() => {
    const { items, subtotal, totalAmount } = calculateTotals();
    
    // Only update if values actually changed to prevent infinite loop
    if (
      JSON.stringify(items) !== JSON.stringify(quoteData.items) ||
      subtotal !== quoteData.subtotal ||
      totalAmount !== quoteData.totalAmount
    ) {
      setQuoteData(prev => ({
        ...prev,
        items,
        subtotal,
        totalAmount
      }));
    }
  }, [calculateTotals, quoteData.items, quoteData.subtotal, quoteData.totalAmount]);

  // Új tétel hozzáadása
  const handleAddItem = () => {
    addLog('Új tétel hozzáadása', 'info');
    setQuoteData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]
    }));
  };

  // Tétel törlése
  const handleRemoveItem = (index) => {
    if (quoteData.items.length === 1) {
      addLog('Nem lehet az utolsó tételt törölni', 'warning');
      return; // Legalább egy tételt meg kell hagyni
    }
    
    addLog(`Tétel törlése: #${index + 1}`, 'info');
    setQuoteData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Tétel adatainak módosítása
  const handleItemChange = (index, field, value) => {
    setQuoteData(prev => {
      const newItems = [...prev.items];
      if (newItems[index]) {
        newItems[index] = { ...newItems[index], [field]: value };
      }
      return { ...prev, items: newItems };
    });
  };

  // Ügyfél adatainak módosítása
  const handleClientChange = (field, value) => {
    setQuoteData(prev => ({
      ...prev,
      client: { ...prev.client, [field]: value }
    }));
  };

  // Ügyfél címadatainak módosítása
  const handleAddressChange = (field, value) => {
    setQuoteData(prev => ({
      ...prev,
      client: { 
        ...prev.client, 
        address: { 
          ...(prev.client.address || {}), // Ensure address exists
          [field]: value 
        }
      }
    }));
  };

  // Általános adatok módosítása
  const handleChange = (field, value) => {
    setQuoteData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // DEBUG: Manuális árajánlat küldés
  const manualSubmitQuote = async (endpoint, isDraft = false) => {
    setLoading(true);
    setError(null);

    const url = `${baseUrl}${endpoint}`;
    addLog(`Manuális árajánlat küldés: ${url}`, 'debug');
    
    try {
      // Hiányzó adatok ellenőrzése
      if (!quoteData.client.name || !quoteData.client.email) {
        throw new Error('Az ügyfél neve és e-mail címe kötelező!');
      }

      if (quoteData.items.some(item => !item.description || parseFloat(item.quantity) <= 0)) {
        throw new Error('Minden tételnél adjon meg leírást és pozitív mennyiséget!');
      }

      // Ensure client address is properly structured
      const clientData = {
        ...quoteData.client,
        address: quoteData.client.address || {
          street: '',
          city: '',
          postalCode: '',
          country: 'Magyarország'
        }
      };

      // Árajánlat státusz beállítása
      const status = isDraft ? 'piszkozat' : 'elküldve';
      const dataToSend = {
        ...quoteData,
        client: clientData,
        status
      };

      const headers = getAuthHeaders();
      addLog('Kérés indítása...', 'debug', { 
        url, 
        method: 'POST',
        headers,
        body: JSON.stringify(dataToSend)
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(dataToSend)
      });
      
      addLog(`Válasz státusz: ${response.status}`, response.ok ? 'success' : 'error');
      
      if (!response.ok) {
        const errorText = await response.text();
        addLog(`API hiba: ${errorText}`, 'error');
        throw new Error(`Nem sikerült létrehozni az árajánlatot: ${response.status} - ${errorText}`);
      }
      
      const responseData = await response.json();
      addLog('Árajánlat sikeresen létrehozva', 'success', responseData);
      
      if (onSuccess) {
        onSuccess(responseData);
      }
      
      setLoading(false);
      onClose();
    } catch (error) {
      addLog(`Hiba az árajánlat mentésekor: ${error.message}`, 'error');
      setError(error.message);
      setLoading(false);
    }
  };

  // Árajánlat mentése és elküldése
  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    
    if (debugMode) {
      addLog('Figyelem: Debug módban a Mentés/Küldés gomb nem indít automatikus kérést. Használja a manuális gombok egyikét.', 'warning');
      setError('Debug módban kérjük használja a manuális küldés gombok egyikét!');
      return;
    }
    
    setLoading(true);
    setError(null);
    addLog(`Árajánlat ${isDraft ? 'piszkozatként mentése' : 'küldése'}`, 'info');

    try {
      // Hiányzó adatok ellenőrzése
      if (!quoteData.client.name || !quoteData.client.email) {
        throw new Error('Az ügyfél neve és e-mail címe kötelező!');
      }

      if (quoteData.items.some(item => !item.description || parseFloat(item.quantity) <= 0)) {
        throw new Error('Minden tételnél adjon meg leírást és pozitív mennyiséget!');
      }

      // Ensure client address is properly structured
      const clientData = {
        ...quoteData.client,
        address: quoteData.client.address || {
          street: '',
          city: '',
          postalCode: '',
          country: 'Magyarország'
        }
      };

      // Árajánlat státusz beállítása
      const status = isDraft ? 'piszkozat' : 'elküldve';
      const dataToSend = {
        ...quoteData,
        client: clientData,
        status
      };

      // Try different API endpoints with different auth methods
      const endpointsToTry = quoteData.projectId 
        ? [
            { url: `/api/projects/${quoteData.projectId}/quotes`, name: 'Projekt védett API' },
            { url: `/api/public/projects/${quoteData.projectId}/quotes`, name: 'Projekt publikus API' }
          ]
        : [
            { url: '/api/quotes', name: 'Védett API' },
            { url: '/api/public/quotes', name: 'Publikus API' }
          ];
          
      let success = false;
      let responseData = null;

      for (const endpoint of endpointsToTry) {
        try {
          const url = `${baseUrl}${endpoint.url}`;
          addLog(`Próbálkozás: ${endpoint.name} (${url})`, 'debug');
          
          const headers = getAuthHeaders();
          
          addLog('Kérés indítása...', 'debug', { 
            url, 
            method: 'POST',
            headers,
            body: JSON.stringify(dataToSend)
          });
          
          const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(dataToSend)
          });
          
          addLog(`Válasz státusz: ${response.status}`, response.ok ? 'success' : 'warning');
          
          if (!response.ok) {
            const errorText = await response.text();
            addLog(`${endpoint.name} hiba: ${errorText}`, 'warning');
            continue; // Próbáljuk a következő végpontot
          }
          
          responseData = await response.json();
          addLog(`Árajánlat sikeresen létrehozva a(z) ${endpoint.name} végponton`, 'success', responseData);
          success = true;
          break; // Sikeres küldés, kilépés
        } catch (error) {
          addLog(`Hiba a(z) ${endpoint.name} végponttal: ${error.message}`, 'error');
          // Folytatjuk a következő végponttal
        }
      }
      
      if (!success) {
        throw new Error('Nem sikerült létrehozni az árajánlatot egyik végponton sem. Próbálja meg manuálisan, vagy ellenőrizze a kapcsolatot.');
      }

      if (onSuccess && responseData) {
        onSuccess(responseData);
      }
      
      setLoading(false);
      onClose();
    } catch (error) {
      addLog(`Hiba az árajánlat mentésekor: ${error.message}`, 'error');
      setError(error.message);
      setLoading(false);
    }
  };

  // Pénzformátum segédfüggvény
  const formatCurrency = (amount) => {
    const currency = getCurrency();
    return `${amount.toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
  };

  // Projekt keresés
  const [projectSearch, setProjectSearch] = useState('');
  const filteredProjects = projectSearch
    ? projects.filter(p => 
        p.name?.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.client?.name?.toLowerCase().includes(projectSearch.toLowerCase())
      )
    : projects;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold mr-3">
                {selectedProject ? `Új árajánlat készítése: ${selectedProject.name}` : 'Új árajánlat készítése'}
              </h2>
              {debugMode && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <Bug className="h-3 w-3 mr-1" />
                  Debug mód
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Bezárás"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Debug panel */}
          {debugMode && (
            <div className="mb-6 p-4 bg-gray-100 border border-gray-300 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-700 flex items-center">
                  <Bug className="h-4 w-4 mr-1" />
                  Debug Panel
                </h3>
                <button
                  onClick={() => setDebugMode(false)}
                  className="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded"
                >
                  Kikapcsolás
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API kulcs
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="X-API-Key fejléc értéke"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base URL (üresen hagyva relatív)
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="pl. https://admin.nb-studio.net"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => manualFetchProjects('/api/projects')}
                  className="px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md"
                  disabled={loadingProjects}
                >
                  {loadingProjects ? 'Betöltés...' : 'Projektek lekérése (Védett)'}
                </button>
                <button
                  type="button"
                  onClick={() => manualFetchProjects('/api/public/projects')}
                  className="px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-md"
                  disabled={loadingProjects}
                >
                  {loadingProjects ? 'Betöltés...' : 'Projektek lekérése (Publikus)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const token = localStorage.getItem('token');
                    addLog(`JWT token: ${token || 'Nincs token'}`, 'info');
                    setError(token ? `JWT token: ${token}` : 'Nincs JWT token a localStorage-ban!');
                  }}
                  className="px-3 py-2 text-xs font-medium text-white bg-purple-600 rounded-md"
                >
                  JWT token ellenőrzése
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addLog('Debug logok törlése', 'info');
                    setDebugLogs([]);
                  }}
                  className="px-3 py-2 text-xs font-medium text-white bg-gray-600 rounded-md"
                >
                  Logok törlése
                </button>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Manuális árajánlat küldés</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => manualSubmitQuote(quoteData.projectId ? 
                      `/api/projects/${quoteData.projectId}/quotes` : 
                      '/api/quotes',
                    false)}
                    className="px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md"
                    disabled={loading}
                  >
                    {loading ? 'Küldés...' : 'Küldés (Védett API)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => manualSubmitQuote(quoteData.projectId ? 
                      `/api/public/projects/${quoteData.projectId}/quotes` : 
                      '/api/public/quotes',
                    false)}
                    className="px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-md"
                    disabled={loading}
                  >
                    {loading ? 'Küldés...' : 'Küldés (Publikus API)'}
                  </button>
                </div>
              </div>
              
              <div className="bg-black bg-opacity-90 text-white p-3 rounded-md overflow-y-auto max-h-36 text-xs font-mono">
                {debugLogs.length === 0 ? (
                  <div className="text-gray-400">Még nincs log bejegyzés...</div>
                ) : (
                  debugLogs.map(log => (
                    <div 
                      key={log.id} 
                      className={`mb-1 ${
                        log.type === 'error' ? 'text-red-400' : 
                        log.type === 'warning' ? 'text-yellow-400' : 
                        log.type === 'success' ? 'text-green-400' : 
                        'text-gray-200'
                      }`}
                    >
                      <span className="text-gray-500">[{log.timestamp.split('T')[1].split('.')[0]}]</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* Projekt kiválasztás */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-3">Projekt kiválasztása</h3>
            
            <div className="flex items-center mb-3">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Projekt keresése..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Projekt
                </label>
                <select
                  value={selectedProject?._id || "null"}
                  onChange={handleProjectSelect}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={loadingProjects}
                >
                  <option value="null">-- Projekttől független árajánlat --</option>
                  {filteredProjects.map(project => (
                    <option key={project._id} value={project._id}>
                      {project.name} {project.client?.name ? `(${project.client.name})` : ''}
                    </option>
                  ))}
                </select>
                {loadingProjects && (
                  <p className="mt-1 text-sm text-gray-500">Projektek betöltése...</p>
                )}
                {projects.length === 0 && !loadingProjects && (
                  <p className="mt-1 text-sm text-red-500">
                    Nincsenek projektek betöltve. Használja a debug panelt a manuális lekéréshez!
                  </p>
                )}
              </div>
              
              {selectedProject && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Kiválasztott projekt adatai</h4>
                  <div className="bg-white p-3 rounded border border-gray-200 text-sm">
                    <p><span className="font-medium">Név:</span> {selectedProject.name}</p>
                    <p><span className="font-medium">Ügyfél:</span> {selectedProject.client?.name || 'Nincs megadva'}</p>
                    <p><span className="font-medium">Státusz:</span> {selectedProject.status || 'Nincs megadva'}</p>
                    <p><span className="font-medium">Pénznem:</span> {selectedProject.financial?.currency || 'EUR'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={(e) => handleSubmit(e, false)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Ügyfél adatok */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Ügyfél adatok</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Név *</label>
                  <input
                    type="text"
                    value={quoteData.client.name}
                    onChange={(e) => handleClientChange('name', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={quoteData.client.email}
                    onChange={(e) => handleClientChange('email', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefonszám</label>
                  <input
                    type="tel"
                    value={quoteData.client.phone || ''}
                    onChange={(e) => handleClientChange('phone', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cégnév</label>
                  <input
                    type="text"
                    value={quoteData.client.companyName || ''}
                    onChange={(e) => handleClientChange('companyName', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Adószám</label>
                  <input
                    type="text"
                    value={quoteData.client.taxNumber || ''}
                    onChange={(e) => handleClientChange('taxNumber', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              {/* Cím és egyéb adatok */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Cím és egyéb adatok</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Utca, házszám</label>
                  <input
                    type="text"
                    value={(quoteData.client.address?.street || '')}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Város</label>
                    <input
                      type="text"
                      value={(quoteData.client.address?.city || '')}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Irányítószám</label>
                    <input
                      type="text"
                      value={(quoteData.client.address?.postalCode || '')}
                      onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ország</label>
                  <input
                    type="text"
                    value={(quoteData.client.address?.country || 'Magyarország')}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Érvényesség dátuma</label>
                  <input
                    type="date"
                    value={quoteData.validUntil || ''}
                    onChange={(e) => handleChange('validUntil', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">ÁFA (%)</label>
                  <input
                    type="number"
                    value={quoteData.vat || 27}
                    onChange={(e) => handleChange('vat', parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>
            
            {/* Fizetési feltételek és megjegyzések */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Fizetési feltételek</label>
                <input
                  type="text"
                  value={quoteData.paymentTerms || ''}
                  onChange={(e) => handleChange('paymentTerms', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Megjegyzések</label>
                <textarea
                  value={quoteData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            {/* Árajánlat tételek */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-700">Tételek</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Tétel hozzáadása
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leírás</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mennyiség</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Egységár</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kedvezmény (%)</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Összesen</th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Művelet</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.isArray(quoteData.items) && quoteData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="Tétel leírása"
                            required
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right"
                            min="0.01"
                            step="0.01"
                            required
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.unitPrice || ''}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right"
                            min="0"
                            step="1"
                            required
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.discount || ''}
                            onChange={(e) => handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right"
                            min="0"
                            max="100"
                            step="1"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(item.total || 0)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-900"
                            disabled={quoteData.items.length <= 1}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan="4" className="px-3 py-2 text-right font-medium">Részösszeg:</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(quoteData.subtotal || 0)}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td colSpan="4" className="px-3 py-2 text-right font-medium">ÁFA ({quoteData.vat || 0}%):</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency((quoteData.totalAmount || 0) - (quoteData.subtotal || 0))}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td colSpan="4" className="px-3 py-2 text-right text-lg font-bold">Végösszeg:</td>
                      <td className="px-3 py-2 text-right text-lg font-bold">
                        {formatCurrency(quoteData.totalAmount || 0)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            {/* Gombok */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={loading}
              >
                <Save className="mr-2 h-4 w-4" />
                Mentés piszkozatként
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={loading}
              >
                <Send className="mr-2 h-4 w-4" />
                {loading ? 'Feldolgozás...' : 'Árajánlat küldése'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateQuoteForm;