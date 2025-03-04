import React, { useState, useEffect } from 'react';
import { translateContent } from '../services/deepseekService';
import { Eye, EyeOff, Save, Copy, Clipboard, RotateCcw, Edit, Trash2, CheckCircle, FileText, Download, Upload, Mail, AlertTriangle } from 'lucide-react';
import { debugLog } from './shared/utils';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const TranslationTool = () => {
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('hu');
  const [targetLanguage, setTargetLanguage] = useState('de');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [emailFormatting, setEmailFormatting] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    sourceText: '',
    targetText: '',
    sourceLanguage: 'hu',
    targetLanguage: 'de',
    category: 'email'
  });

  // Properly get auth token
  const getAuthToken = () => {
    return sessionStorage.getItem('token');
  };

  // Enhanced API fetch function with proper error handling
  const fetchWithAuth = async (url, options = {}) => {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
    
    debugLog('fetchWithAuth', `Making ${options.method || 'GET'} request to ${url}`, { headers: mergedOptions.headers });
    
    const response = await fetch(url, mergedOptions);
    
    if (!response.ok) {
      // Detailed error logging
      const statusText = response.statusText;
      const statusCode = response.status;
      let errorBody = '';
      
      try {
        errorBody = await response.text();
      } catch (e) {
        // Ignore if we can't read the body
      }
      
      debugLog('fetchWithAuth', 'Request failed', { 
        status: statusCode, 
        statusText, 
        url, 
        body: errorBody 
      });
      
      if (statusCode === 401) {
        // Redirect to login on auth errors
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('isAuthenticated');
        window.location.href = '/login';
        throw new Error('Authentication failed. Please log in again.');
      }
      
      throw new Error(`HTTP error! status: ${statusCode} ${statusText}`);
    }
    
    return response;
  };

  // Sablonok betöltése
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      debugLog('fetchTemplates', 'Fetching translation templates');
      
      // Use the enhanced fetch function
      const response = await fetchWithAuth(`${API_URL}/translation/templates`);
      const data = await response.json();
      
      debugLog('fetchTemplates', 'Templates loaded successfully', { count: data.length });
      setTemplates(data);
    } catch (error) {
      debugLog('fetchTemplates', 'Error in template fetching', { error: error.message });
      setError(`Hiba történt a sablonok betöltése során: ${error.message}`);
      useDefaultTemplates();
    }
  };

  // Alapértelmezett sablonok hozzáadása, ha az API még nem elérhető
  const useDefaultTemplates = () => {
    setTemplates([
      {
        _id: '1',
        name: 'Üdvözlő email',
        description: 'Új ügyfél üdvözlése',
        sourceText: 'Tisztelt Ügyfelünk!\n\nKöszönjük megkeresését. Örömmel segítünk Önnek weboldala fejlesztésében.\n\nÜdvözlettel,\nNB Studio',
        targetText: 'Sehr geehrter Kunde!\n\nVielen Dank für Ihre Anfrage. Wir helfen Ihnen gerne bei der Entwicklung Ihrer Website.\n\nMit freundlichen Grüßen,\nNB Studio',
        sourceLanguage: 'hu',
        targetLanguage: 'de',
        category: 'email'
      },
      {
        _id: '2',
        name: 'Projekt státusz',
        description: 'Projekt állapotának ismertetése',
        sourceText: 'Tisztelt Partnerünk!\n\nEzúton tájékoztatjuk, hogy projektje a tervek szerint halad. A tervezett befejezési idő továbbra is [DÁTUM].\n\nÜdvözlettel,\nNB Studio',
        targetText: 'Sehr geehrter Partner!\n\nHiermit informieren wir Sie, dass Ihr Projekt planmäßig voranschreitet. Der geplante Fertigstellungstermin bleibt weiterhin [DATUM].\n\nMit freundlichen Grüßen,\nNB Studio',
        sourceLanguage: 'hu',
        targetLanguage: 'de',
        category: 'email'
      }
    ]);
  };

  // Email formázási funkció - javított verzió
const formatAsEmail = (text, language) => {
    if (!text) return '';
    
    // Megszólítás hozzáadása a megfelelő nyelven
    let greeting = '';
    switch (language) {
      case 'hu':
        greeting = 'Tisztelt Ügyfelünk!';
        break;
      case 'de':
        greeting = 'Sehr geehrter Kunde!';
        break;
      case 'fr':
        greeting = 'Cher client,';
        break;
      default:
        greeting = 'Dear Customer,';
        break;
    }
    
    // Intelligens tárgy sor generálása a szöveg tartalma alapján
    let subject = generateSubject(text, language);
    
    // Szöveg előkészítése
    let mainText = text.trim();
    
    // Összefűzzük a részeket - most már aláírás és dátum nélkül
    return `Betreff: ${subject}\n\n${greeting}\n\n${mainText}`;
  };
  
  // Tárgy sor intelligens generálása
  const generateSubject = (text, language) => {
    // A szöveg első 5-8 szavából generálunk tárgyat, 
    // vagy az első mondatból, ha az rövidebb
    const words = text.trim().split(/\s+/);
    const firstSentence = text.trim().split(/[.!?]/, 1)[0].trim();
    
    let subject = '';
    
    if (firstSentence.length <= 60) {
      // Ha az első mondat elég rövid, használjuk azt
      subject = firstSentence;
    } else {
      // Egyébként vegyük az első 5-8 szót
      const maxWords = Math.min(words.length, words.length > 15 ? 6 : 8);
      subject = words.slice(0, maxWords).join(' ');
      
      // Biztosítsuk, hogy értelmes a vége - ne egy kötőszóval végződjön
      const conjunctions = {
        'hu': ['és', 'vagy', 'hogy', 'ha', 'de', 'mert'],
        'de': ['und', 'oder', 'dass', 'wenn', 'aber', 'weil'],
        'fr': ['et', 'ou', 'que', 'si', 'mais', 'car'],
        'en': ['and', 'or', 'that', 'if', 'but', 'because']
      };
      
      const currentLangConjunctions = conjunctions[language] || conjunctions['en'];
      
      // Ha kötőszóval végződik, vegyük le a végéről
      const lastWord = subject.split(/\s+/).pop().toLowerCase();
      if (currentLangConjunctions.includes(lastWord)) {
        subject = subject.substring(0, subject.lastIndexOf(' '));
      }
      
      // Ha túl hosszú, vágva + ...
      if (subject.length > 60) {
        subject = subject.substring(0, 57) + '...';
      } else {
        subject += '...';
      }
    }
    
    return subject;
  };
  
  // Nyelvi kód konvertálása locale-ra
  const getLanguageLocale = (langCode) => {
    switch (langCode) {
      case 'hu': return 'hu-HU';
      case 'de': return 'de-DE';
      case 'fr': return 'fr-FR';
      case 'en': return 'en-US';
      default: return 'en-US';
    }
  };

  // Fordítás végrehajtása
  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      setError('Kérjük, adjon meg szöveget a fordításhoz!');
      return;
    }

    setIsTranslating(true);
    setError(null);
    debugLog('handleTranslate', 'Starting translation', {
      sourceLanguage,
      targetLanguage,
      textLength: sourceText.length,
      emailFormat: emailFormatting
    });
    
    try {
      let translatedText = await translateContent(sourceText, sourceLanguage, targetLanguage);
      
      // Ha email formázás be van kapcsolva, formázzuk a szöveget
      if (emailFormatting) {
        translatedText = formatAsEmail(translatedText, targetLanguage);
      }
      
      setTargetText(translatedText);
      setSuccess('A fordítás sikeresen elkészült!');
      setTimeout(() => setSuccess(null), 3000);
      debugLog('handleTranslate', 'Translation completed successfully');
    } catch (err) {
      debugLog('handleTranslate', 'Translation failed', { error: err });
      setError('Hiba történt a fordítás során: ' + err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  // Szöveg másolása a vágólapra
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setSuccess('Szöveg másolva a vágólapra!');
        setTimeout(() => setSuccess(null), 3000);
        debugLog('copyToClipboard', 'Text copied to clipboard', { textLength: text.length });
      },
      (err) => {
        debugLog('copyToClipboard', 'Failed to copy to clipboard', { error: err });
        setError('Nem sikerült másolni a vágólapra.');
      }
    );
  };

  // Sablon mentése
  const saveTemplate = async () => {
    if (!newTemplate.name || !sourceText || !targetText) {
      setError('Kérjük, töltse ki a név mezőt és fordítsa le a szöveget!');
      return;
    }

    const templateData = {
      ...newTemplate,
      sourceText: sourceText,
      targetText: targetText,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage
    };

    debugLog('saveTemplate', 'Saving template', { templateName: templateData.name });

    try {
      // Use the enhanced fetch function
      const response = await fetchWithAuth(`${API_URL}/translation/templates`, {
        method: 'POST',
        body: JSON.stringify(templateData)
      });
      
      const savedTemplate = await response.json();
      setTemplates([...templates, savedTemplate]);
      debugLog('saveTemplate', 'Template saved via API', { templateId: savedTemplate._id });
      setSuccess('Sablon sikeresen mentve!');
      setShowTemplateModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      debugLog('saveTemplate', 'Error saving template', { error: error.message });
      setError('Hiba történt a sablon mentése során: ' + error.message);
      
      // Offline mentés
      setTemplates([...templates, {
        _id: Date.now().toString(),
        ...templateData
      }]);
      setSuccess('Sablon lokálisan mentve. (Hiba a szerverrel való kommunikációban)');
      setShowTemplateModal(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Sablon betöltése
  const loadTemplate = (template) => {
    debugLog('loadTemplate', 'Loading template', { templateId: template._id, templateName: template.name });
    setSourceText(template.sourceText);
    setTargetText(template.targetText);
    setSourceLanguage(template.sourceLanguage);
    setTargetLanguage(template.targetLanguage);
    setSelectedTemplate(template);
    setSuccess('Sablon betöltve!');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Sablon törlése
  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Biztosan törölni szeretné ezt a sablont?')) return;

    debugLog('deleteTemplate', 'Deleting template', { templateId });

    try {
      // Use the enhanced fetch function
      await fetchWithAuth(`${API_URL}/translation/templates/${templateId}`, {
        method: 'DELETE'
      });
      
      setTemplates(templates.filter(t => t._id !== templateId));
      debugLog('deleteTemplate', 'Template deleted via API');
      setSuccess('Sablon sikeresen törölve!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      debugLog('deleteTemplate', 'Error deleting template', { error: error.message });
      setError('Hiba történt a sablon törlése során: ' + error.message);
      
      // Offline törlés
      setTemplates(templates.filter(t => t._id !== templateId));
      setSuccess('Sablon lokálisan törölve. (Hiba a szerverrel való kommunikációban)');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Szöveg exportálása
  const exportTranslation = () => {
    debugLog('exportTranslation', 'Exporting translation');
    const content = `Forrás (${sourceLanguage}):\n${sourceText}\n\nFordítás (${targetLanguage}):\n${targetText}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forditas_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Szöveg formázása emailként
  const formatEmailText = () => {
    if (!targetText.trim()) {
      setError('Nincs mit formázni. Kérjük, először fordítson le egy szöveget.');
      return;
    }
    
    const formattedText = formatAsEmail(targetText, targetLanguage);
    setTargetText(formattedText);
    setSuccess('Szöveg formázva email formátumban!');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fordítási Eszköz</h1>
        <p className="mt-2 text-gray-600">Használja ezt az eszközt szövegek fordításához és sablonok kezeléséhez</p>
      </div>

      {/* Értesítések */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fordítási panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Forrás szöveg</h2>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="border rounded p-2"
              >
                <option value="hu">Magyar</option>
                <option value="de">Német</option>
                <option value="en">Angol</option>
                <option value="fr">Francia</option>
              </select>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={10}
              className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Írja be a fordítandó szöveget..."
            ></textarea>
            <div className="flex justify-between mt-4">
              <button
                onClick={() => copyToClipboard(sourceText)}
                className="px-4 py-2 flex items-center text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                Másolás
              </button>
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="px-4 py-2 flex items-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isTranslating ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                    Fordítás folyamatban...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 13V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 16v3a2 2 0 01-2 2H7a2 2 0 01-2-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Fordítás
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Fordított szöveg</h2>
              <div className="flex items-center">
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="border rounded p-2 mr-2"
                >
                  <option value="de">Német</option>
                  <option value="hu">Magyar</option>
                  <option value="en">Angol</option>
                  <option value="fr">Francia</option>
                </select>

                <div className="flex items-center ml-4">
                  <input
                    id="emailFormat"
                    type="checkbox"
                    checked={emailFormatting}
                    onChange={(e) => setEmailFormatting(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="emailFormat" className="ml-2 text-sm text-gray-700">
                    Email formátum
                  </label>
                </div>
              </div>
            </div>
            <textarea
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              rows={10}
              className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="A fordítás itt jelenik meg..."
            ></textarea>
            <div className="flex justify-between mt-4">
              <div className="flex">
                <button
                  onClick={() => copyToClipboard(targetText)}
                  className="px-4 py-2 flex items-center text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 mr-2"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Másolás
                </button>
                <button
                  onClick={formatEmailText}
                  className="px-4 py-2 flex items-center text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  title="Formázás email-ként"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email formázás
                </button>
              </div>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="px-4 py-2 flex items-center bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Mentés sablonként
              </button>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={exportTranslation}
              className="px-4 py-2 flex items-center text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportálás
            </button>
            <button
              onClick={() => {
                setSourceText('');
                setTargetText('');
                setSelectedTemplate(null);
              }}
              className="px-4 py-2 flex items-center text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Alaphelyzet
            </button>
          </div>
        </div>

        {/* Sablonok panel */}
        <div className="bg-white rounded-lg shadow p-6 h-full">
          <h2 className="text-lg font-medium mb-4">Mentett Sablonok</h2>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Keresés a sablonok között..."
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div className="space-y-2 max-h-[32rem] overflow-y-auto">
            {templates.length === 0 ? (
              <div className="text-center p-6 text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p>Még nincsenek mentett sablonok.</p>
                <p className="text-sm">Mentse el a fordításait sablonként a könnyebb újrafelhasználáshoz.</p>
              </div>
            ) : (
              templates.map((template) => (
                <div key={template._id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.description}</p>
                      <div className="mt-1 text-xs text-gray-500">
                        {template.sourceLanguage.toUpperCase()} → {template.targetLanguage.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => loadTemplate(template)}
                        title="Betöltés"
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Clipboard className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(template._id)}
                        title="Törlés"
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-700 line-clamp-2">
                    {template.sourceText.substring(0, 100)}
                    {template.sourceText.length > 100 ? '...' : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sablon mentési modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-medium mb-4">Sablon mentése</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Név</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Adjon nevet a sablonnak..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leírás</label>
                <input
                  type="text"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Rövid leírás a sablonról..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategória</label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="email">Email</option>
                  <option value="invoice">Számla</option>
                  <option value="project">Projekt dokumentáció</option>
                  <option value="legal">Jogi szöveg</option>
                  <option value="marketing">Marketing</option>
                  <option value="other">Egyéb</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Mégse
              </button>
              <button
                onClick={saveTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Mentés
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationTool;