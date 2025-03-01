import React, { useState, useCallback } from 'react';
import { X, Plus, Save, Send } from 'lucide-react';

// API kulcs a közvetlen hozzáféréshez
const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';
const API_URL = 'https://admin.nb-studio.net:5001';

const CreateQuoteForm = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);
  
  // Kezdeti ügyfél adatok
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

  // Árajánlat alapadatok
  const [quoteData, setQuoteData] = useState({
    client: initialClient,
    items: [
      { description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }
    ],
    vat: 27,
    subtotal: 0,
    totalAmount: 0,
    paymentTerms: 'Fizetés 8 napon belül banki átutalással',
    notes: 'Az árajánlat 30 napig érvényes. Elfogadás után létrehozunk egy projektet az adatok alapján.',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'EUR'
  });

  // Pénzformátum segédfüggvény
  const formatCurrency = (amount) => {
    return `${amount.toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${quoteData.currency}`;
  };

  // Számítások a tételekhez és összegekhez
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

  // Frissítjük a számításokat
  const updateCalculations = () => {
    const { items, subtotal, totalAmount } = calculateTotals();
    
    setQuoteData(prev => ({
      ...prev,
      items,
      subtotal,
      totalAmount
    }));
  };

  // Ügyfél adatok módosítása
  const handleClientChange = (field, value) => {
    setQuoteData(prev => ({
      ...prev,
      client: { ...prev.client, [field]: value }
    }));
  };

  // Ügyfél cím adatok módosítása
  const handleAddressChange = (field, value) => {
    setQuoteData(prev => ({
      ...prev,
      client: { 
        ...prev.client, 
        address: { 
          ...(prev.client.address || {}),
          [field]: value 
        }
      }
    }));
  };

  // Általános mezők módosítása
  const handleChange = (field, value) => {
    setQuoteData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Ha a vat vagy currency változik, frissítsük a számításokat
    if (field === 'vat' || field === 'currency') {
      setTimeout(updateCalculations, 0);
    }
  };

  // Tétel hozzáadása
  const handleAddItem = () => {
    setQuoteData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]
    }));
  };

  // Tétel törlése
  const handleRemoveItem = (index) => {
    if (quoteData.items.length <= 1) return;
    
    setQuoteData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    
    // Frissítjük a számításokat
    setTimeout(updateCalculations, 0);
  };

  // Tétel módosítása
  const handleItemChange = (index, field, value) => {
    setQuoteData(prev => {
      const newItems = [...prev.items];
      if (newItems[index]) {
        newItems[index] = { ...newItems[index], [field]: value };
      }
      return { ...prev, items: newItems };
    });
    
    // Frissítjük a számításokat
    setTimeout(updateCalculations, 0);
  };

  // Árajánlat beküldése
  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessData(null);

    try {
      // Validáció
      if (!quoteData.client.name || !quoteData.client.email) {
        throw new Error('Az ügyfél neve és e-mail címe kötelező!');
      }

      if (quoteData.items.some(item => !item.description || parseFloat(item.quantity) <= 0)) {
        throw new Error('Minden tételnél adjon meg leírást és pozitív mennyiséget!');
      }

      // Strukturált címadatok
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
        status,
        createProject: true // Jelezzük, hogy projektet is létrehozzon elfogadás után
      };

      // KÖZVETLENÜL hívjuk a publikus API végpontot
      const response = await fetch(`${API_URL}/api/public/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(dataToSend)
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API válasz hiba:', errorBody);
        throw new Error(`Árajánlat küldés sikertelen (${response.status}): ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('Árajánlat sikeresen létrehozva:', responseData);
      
      // Sikeres létrehozás, mentem a megosztási adatokat
      setSuccessData({
        quoteNumber: responseData.quoteNumber || 'N/A',
        shareLink: responseData.shareLink || `${window.location.origin}/shared-quote/${responseData.shareToken}`,
        sharePin: responseData.sharePin || '123456',
        totalAmount: formatCurrency(responseData.totalAmount || quoteData.totalAmount)
      });

      if (onSuccess) {
        onSuccess(responseData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Hiba az árajánlat létrehozásakor:', error);
      setError(error.message || 'Ismeretlen hiba történt');
      setLoading(false);
    }
  };

  // Ha sikeresen létrejött az árajánlat, megjelenítjük a visszaigazolást
  if (successData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-md p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Árajánlat sikeresen létrehozva!</h2>
            <p className="text-gray-600">Az árajánlat adatai:</p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-sm text-gray-500">Árajánlat szám:</div>
                <div className="col-span-2 font-medium">{successData.quoteNumber}</div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="text-sm text-gray-500">Összeg:</div>
                <div className="col-span-2 font-medium">{successData.totalAmount}</div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Megosztási link és PIN kód az ügyfél számára:</p>
                <div className="p-3 bg-blue-50 rounded text-blue-800 break-all text-sm">
                  {successData.shareLink}
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-sm text-gray-500">PIN kód:</span>
                  <span className="font-mono font-bold text-lg tracking-wider">{successData.sharePin}</span>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>Az ügyfél a linken megtekintheti az árajánlatot és elfogadhatja vagy elutasíthatja azt a PIN kód segítségével.</p>
              <p className="mt-2">Elfogadás esetén automatikusan létrehozásra kerül a projektje az árajánlat adatai alapján.</p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Bezárás
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              Új Árajánlat Létrehozása
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Bezárás"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

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
                
                <div className="grid grid-cols-2 gap-3">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pénznem</label>
                    <select
                      value={quoteData.currency || 'EUR'}
                      onChange={(e) => handleChange('currency', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="EUR">EUR</option>
                      <option value="HUF">HUF</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
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
            
            {/* Info üzenet */}
            <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
              <p>
                <strong>Megjegyzés:</strong> Az árajánlat elfogadása után automatikusan létrehozásra kerül egy projekt az árajánlat adatai alapján.
              </p>
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