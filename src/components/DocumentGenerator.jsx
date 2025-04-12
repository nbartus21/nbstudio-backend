import React, { useState, useEffect } from 'react';
import { FileText, Download, Check, AlertTriangle, RefreshCw, Copy, File } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://admin.nb-studio.net';

const DocumentGenerator = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [documentData, setDocumentData] = useState({});
  const [generatedContent, setGeneratedContent] = useState(null);
  const [generatedDocumentId, setGeneratedDocumentId] = useState(null);
  const [saveAsDocument, setSaveAsDocument] = useState(true);
  const [language, setLanguage] = useState('hu');

  // Sablonok lekérése
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/document-generator/templates`, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        setTemplates(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Hiba a sablonok lekérésekor:', err);
        setError('Nem sikerült lekérni a dokumentum sablonokat.');
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // Sablon kiválasztása
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setGeneratedContent(null);
    setGeneratedDocumentId(null);
    setSuccess(null);
    setError(null);

    // Alapértelmezett adatok inicializálása
    const initialData = {
      title: `${template.name} - ${new Date().toLocaleDateString('hu-HU')}`,
      companyName: 'Norbert Bartus',
      companyAddress: 'Salinenstraße 25, 76646 Bruchsal, Deutschland',
      taxNumber: 'DE346419031',
      ceoName: 'Norbert Bartus',
      companyCity: 'Bruchsal'
    };

    // Ha az ügyfél sablon, akkor kliens adatokat is inicializálunk
    if (template.id.includes('szerzodes') || template.id.includes('arajanlat')) {
      initialData.client = {
        name: '',
        companyName: '',
        email: '',
        phone: '',
        taxNumber: '',
        address: {
          street: '',
          city: '',
          postalCode: '',
          country: 'Magyarország'
        }
      };
    }

    setDocumentData(initialData);
  };

  // Input mezők kezelése
  const handleInputChange = (e, nestedField = null) => {
    const { name, value } = e.target;

    if (nestedField) {
      // Beágyazott objektum kezelése (pl. client.name)
      setDocumentData(prevData => ({
        ...prevData,
        [nestedField]: {
          ...prevData[nestedField],
          [name]: value
        }
      }));
    } else if (name.includes('.')) {
      // Többszintű beágyazás kezelése (pl. client.address.city)
      const [parent, child, grandchild] = name.split('.');
      
      if (grandchild) {
        // Három szintű beágyazás (pl. client.address.city)
        setDocumentData(prevData => ({
          ...prevData,
          [parent]: {
            ...prevData[parent],
            [child]: {
              ...prevData[parent]?.[child],
              [grandchild]: value
            }
          }
        }));
      } else {
        // Két szintű beágyazás (pl. client.name)
        setDocumentData(prevData => ({
          ...prevData,
          [parent]: {
            ...prevData[parent],
            [child]: value
          }
        }));
      }
    } else {
      // Egyszerű mező kezelése
      setDocumentData(prevData => ({
        ...prevData,
        [name]: value
      }));
    }
  };

  // Tömb elemek kezelése
  const handleArrayItemChange = (arrayName, index, fieldName, value) => {
    setDocumentData(prevData => {
      const updatedArray = [...(prevData[arrayName] || [])];
      
      // Ha az index nagyobb mint a tömb hossza, feltöltjük üres objektumokkal
      while (updatedArray.length <= index) {
        updatedArray.push({});
      }
      
      // Frissítjük a megadott elemet
      updatedArray[index] = {
        ...updatedArray[index],
        [fieldName]: value
      };
      
      return {
        ...prevData,
        [arrayName]: updatedArray
      };
    });
  };

  // Új elem hozzáadása tömbhöz
  const handleAddArrayItem = (arrayName, template = {}) => {
    setDocumentData(prevData => ({
      ...prevData,
      [arrayName]: [...(prevData[arrayName] || []), { ...template }]
    }));
  };

  // Elem törlése tömbből
  const handleRemoveArrayItem = (arrayName, index) => {
    setDocumentData(prevData => ({
      ...prevData,
      [arrayName]: prevData[arrayName].filter((_, i) => i !== index)
    }));
  };

  // Dokumentum generálása
  const handleGenerateDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await axios.post(
        `${API_URL}/api/document-generator/generate`, 
        {
          templateId: selectedTemplate.id,
          documentData,
          saveAsDocument
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );
      
      setGeneratedContent(response.data.content);
      
      if (response.data.documentId) {
        setGeneratedDocumentId(response.data.documentId);
      }
      
      setSuccess('Dokumentum sikeresen létrehozva!');
      setLoading(false);
    } catch (err) {
      console.error('Hiba a dokumentum generálásakor:', err);
      setError(err.response?.data?.message || 'Nem sikerült létrehozni a dokumentumot.');
      setLoading(false);
    }
  };

  // PDF generálása és letöltése
  const handleGeneratePDF = async () => {
    if (!generatedContent) return;
    
    try {
      setLoading(true);
      
      const response = await axios.post(
        `${API_URL}/api/document-generator/generate-pdf?language=${language}`,
        {
          content: generatedContent,
          documentData
        }, 
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          responseType: 'blob'
        }
      );
      
      // Blob létrehozása
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Letöltés kezdeményezése
      const link = document.createElement('a');
      const fileName = `${documentData.title || 'document'}.pdf`.replace(/\s+/g, '_');
      
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setLoading(false);
    } catch (err) {
      console.error('Hiba a PDF generálásakor:', err);
      setError('Nem sikerült létrehozni a PDF dokumentumot.');
      setLoading(false);
    }
  };

  // Mezők renderelése a sablonhoz - egyszerűsített implementáció
  const renderRequiredFields = () => {
    if (!selectedTemplate) return null;
    
    return (
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Dokumentum címe</label>
          <input
            type="text"
            name="title"
            value={documentData.title || ''}
            onChange={(e) => handleInputChange(e)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        
        {/* Céges mezők */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Cég neve</label>
          <input
            type="text"
            name="companyName"
            value={documentData.companyName || ''}
            onChange={(e) => handleInputChange(e)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Cég címe</label>
          <input
            type="text"
            name="companyAddress"
            value={documentData.companyAddress || ''}
            onChange={(e) => handleInputChange(e)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Adószám</label>
          <input
            type="text"
            name="taxNumber"
            value={documentData.taxNumber || ''}
            onChange={(e) => handleInputChange(e)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Ügyvezető neve</label>
          <input
            type="text"
            name="ceoName"
            value={documentData.ceoName || ''}
            onChange={(e) => handleInputChange(e)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Város</label>
          <input
            type="text"
            name="companyCity"
            value={documentData.companyCity || ''}
            onChange={(e) => handleInputChange(e)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        {/* Email és telefon opcionális mezők */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email (opcionális)</label>
          <input
            type="email"
            name="companyEmail"
            value={documentData.companyEmail || ''}
            onChange={(e) => handleInputChange(e)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Telefon (opcionális)</label>
          <input
            type="text"
            name="companyPhone"
            value={documentData.companyPhone || ''}
            onChange={(e) => handleInputChange(e)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
    );
  };
  
  // UI renderelése
  return (
    <div className="bg-white shadow rounded-lg p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FileText className="mr-2" size={24} /> Dokumentum Generátor
        </h1>
        <div className="flex items-center space-x-2">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={saveAsDocument}
              onChange={() => setSaveAsDocument(!saveAsDocument)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Mentés dokumentumként</span>
          </label>
          
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-md border-gray-300 py-1 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="hu">Magyar</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 rounded-md bg-green-50 border border-green-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <Check className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">{success}</h3>
            </div>
          </div>
        </div>
      )}
      
      {/* Sablon kiválasztása */}
      {!selectedTemplate ? (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Válassz egy sablont</h2>
          
          {loading ? (
            <div className="flex justify-center">
              <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
            </div>
          ) : templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="cursor-pointer border rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all duration-200"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-md bg-blue-100 flex items-center justify-center">
                      <File className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {template.category}
                        </span>
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {template.language === 'hu' ? 'Magyar' : template.language === 'en' ? 'Angol' : 'Német'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">Nincsenek elérhető sablonok.</p>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Dokumentum szerkesztése: <span className="text-blue-600">{selectedTemplate.name}</span>
            </h2>
            <button
              type="button"
              onClick={() => setSelectedTemplate(null)}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:text-gray-500 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:text-gray-800 active:bg-gray-50 transition ease-in-out duration-150"
            >
              Vissza a sablonokhoz
            </button>
          </div>
          
          {renderRequiredFields()}
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleGenerateDocument}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <RefreshCw className="animate-spin h-4 w-4 mr-2" /> : null}
              {generatedContent ? 'Újragenerálás' : 'Dokumentum generálása'}
            </button>
            
            {generatedContent && (
              <button
                type="button"
                onClick={handleGeneratePDF}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF letöltése
              </button>
            )}
          </div>
          
          {/* Generált dokumentum előnézete */}
          {generatedContent && (
            <div className="mt-8">
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center justify-between">
                  <span>Generált dokumentum előnézete</span>
                  {generatedDocumentId && (
                    <span className="text-sm text-gray-500">
                      Dokumentum azonosító: {generatedDocumentId}
                    </span>
                  )}
                </h3>
                
                <div className="mt-4 p-4 border rounded-md bg-gray-50 relative">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedContent);
                      alert('A dokumentum tartalma másolva a vágólapra!');
                    }}
                    className="absolute top-2 right-2 p-1 rounded-md bg-white shadow hover:bg-gray-100"
                    title="Másolás a vágólapra"
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </button>
                  
                  <div 
                    className="prose max-w-none overflow-auto"
                    dangerouslySetInnerHTML={{ __html: generatedContent }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentGenerator;
