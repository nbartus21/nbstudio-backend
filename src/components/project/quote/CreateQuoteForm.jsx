import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Save, Send, Search } from 'lucide-react';

const CreateQuoteForm = ({ client, project: initialProject, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState(initialProject || null);
  
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

  // Projektek lekérése
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('Nincs autentikációs token a projektek lekéréséhez');
          setLoadingProjects(false);
          return;
        }

        const response = await fetch('/api/projects', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Nem sikerült lekérni a projekteket');
        }

        const data = await response.json();
        setProjects(data || []);
        setLoadingProjects(false);
      } catch (error) {
        console.error('Hiba a projektek lekérésekor:', error);
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  // Ha nincs kezdeti projekt, de van kiválasztott, akkor frissítsük a quoteData-t
  useEffect(() => {
    if (selectedProject && selectedProject._id !== quoteData.projectId) {
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
      setSelectedProject(null);
      setQuoteData(prev => ({
        ...prev,
        projectId: null
      }));
      return;
    }

    const selected = projects.find(p => p._id === projectId);
    setSelectedProject(selected || null);
    
    // Ha van ügyfél adat a projektben, használjuk azt
    if (selected && selected.client) {
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
    setQuoteData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]
    }));
  };

  // Tétel törlése
  const handleRemoveItem = (index) => {
    if (quoteData.items.length === 1) {
      return; // Legalább egy tételt meg kell hagyni
    }
    
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

  // Árajánlat mentése és elküldése
  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

      // API végpont (attól függően, hogy van-e projekt)
      const endpoint = quoteData.projectId 
        ? `/api/projects/${quoteData.projectId}/quotes`
        : '/api/quotes';

      // Árajánlat státusz beállítása
      const status = isDraft ? 'piszkozat' : 'elküldve';
      const dataToSend = {
        ...quoteData,
        client: clientData,
        status
      };

      // Get the token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Nincs autentikációs token');
      }

      console.log('Árajánlat küldése:', endpoint, dataToSend);

      // API hívás
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`  // Add 'Bearer ' prefix for JWT tokens
        },
        body: JSON.stringify(dataToSend)
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Nem sikerült létrehozni az árajánlatot');
      }

      if (onSuccess) {
        onSuccess(data);
      }
      
      setLoading(false);
      onClose();
    } catch (error) {
      console.error('Hiba az árajánlat létrehozásakor:', error);
      setError(error.message || 'Ismeretlen hiba történt');
      setLoading(false);
    }
  };

  // Projekt keresés
  const [projectSearch, setProjectSearch] = useState('');
  const filteredProjects = projectSearch
    ? projects.filter(p => 
        p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.client?.name?.toLowerCase().includes(projectSearch.toLowerCase())
      )
    : projects;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {selectedProject ? `Új árajánlat készítése: ${selectedProject.name}` : 'Új árajánlat készítése'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
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
              </div>
              
              {selectedProject && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Kiválasztott projekt adatai</h4>
                  <div className="bg-white p-3 rounded border border-gray-200 text-sm">
                    <p><span className="font-medium">Név:</span> {selectedProject.name}</p>
                    <p><span className="font-medium">Ügyfél:</span> {selectedProject.client?.name || 'Nincs megadva'}</p>
                    <p><span className="font-medium">Státusz:</span> {selectedProject.status || 'Nincs megadva'}</p>
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
                          {(item.total || 0).toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Ft
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
                        {(quoteData.subtotal || 0).toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Ft
                      </td>
                      <td></td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td colSpan="4" className="px-3 py-2 text-right font-medium">ÁFA ({quoteData.vat || 0}%):</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {((quoteData.totalAmount || 0) - (quoteData.subtotal || 0)).toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Ft
                      </td>
                      <td></td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td colSpan="4" className="px-3 py-2 text-right text-lg font-bold">Végösszeg:</td>
                      <td className="px-3 py-2 text-right text-lg font-bold">
                        {(quoteData.totalAmount || 0).toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Ft
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