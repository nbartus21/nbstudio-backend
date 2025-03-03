import React, { useState, useEffect } from 'react';
import { translateContent } from '../services/deepseekService';
import { api } from '../services/auth';
import { Save, Copy, Clipboard, RotateCcw, Edit, Trash2, CheckCircle, FileText, Download, Upload } from 'lucide-react';

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
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    sourceText: '',
    targetText: '',
    sourceLanguage: 'hu',
    targetLanguage: 'de',
    category: 'email'
  });

  // Sablonok betöltése
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get(`${API_URL}/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        console.error('Failed to fetch templates');
        // Alapértelmezett sablonok létrehozása, ha API még nincs implementálva
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
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
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
    
    try {
      const translatedText = await translateContent(sourceText, sourceLanguage, targetLanguage);
      setTargetText(translatedText);
      setSuccess('A fordítás sikeresen elkészült!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
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
      },
      () => {
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

    try {
      // Itt implementálható az API hívás, ha a backend készen áll
      // const response = await api.post(`${API_URL}/templates`, templateData);
      
      // Ideiglenes megoldás (API nélkül)
      setTemplates([...templates, {
        _id: Date.now().toString(),
        ...templateData
      }]);
      
      setSuccess('Sablon sikeresen mentve!');
      setShowTemplateModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Hiba történt a sablon mentése során: ' + error.message);
    }
  };

  // Sablon betöltése
  const loadTemplate = (template) => {
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

    try {
      // Itt implementálható az API hívás, ha a backend készen áll
      // const response = await api.delete(`${API_URL}/templates/${templateId}`);
      
      // Ideiglenes megoldás (API nélkül)
      setTemplates(templates.filter(t => t._id !== templateId));
      
      setSuccess('Sablon sikeresen törölve!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Hiba történt a sablon törlése során: ' + error.message);
    }
  };

  // Szöveg exportálása
  const exportTranslation = () => {
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
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="border rounded p-2"
              >
                <option value="de">Német</option>
                <option value="hu">Magyar</option>
                <option value="en">Angol</option>
              </select>
            </div>
            <textarea
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              rows={10}
              className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="A fordítás itt jelenik meg..."
            ></textarea>
            <div className="flex justify-between mt-4">
              <button
                onClick={() => copyToClipboard(targetText)}
                className="px-4 py-2 flex items-center text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                Másolás
              </button>
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