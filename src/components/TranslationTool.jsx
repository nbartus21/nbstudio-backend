import React, { useState, useEffect } from 'react';
import { translateContent } from '../services/deepseekService';
import { AlertTriangle, Save, Copy, Clipboard, RotateCcw, Edit, Trash2, CheckCircle, FileText, Download, Upload, BookOpen, Plus, X, Calendar, Tag, Search } from 'lucide-react';
import { debugLog } from './shared/utils';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const TranslationTool = () => {
  // Translation states
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

  // Notes management states
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [activeTab, setActiveTab] = useState('translation'); // 'translation' or 'notes'
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState(null);
  const [noteSearch, setNoteSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    tags: [],
    category: 'general'
  });

  // Sablonok betöltése
  useEffect(() => {
    fetchTemplates();
    fetchNotes();
  }, []);

  // Notes filtering
  useEffect(() => {
    // Filter notes based on search and tags
    let filtered = [...notes];
    
    if (noteSearch) {
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(noteSearch.toLowerCase()) || 
        note.content.toLowerCase().includes(noteSearch.toLowerCase())
      );
    }
    
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note => 
        selectedTags.every(tag => note.tags.includes(tag))
      );
    }
    
    setFilteredNotes(filtered);
  }, [notes, noteSearch, selectedTags]);

  // Extract all unique tags from notes
  useEffect(() => {
    const tags = new Set();
    notes.forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    setAllTags(Array.from(tags));
  }, [notes]);

  const fetchTemplates = async () => {
    try {
      debugLog('fetchTemplates', 'Fetching translation templates');
      
      // Az API szolgáltatást használjuk az autentikációhoz
      const response = await api.get(`${API_URL}/translation/templates`);
      
      if (response.ok) {
        const data = await response.json();
        debugLog('fetchTemplates', 'Templates loaded successfully', { count: data.length });
        setTemplates(data);
      } else {
        // Ha 401-es hibát kapunk, akkor autentikációs hiba van
        if (response.status === 401) {
          debugLog('fetchTemplates', 'Authentication error', { status: response.status });
          setError('Nincs megfelelő jogosultsága a sablonok megtekintéséhez. Kérjük, jelentkezzen be újra.');
        } else {
          debugLog('fetchTemplates', 'API error, using default templates', { status: response.status });
          // API végpont még nem létezik, használjunk alapértelmezett sablonokat
          useDefaultTemplates();
        }
      }
    } catch (error) {
      debugLog('fetchTemplates', 'Error in template fetching', { error });
      setError('Hiba történt a sablonok betöltése során: ' + error.message);
      useDefaultTemplates();
    }
  };

  const fetchNotes = async () => {
    try {
      debugLog('fetchNotes', 'Fetching notes');
      
      // Try to get notes from API
      const response = await api.get(`${API_URL}/translation/notes`);
      
      if (response.ok) {
        const data = await response.json();
        debugLog('fetchNotes', 'Notes loaded successfully', { count: data.length });
        setNotes(data);
        setFilteredNotes(data);
      } else {
        if (response.status === 401) {
          debugLog('fetchNotes', 'Authentication error', { status: response.status });
          setError('Nincs megfelelő jogosultsága a jegyzetek megtekintéséhez. Kérjük, jelentkezzen be újra.');
        } else {
          debugLog('fetchNotes', 'API error, using default notes', { status: response.status });
          // API endpoint might not exist yet, use sample notes
          useDefaultNotes();
        }
      }
    } catch (error) {
      debugLog('fetchNotes', 'Error in notes fetching', { error });
      setError('Hiba történt a jegyzetek betöltése során: ' + error.message);
      useDefaultNotes();
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

  // Add default notes if API is not available
  const useDefaultNotes = () => {
    const defaultNotes = [
      {
        _id: '1',
        title: 'Német megszólítási formák',
        content: 'Hivatalos levelekben: "Sehr geehrte/r Frau/Herr [Nachname]"\nInformális: "Liebe/r [Vorname]"\nCéges kommunikáció: "Sehr geehrte Damen und Herren"',
        tags: ['német', 'megszólítás', 'levélírás'],
        category: 'nyelvi',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: '2',
        title: 'Gyakori fordítási hibák',
        content: 'Magyar-német fordításnál:\n- "Kérem" nem mindig "Bitte"\n- "Ügyfél" kontextustól függően "Kunde" vagy "Klient"\n- "Intézmény" lehet "Institution" vagy "Einrichtung"',
        tags: ['magyar', 'német', 'hibák'],
        category: 'fordítás',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: '3',
        title: 'Gyakori szakszavak',
        content: 'Informatikai kifejezések:\n- Weboldal fejlesztés: Webentwicklung\n- Felhasználói felület: Benutzeroberfläche\n- Adatbázis: Datenbank\n- Ügyfélszolgálat: Kundendienst',
        tags: ['informatika', 'szakszavak', 'német'],
        category: 'szótár',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    setNotes(defaultNotes);
    setFilteredNotes(defaultNotes);
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
      textLength: sourceText.length
    });
    
    try {
      const translatedText = await translateContent(sourceText, sourceLanguage, targetLanguage);
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
      // Az API szolgáltatást használjuk az autentikációhoz
      const response = await api.post(`${API_URL}/translation/templates`, templateData);
      
      if (response.ok) {
        const savedTemplate = await response.json();
        setTemplates([...templates, savedTemplate]);
        debugLog('saveTemplate', 'Template saved via API', { templateId: savedTemplate._id });
        setSuccess('Sablon sikeresen mentve!');
        setShowTemplateModal(false);
      } else {
        // Ha 401-es hibát kapunk, akkor autentikációs hiba van
        if (response.status === 401) {
          debugLog('saveTemplate', 'Authentication error', { status: response.status });
          setError('Nincs megfelelő jogosultsága a sablonok mentéséhez. Kérjük, jelentkezzen be újra.');
        } else {
          debugLog('saveTemplate', 'API error', { status: response.status });
          // API hiba esetén helyben mentsük el
          setTemplates([...templates, {
            _id: Date.now().toString(),
            ...templateData
          }]);
          setSuccess('Sablon lokálisan mentve. (API kapcsolat nem elérhető)');
          setShowTemplateModal(false);
        }
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      debugLog('saveTemplate', 'Error saving template', { error });
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

  // Note saving
  const saveNote = async () => {
    if (!newNote.title || !newNote.content) {
      setError('Adjon meg címet és tartalmat a jegyzethez!');
      return;
    }
    
    // If tags are provided as a string, convert to array
    let noteTags = newNote.tags;
    if (typeof newNote.tags === 'string') {
      noteTags = newNote.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    const noteData = {
      ...newNote,
      tags: noteTags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (currentNote) {
      noteData._id = currentNote._id;
      noteData.createdAt = currentNote.createdAt;
    }
    
    debugLog('saveNote', 'Saving note', { noteTitle: noteData.title });
    
    try {
      // Try to save to API
      const url = currentNote 
        ? `${API_URL}/translation/notes/${currentNote._id}` 
        : `${API_URL}/translation/notes`;
      const method = currentNote ? 'put' : 'post';
      
      const response = await api[method](url, noteData);
      
      if (response.ok) {
        const savedNote = await response.json();
        if (currentNote) {
          setNotes(notes.map(note => note._id === currentNote._id ? savedNote : note));
        } else {
          setNotes([...notes, savedNote]);
        }
        
        debugLog('saveNote', 'Note saved via API', { noteId: savedNote._id });
        setSuccess('Jegyzet sikeresen mentve!');
        setShowNoteModal(false);
        setCurrentNote(null);
      } else {
        if (response.status === 401) {
          debugLog('saveNote', 'Authentication error', { status: response.status });
          setError('Nincs megfelelő jogosultsága a jegyzetek mentéséhez. Kérjük, jelentkezzen be újra.');
        } else {
          debugLog('saveNote', 'API error', { status: response.status });
          // Save locally if API fails
          const newNoteWithId = {
            ...noteData,
            _id: currentNote ? currentNote._id : Date.now().toString()
          };
          
          if (currentNote) {
            setNotes(notes.map(note => note._id === currentNote._id ? newNoteWithId : note));
          } else {
            setNotes([...notes, newNoteWithId]);
          }
          
          setSuccess('Jegyzet lokálisan mentve. (API kapcsolat nem elérhető)');
          setShowNoteModal(false);
          setCurrentNote(null);
        }
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      debugLog('saveNote', 'Error saving note', { error });
      setError('Hiba történt a jegyzet mentése során: ' + error.message);
      
      // Offline save
      const newNoteWithId = {
        ...noteData,
        _id: currentNote ? currentNote._id : Date.now().toString()
      };
      
      if (currentNote) {
        setNotes(notes.map(note => note._id === currentNote._id ? newNoteWithId : note));
      } else {
        setNotes([...notes, newNoteWithId]);
      }
      
      setSuccess('Jegyzet lokálisan mentve. (Hiba a szerverrel való kommunikációban)');
      setShowNoteModal(false);
      setCurrentNote(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Delete a note
  const deleteNote = async (noteId) => {
    if (!window.confirm('Biztosan törölni szeretné ezt a jegyzetet?')) return;
    
    debugLog('deleteNote', 'Deleting note', { noteId });
    
    try {
      // Try to delete via API
      const response = await api.delete(`${API_URL}/translation/notes/${noteId}`);
      
      if (response.ok) {
        setNotes(notes.filter(note => note._id !== noteId));
        debugLog('deleteNote', 'Note deleted via API');
        setSuccess('Jegyzet sikeresen törölve!');
      } else {
        if (response.status === 401) {
          debugLog('deleteNote', 'Authentication error', { status: response.status });
          setError('Nincs megfelelő jogosultsága a jegyzetek törléséhez. Kérjük, jelentkezzen be újra.');
        } else {
          debugLog('deleteNote', 'API error', { status: response.status });
          // Delete locally if API fails
          setNotes(notes.filter(note => note._id !== noteId));
          setSuccess('Jegyzet lokálisan törölve. (API kapcsolat nem elérhető)');
        }
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      debugLog('deleteNote', 'Error deleting note', { error });
      setError('Hiba történt a jegyzet törlése során: ' + error.message);
      
      // Offline delete
      setNotes(notes.filter(note => note._id !== noteId));
      setSuccess('Jegyzet lokálisan törölve. (Hiba a szerverrel való kommunikációban)');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Edit a note
  const editNote = (note) => {
    setCurrentNote(note);
    setNewNote({
      title: note.title,
      content: note.content,
      tags: note.tags,
      category: note.category || 'general'
    });
    setShowNoteModal(true);
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

  // Save current translation as a note
  const saveTranslationAsNote = () => {
    setCurrentNote(null);
    setNewNote({
      title: '',
      content: `Forrás (${sourceLanguage}):\n${sourceText}\n\nFordítás (${targetLanguage}):\n${targetText}`,
      tags: ['fordítás', sourceLanguage, targetLanguage],
      category: 'fordítás'
    });
    setShowNoteModal(true);
  };

  // Sablon törlése
  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Biztosan törölni szeretné ezt a sablont?')) return;

    debugLog('deleteTemplate', 'Deleting template', { templateId });

    try {
      // Az API szolgáltatást használjuk az autentikációhoz
      const response = await api.delete(`${API_URL}/translation/templates/${templateId}`);
      
      if (response.ok) {
        setTemplates(templates.filter(t => t._id !== templateId));
        debugLog('deleteTemplate', 'Template deleted via API');
        setSuccess('Sablon sikeresen törölve!');
      } else {
        // Ha 401-es hibát kapunk, akkor autentikációs hiba van
        if (response.status === 401) {
          debugLog('deleteTemplate', 'Authentication error', { status: response.status });
          setError('Nincs megfelelő jogosultsága a sablonok törléséhez. Kérjük, jelentkezzen be újra.');
        } else {
          debugLog('deleteTemplate', 'API error', { status: response.status });
          // API hiba esetén helyben töröljük
          setTemplates(templates.filter(t => t._id !== templateId));
          setSuccess('Sablon lokálisan törölve. (API kapcsolat nem elérhető)');
        }
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      debugLog('deleteTemplate', 'Error deleting template', { error });
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

  // Export all notes
  const exportAllNotes = () => {
    debugLog('exportAllNotes', 'Exporting all notes');
    const content = notes.map(note => 
      `# ${note.title}\nKategória: ${note.category}\nCímkék: ${note.tags.join(', ')}\nLétrehozva: ${new Date(note.createdAt).toLocaleDateString()}\n\n${note.content}\n\n---\n\n`
    ).join('');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jegyzetek_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format date in a readable way
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Toggle a tag selection
  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fordítási Eszköz</h1>
        <p className="mt-2 text-gray-600">Használja ezt az eszközt szövegek fordításához, sablonok és jegyzetek kezeléséhez</p>
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

      {/* Tab selector */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('translation')}
          className={`py-2 px-4 font-medium ${
            activeTab === 'translation'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Fordítás
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`py-2 px-4 font-medium ${
            activeTab === 'notes'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Jegyzetek
        </button>
      </div>

      {/* Translation Tab */}
      {activeTab === 'translation' && (
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
                <div className="flex space-x-2">
                  <button
                    onClick={saveTranslationAsNote}
                    className="px-4 py-2 flex items-center bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Mentés jegyzetként
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
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left sidebar - filters and tags */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium mb-3">Keresés és szűrés</h3>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    placeholder="Keresés jegyzetekben..."
                    className="w-full pl-10 p-2 border rounded-lg"
                  />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Címkék</h4>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-2 py-1 text-xs rounded-full ${
                          selectedTags.includes(tag)
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                    {allTags.length === 0 && (
                      <p className="text-sm text-gray-500">Nincsenek címkék</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium mb-3">Műveletek</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setCurrentNote(null);
                    setNewNote({
                      title: '',
                      content: '',
                      tags: [],
                      category: 'general'
                    });
                    setShowNoteModal(true);
                  }}
                  className="w-full px-4 py-2 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Új jegyzet
                </button>
                
                <button
                  onClick={exportAllNotes}
                  className="w-full px-4 py-2 flex items-center justify-center border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Összes jegyzet exportálása
                </button>
              </div>
            </div>
          </div>
          
          {/* Main content - notes list */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Jegyzetek ({filteredNotes.length})</h2>
                <div>
                  <select
                    className="border rounded p-2"
                    onChange={(e) => {
                      // Sort notes
                      const value = e.target.value;
                      let sorted = [...filteredNotes];
                      
                      if (value === 'newest') {
                        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                      } else if (value === 'oldest') {
                        sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                      } else if (value === 'alphabetical') {
                        sorted.sort((a, b) => a.title.localeCompare(b.title));
                      }
                      
                      setFilteredNotes(sorted);
                    }}
                  >
                    <option value="newest">Legújabb elöl</option>
                    <option value="oldest">Legrégebbi elöl</option>
                    <option value="alphabetical">ABC sorrend</option>
                  </select>
                </div>
              </div>

              {filteredNotes.length === 0 ? (
                <div className="text-center p-6 text-gray-500">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p>Nincsenek jegyzetek</p>
                  <p className="text-sm">Hozzon létre új jegyzetet a "+" gombbal</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotes.map(note => (
                    <div
                      key={note._id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => editNote(note)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-lg">{note.title}</h3>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(note.createdAt)}
                            <span className="mx-2">•</span>
                            <Tag className="h-3 w-3 mr-1" />
                            {note.tags.join(', ') || 'Nincsenek címkék'}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              editNote(note);
                            }}
                            title="Szerkesztés"
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNote(note._id);
                            }}
                            title="Törlés"
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-700 line-clamp-3 whitespace-pre-line">
                        {note.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Note modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {currentNote ? 'Jegyzet szerkesztése' : 'Új jegyzet'}
              </h3>
              <button
                onClick={() => setShowNoteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cím</label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Jegyzet címe..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tartalom</label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                  rows={12}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Jegyzet tartalma..."
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Címkék (vesszővel elválasztva)</label>
                  <input
                    type="text"
                    value={Array.isArray(newNote.tags) ? newNote.tags.join(', ') : newNote.tags}
                    onChange={(e) => setNewNote({...newNote, tags: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="fordítás, német, szakszavak..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategória</label>
                  <select
                    value={newNote.category}
                    onChange={(e) => setNewNote({...newNote, category: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="general">Általános</option>
                    <option value="fordítás">Fordítás</option>
                    <option value="nyelvi">Nyelvi ismeret</option>
                    <option value="szakszótár">Szakszótár</option>
                    <option value="projekt">Projekt</option>
                    <option value="ügyfél">Ügyfél információ</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Mégse
              </button>
              <button
                onClick={saveNote}
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