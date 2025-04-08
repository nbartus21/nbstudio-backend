import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Download, 
  Edit, Trash2, Eye, Share2, Clock, Copy, 
  CheckCircle, XCircle, Menu, ChevronRight 
} from 'lucide-react';
import documentService from '../services/documentService';
import { api } from '../services/auth';

// Document types with labels
const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Szerződés' },
  { value: 'proposal', label: 'Árajánlat' },
  { value: 'invoice', label: 'Számla' },
  { value: 'projectDoc', label: 'Projekt dokumentáció' },
  { value: 'report', label: 'Jelentés' },
  { value: 'other', label: 'Egyéb' }
];

// Language options
const LANGUAGES = [
  { value: 'hu', label: 'Magyar' },
  { value: 'de', label: 'Német' },
  { value: 'en', label: 'Angol' }
];

// Status options with colors
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Piszkozat', color: 'bg-gray-100 text-gray-800' },
  { value: 'final', label: 'Végleges', color: 'bg-green-100 text-green-800' },
  { value: 'archived', label: 'Archivált', color: 'bg-yellow-100 text-yellow-800' }
];

const DocumentManager = () => {
  // State variables
  const [templates, setTemplates] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('templates');
  const [filterType, setFilterType] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  
  // Form data states
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    type: 'contract',
    content: '',
    language: 'hu',
    isDefault: false
  });
  
  const [documentFormData, setDocumentFormData] = useState({
    templateId: '',
    projectId: '',
    name: '',
    variables: {}
  });
  
  const [shareFormData, setShareFormData] = useState({
    documentId: '',
    email: '',
    language: 'hu',
    shareResult: null
  });
  
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });
  
  // Initial data loading
  useEffect(() => {
    fetchData();
  }, [activeTab]);
  
  // Fetch data based on active tab
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch projects (needed for both tabs)
      const projectsResponse = await api.get('/api/projects');
      const projectsData = await projectsResponse.json();
      setProjects(projectsData);
      
      // Fetch templates or documents based on active tab
      if (activeTab === 'templates') {
        const filters = {};
        if (filterType) filters.type = filterType;
        if (filterLanguage) filters.language = filterLanguage;
        
        const templatesData = await documentService.getTemplates(filters);
        // Filter by search term
        const filteredTemplates = searchTerm
          ? templatesData.filter(t => 
              t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
            )
          : templatesData;
          
        setTemplates(filteredTemplates);
      } else {
        const filters = {};
        if (filterStatus) filters.status = filterStatus;
        
        const documentsData = await documentService.getDocuments(filters);
        // Filter by search term
        const filteredDocuments = searchTerm
          ? documentsData.filter(d => 
              d.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : documentsData;
          
        setDocuments(filteredDocuments);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('error', 'Hiba történt az adatok betöltése során');
    } finally {
      setLoading(false);
    }
  };
  
  // Effect to refetch data when filters change
  useEffect(() => {
    if (!loading) {
      fetchData();
    }
  }, [filterType, filterLanguage, filterStatus, searchTerm]);
  
  // Show notification
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification({ type: '', message: '' });
    }, 5000);
  };
  
  // Handle template form submission
  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (selectedTemplate) {
        // Update existing template
        await documentService.updateTemplate(selectedTemplate._id, templateFormData);
        showNotification('success', 'Sablon sikeresen frissítve');
      } else {
        // Create new template
        await documentService.createTemplate(templateFormData);
        showNotification('success', 'Sablon sikeresen létrehozva');
      }
      
      // Reset form and refetch data
      setTemplateFormData({
        name: '',
        description: '',
        type: 'contract',
        content: '',
        language: 'hu',
        isDefault: false
      });
      setSelectedTemplate(null);
      setShowTemplateForm(false);
      fetchData();
    } catch (error) {
      console.error('Error saving template:', error);
      showNotification('error', 'Hiba történt a sablon mentése során');
    }
  };
  
  // Handle document form submission
  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await documentService.createDocument(documentFormData);
      showNotification('success', 'Dokumentum sikeresen létrehozva');
      
      // Reset form and refetch data
      setDocumentFormData({
        templateId: '',
        projectId: '',
        name: '',
        variables: {}
      });
      setShowDocumentForm(false);
      setActiveTab('documents');
      fetchData();
    } catch (error) {
      console.error('Error creating document:', error);
      showNotification('error', 'Hiba történt a dokumentum létrehozása során');
    }
  };
  
  // Handle share form submission
  const handleShareSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const result = await documentService.shareDocument(
        shareFormData.documentId,
        shareFormData.email,
        shareFormData.language
      );
      
      setShareFormData({
        ...shareFormData,
        shareResult: result
      });
      
      showNotification('success', 'Dokumentum sikeresen megosztva');
      fetchData();
    } catch (error) {
      console.error('Error sharing document:', error);
      showNotification('error', 'Hiba történt a dokumentum megosztása során');
    }
  };
  
  // Handle template edit
  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateFormData({
      name: template.name,
      description: template.description || '',
      type: template.type,
      content: template.content,
      language: template.language || 'hu',
      isDefault: template.isDefault || false
    });
    setShowTemplateForm(true);
  };
  
  // Handle template delete
  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a sablont?')) {
      return;
    }
    
    try {
      await documentService.deleteTemplate(id);
      showNotification('success', 'Sablon sikeresen törölve');
      fetchData();
    } catch (error) {
      console.error('Error deleting template:', error);
      showNotification('error', 'Hiba történt a sablon törlése során');
    }
  };
  
  // Handle document view
  const handleViewDocument = async (id) => {
    try {
      const document = await documentService.getDocumentById(id);
      setSelectedDocument(document);
      setShowDocumentPreview(true);
    } catch (error) {
      console.error('Error fetching document:', error);
      showNotification('error', 'Hiba történt a dokumentum betöltése során');
    }
  };
  
  // Handle document delete
  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a dokumentumot?')) {
      return;
    }
    
    try {
      await documentService.deleteDocument(id);
      showNotification('success', 'Dokumentum sikeresen törölve');
      fetchData();
    } catch (error) {
      console.error('Error deleting document:', error);
      showNotification('error', 'Hiba történt a dokumentum törlése során');
    }
  };
  
  // Handle document share
  const handleShareDocument = (document) => {
    setShareFormData({
      documentId: document._id,
      email: document.projectId?.client?.email || '',
      language: 'hu',
      shareResult: null
    });
    setShowShareForm(true);
  };
  
  // Handle template selection in document form
  const handleTemplateSelect = async (e) => {
    const templateId = e.target.value;
    setDocumentFormData({
      ...documentFormData,
      templateId,
      variables: {}
    });
    
    if (templateId) {
      try {
        const template = await documentService.getTemplateById(templateId);
        const variables = documentService.getTemplateVariables(template);
        
        // Initialize variables object with empty values
        const variablesObj = {};
        variables.forEach(v => {
          variablesObj[v] = '';
        });
        
        setDocumentFormData(prev => ({
          ...prev,
          variables: variablesObj
        }));
      } catch (error) {
        console.error('Error fetching template:', error);
      }
    }
  };
  
  // Copy to clipboard helper
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showNotification('success', 'Szöveg vágólapra másolva');
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Notification */}
      {notification.message && (
        <div className={`mb-4 p-4 rounded-md ${
          notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                {notification.message}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dokumentum kezelő</h1>
        <div>
          {activeTab === 'templates' ? (
            <button
              onClick={() => {
                setShowTemplateForm(true);
                setSelectedTemplate(null);
                setTemplateFormData({
                  name: '',
                  description: '',
                  type: 'contract',
                  content: '',
                  language: 'hu',
                  isDefault: false
                });
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Új sablon
            </button>
          ) : (
            <button
              onClick={() => setShowDocumentForm(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Új dokumentum
            </button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-6 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sablonok
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-4 px-6 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dokumentumok
          </button>
        </nav>
      </div>
      
      {/* Search and filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[260px]">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Keresés..."
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        {activeTab === 'templates' ? (
          <>
            <div className="w-[180px]">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Összes típus</option>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="w-[150px]">
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Összes nyelv</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className="w-[180px]">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Összes státusz</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Content area */}
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : activeTab === 'templates' ? (
        /* Templates list */
        <div className="bg-white shadow overflow-hidden rounded-lg">
          {templates.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {templates.map((template) => {
                const typeInfo = DOCUMENT_TYPES.find(t => t.value === template.type) || { label: 'Egyéb' };
                const langInfo = LANGUAGES.find(l => l.value === template.language) || { label: 'Magyar' };
                
                return (
                  <li key={template._id} className="hover:bg-gray-50">
                    <div className="px-6 py-4">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-indigo-600">{template.name}</h3>
                            {template.isDefault && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                Alapértelmezett
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                          <div className="flex items-center mt-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full flex items-center text-xs mr-2">
                              <FileText className="h-3 w-3 mr-1" />
                              {typeInfo.label}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs mr-2">
                              {langInfo.label}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(template.updatedAt).toLocaleDateString('hu-HU')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="p-1 text-indigo-600 hover:text-indigo-800 rounded-full hover:bg-indigo-50"
                            title="Szerkesztés"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template._id)}
                            className="p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                            title="Törlés"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-1">Nincsenek még dokumentumsablonok</p>
              <p className="text-sm text-gray-400">Kattints az "Új sablon" gombra új sablon létrehozásához</p>
            </div>
          )}
        </div>
      ) : (
        /* Documents list */
        <div className="bg-white shadow overflow-hidden rounded-lg">
          {documents.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {documents.map((document) => {
                const statusInfo = STATUS_OPTIONS.find(s => s.value === document.status) || STATUS_OPTIONS[0];
                
                return (
                  <li key={document._id} className="hover:bg-gray-50">
                    <div className="px-6 py-4">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-indigo-600">{document.name}</h3>
                          <div className="flex items-center mt-2 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs mr-2 ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            {document.projectId && (
                              <span className="text-gray-500 mr-2">
                                Projekt: {document.projectId.name}
                              </span>
                            )}
                            <span className="text-gray-500 flex items-center text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(document.createdAt).toLocaleDateString('hu-HU')}
                            </span>
                          </div>
                          {document.sharing && document.sharing.isShared && (
                            <div className="mt-1 text-xs text-blue-600 flex items-center">
                              <Share2 className="h-3 w-3 mr-1" />
                              Megosztva: {document.sharing.email}
                              {document.sharing.views > 0 && ` (${document.sharing.views}x megtekintve)`}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDocument(document._id)}
                            className="p-1 text-indigo-600 hover:text-indigo-800 rounded-full hover:bg-indigo-50"
                            title="Megtekintés"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <a
                            href={documentService.getDocumentPreviewUrl(document._id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-green-600 hover:text-green-800 rounded-full hover:bg-green-50"
                            title="PDF letöltése"
                          >
                            <Download className="h-5 w-5" />
                          </a>
                          <button
                            onClick={() => handleShareDocument(document)}
                            className="p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50"
                            title="Megosztás"
                          >
                            <Share2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(document._id)}
                            className="p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                            title="Törlés"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-1">Nincsenek még dokumentumok</p>
              <p className="text-sm text-gray-400">Kattints az "Új dokumentum" gombra új dokumentum létrehozásához</p>
            </div>
          )}
        </div>
      )}
      
      {/* Template form modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-medium text-gray-900">
                {selectedTemplate ? 'Sablon szerkesztése' : 'Új sablon létrehozása'}
              </h2>
              <button
                onClick={() => setShowTemplateForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleTemplateSubmit}>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Sablon neve *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={templateFormData.name}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                      Dokumentum típusa *
                    </label>
                    <select
                      id="type"
                      value={templateFormData.type}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, type: e.target.value })}
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      {DOCUMENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Leírás
                  </label>
                  <input
                    type="text"
                    id="description"
                    value={templateFormData.description}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                      Nyelv
                    </label>
                    <select
                      id="language"
                      value={templateFormData.language}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, language: e.target.value })}
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={templateFormData.isDefault}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, isDefault: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                      Alapértelmezett sablon
                    </label>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                    Sablon tartalma *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Használd a {'{'}{'{'}változó{'}'}{'}'}  formátumot a változókhoz. Példa: {'{'}{'{'}clientName{'}'}{'}'}
                  </p>
                  <textarea
                    id="content"
                    value={templateFormData.content}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, content: e.target.value })}
                    rows={15}
                    className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                    required
                  ></textarea>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowTemplateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700"
                >
                  {selectedTemplate ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Document form modal */}
      {showDocumentForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-medium text-gray-900">Új dokumentum létrehozása</h2>
              <button
                onClick={() => setShowDocumentForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleDocumentSubmit}>
              <div className="p-6 space-y-6">
                <div>
                  <label htmlFor="templateId" className="block text-sm font-medium text-gray-700 mb-1">
                    Dokumentum sablon *
                  </label>
                  <select
                    id="templateId"
                    value={documentFormData.templateId}
                    onChange={handleTemplateSelect}
                    className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Válassz sablont</option>
                    {templates.map((template) => (
                      <option key={template._id} value={template._id}>
                        {template.name} ({DOCUMENT_TYPES.find(t => t.value === template.type)?.label})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Dokumentum neve *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={documentFormData.name}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-1">
                    Kapcsolódó projekt
                  </label>
                  <select
                    id="projectId"
                    value={documentFormData.projectId}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, projectId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Nincs projekt</option>
                    {projects.map((project) => (
                      <option key={project._id} value={project._id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Ha projektet választasz, a projekt adatai automatikusan bekerülnek a dokumentumba.
                  </p>
                </div>
                
                {documentFormData.templateId && Object.keys(documentFormData.variables).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Változók kitöltése</h3>
                    <div className="space-y-3 bg-gray-50 p-4 rounded-md border border-gray-200">
                      {Object.keys(documentFormData.variables).map((variable) => (
                        <div key={variable}>
                          <label className="block text-xs text-gray-700 mb-1" htmlFor={`var-${variable}`}>
                            {variable}
                          </label>
                          <input
                            type="text"
                            id={`var-${variable}`}
                            value={documentFormData.variables[variable]}
                            onChange={(e) => setDocumentFormData({
                              ...documentFormData,
                              variables: {
                                ...documentFormData.variables,
                                [variable]: e.target.value
                              }
                            })}
                            className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDocumentForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Létrehozás
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Share document modal */}
      {showShareForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-medium text-gray-900">Dokumentum megosztása</h2>
              <button
                onClick={() => setShowShareForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            {!shareFormData.shareResult ? (
              <form onSubmit={handleShareSubmit}>
                <div className="p-6 space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email cím *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={shareFormData.email}
                      onChange={(e) => setShareFormData({ ...shareFormData, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                      Értesítés nyelve
                    </label>
                    <select
                      id="language"
                      value={shareFormData.language}
                      onChange={(e) => setShareFormData({ ...shareFormData, language: e.target.value })}
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800">
                    <p className="font-medium mb-1">A dokumentum megosztása esetén:</p>
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      <li>A rendszer emailt küld a megadott címre</li>
                      <li>A dokumentum 30 napig lesz elérhető</li>
                      <li>A dokumentum PIN kóddal védett lesz</li>
                      <li>Nyomon követheted a megtekintéseket</li>
                    </ul>
                  </div>
                </div>
                
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowShareForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Megosztás
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-500 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">
                      Dokumentum sikeresen megosztva
                    </h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    A megosztási link és a PIN kód elküldve az alábbi email címre: 
                    <span className="font-medium ml-1">{shareFormData.email}</span>
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-4">
                    <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1">Megosztási link</label>
                      <div className="flex">
                        <input
                          type="text"
                          value={shareFormData.shareResult.url}
                          readOnly
                          className="flex-1 border border-gray-300 rounded-l-md shadow-sm px-3 py-2 bg-white text-gray-500"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(shareFormData.shareResult.url)}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 flex items-center"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">PIN kód</label>
                      <div className="flex">
                        <input
                          type="text"
                          value={shareFormData.shareResult.pin}
                          readOnly
                          className="w-32 border border-gray-300 rounded-l-md shadow-sm px-3 py-2 bg-white text-gray-500"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(shareFormData.shareResult.pin)}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 flex items-center"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-red-600">
                        Jegyezd fel a PIN kódot! Erre szükség lesz a dokumentum megtekintéséhez.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowShareForm(false)}
                    className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Bezárás
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Document preview modal */}
      {showDocumentPreview && selectedDocument && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-medium text-gray-900">{selectedDocument.name}</h2>
              <div className="flex items-center space-x-3">
                <a
                  href={documentService.getDocumentPreviewUrl(selectedDocument._id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </a>
                <button
                  onClick={() => setShowDocumentPreview(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
                <div dangerouslySetInnerHTML={{ __html: selectedDocument.content }} />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-4">
                    Létrehozva: {new Date(selectedDocument.createdAt).toLocaleDateString('hu-HU')}
                  </span>
                  {selectedDocument.projectId && (
                    <span>
                      Projekt: {selectedDocument.projectId.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowDocumentPreview(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300"
                >
                  Bezárás
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;