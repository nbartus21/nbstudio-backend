import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Download, 
  Edit, Trash2, Eye, CheckCircle, XCircle, Send,
  Copy, FilePlus, FileCheck, Clock, Link, Share2
} from 'lucide-react';
import { api } from '../services/auth';

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Szerződés' },
  { value: 'proposal', label: 'Árajánlat' },
  { value: 'invoice', label: 'Számla' },
  { value: 'projectDoc', label: 'Projekt dokumentáció' },
  { value: 'report', label: 'Jelentés' },
  { value: 'other', label: 'Egyéb' }
];

const DOCUMENT_STATUSES = [
  { value: 'draft', label: 'Piszkozat', color: 'bg-gray-100 text-gray-800' },
  { value: 'pendingApproval', label: 'Jóváhagyásra vár', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'approved', label: 'Jóváhagyva', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Elutasítva', color: 'bg-red-100 text-red-800' },
  { value: 'sent', label: 'Elküldve', color: 'bg-blue-100 text-blue-800' },
  { value: 'clientApproved', label: 'Ügyfél elfogadta', color: 'bg-green-200 text-green-900' },
  { value: 'clientRejected', label: 'Ügyfél elutasította', color: 'bg-red-200 text-red-900' }
];

const DocumentManager = () => {
  // State változók
  const [templates, setTemplates] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'contract',
    content: '',
    language: 'hu',
    variables: [],
    isDefault: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [documentData, setDocumentData] = useState({
    templateId: '',
    projectId: '',
    variables: {}
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [sendEmailData, setSendEmailData] = useState({
    email: '',
    subject: '',
    message: ''
  });
  const [showSendForm, setShowSendForm] = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareData, setShareData] = useState({
    documentId: '',
    expiryDays: 30,
    shareLink: '',
    pin: ''
  });

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType) params.append('type', filterType);

      const response = await api.get(`/api/document-templates?${params}`);
      const data = await response.json();
      setTemplates(data);
      setLoading(false);
    } catch (error) {
      console.error('Hiba a sablonok betöltésekor:', error);
      setError('Nem sikerült betölteni a sablonokat');
      setLoading(false);
    }
  };

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await api.get(`/api/documents?${params}`);
      const data = await response.json();
      setDocuments(data);
      setLoading(false);
    } catch (error) {
      console.error('Hiba a dokumentumok betöltésekor:', error);
      setError('Nem sikerült betölteni a dokumentumokat');
      setLoading(false);
    }
  };

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const response = await api.get('/api/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Hiba a projektek betöltésekor:', error);
    }
  };

  // Initial data loading
  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    } else {
      fetchDocuments();
    }
    fetchProjects();
  }, [activeTab]);

  // Refresh templates when filter changes
  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [searchTerm, filterType]);

  // Refresh documents when status filter changes
  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
    }
  }, [selectedStatus]);

  // Create new template
  const handleCreateTemplate = async () => {
    try {
      if (!formData.name || !formData.content) {
        setError('Név és tartalom megadása kötelező');
        return;
      }

      const response = await api.post('/api/document-templates', formData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba történt a sablon létrehozása során');
      }

      setShowTemplateForm(false);
      setFormData({
        name: '',
        description: '',
        type: 'contract',
        content: '',
        language: 'hu',
        variables: [],
        isDefault: false
      });
      
      fetchTemplates();
      showSuccess('Sablon sikeresen létrehozva');
    } catch (error) {
      console.error('Hiba a sablon létrehozásakor:', error);
      setError(error.message);
    }
  };

  // Update template
  const handleUpdateTemplate = async () => {
    try {
      if (!selectedTemplate) {
        setError('Nincs kiválasztott sablon');
        return;
      }

      if (!formData.name || !formData.content) {
        setError('Név és tartalom megadása kötelező');
        return;
      }

      const response = await api.put(`/api/document-templates/${selectedTemplate._id}`, formData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba történt a sablon frissítése során');
      }

      setShowTemplateForm(false);
      setSelectedTemplate(null);
      setFormData({
        name: '',
        description: '',
        type: 'contract',
        content: '',
        language: 'hu',
        variables: [],
        isDefault: false
      });
      
      fetchTemplates();
      showSuccess('Sablon sikeresen frissítve');
    } catch (error) {
      console.error('Hiba a sablon frissítésekor:', error);
      setError(error.message);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Biztosan törli ezt a sablont?')) return;
    
    try {
      const response = await api.delete(`/api/document-templates/${templateId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba történt a sablon törlése során');
      }

      fetchTemplates();
      showSuccess('Sablon sikeresen törölve');
    } catch (error) {
      console.error('Hiba a sablon törlésekor:', error);
      setError(error.message);
    }
  };

  // Edit template
  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      type: template.type,
      content: template.content,
      language: template.language || 'hu',
      variables: template.variables || [],
      isDefault: template.isDefault || false
    });
    setShowTemplateForm(true);
  };

  // Generate document
  const handleGenerateDocument = async () => {
    try {
      if (!documentData.templateId) {
        setError('Sablon kiválasztása kötelező');
        return;
      }

      const response = await api.post('/api/documents/generate', documentData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba történt a dokumentum generálása során');
      }

      setShowDocumentForm(false);
      setDocumentData({
        templateId: '',
        projectId: '',
        variables: {}
      });
      
      fetchDocuments();
      showSuccess('Dokumentum sikeresen generálva');
    } catch (error) {
      console.error('Hiba a dokumentum generálásakor:', error);
      setError(error.message);
    }
  };

  // Download document as PDF
  const handleDownloadPDF = async (documentId) => {
    try {
      window.open(`/api/documents/${documentId}/pdf`, '_blank');
    } catch (error) {
      console.error('Hiba a PDF letöltésekor:', error);
      setError('Nem sikerült letölteni a PDF dokumentumot');
    }
  };

  // View document
  const handleViewDocument = async (documentId) => {
    try {
      console.log('Megtekinteni kívánt dokumentum ID:', documentId);
      
      // Először nullázd a kiválasztott dokumentumot, így biztosan nem a régi látszik
      setSelectedDocument(null);
      
      const response = await api.get(`/api/documents/${documentId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba történt a dokumentum lekérése során');
      }
  
      const data = await response.json();
      console.log('Visszakapott dokumentum:', data._id, data.name);
      
      // Most állítsd be az új dokumentumot
      setSelectedDocument(data);
      setPreviewMode(true);
    } catch (error) {
      console.error('Hiba a dokumentum lekérésekor:', error);
      setError(error.message);
    }
  };

  // Update document status
  const handleUpdateDocumentStatus = async (documentId, status) => {
    try {
      const response = await api.put(`/api/documents/${documentId}/status`, { 
        status,
        comment: approvalComment 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba történt a dokumentum státuszának frissítése során');
      }

      fetchDocuments();
      setApprovalComment('');
      showSuccess(`Dokumentum státusza sikeresen frissítve: ${status}`);
    } catch (error) {
      console.error('Hiba a dokumentum státuszának frissítésekor:', error);
      setError(error.message);
    }
  };

  // Send document by email
  const handleSendDocument = async (documentId) => {
    try {
      if (!sendEmailData.email) {
        setError('Email cím megadása kötelező');
        return;
      }

      const response = await api.post(`/api/documents/${documentId}/send`, sendEmailData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba történt a dokumentum küldése során');
      }

      setShowSendForm(false);
      setSendEmailData({
        email: '',
        subject: '',
        message: ''
      });
      
      fetchDocuments();
      showSuccess('Dokumentum sikeresen elküldve');
    } catch (error) {
      console.error('Hiba a dokumentum küldésekor:', error);
      setError(error.message);
    }
  };
  
  // Generate share link for document
  const handleGenerateShareLink = async (documentId) => {
    try {
      setShareData({
        documentId,
        expiryDays: 30,
        shareLink: ''
      });
      setShowShareForm(true);
    } catch (error) {
      console.error('Hiba a megosztási űrlap megnyitásakor:', error);
      setError(error.message);
    }
  };
  
  // Create share link
  const handleCreateShareLink = async () => {
    try {
      const response = await api.post(
        `/api/documents/${shareData.documentId}/share-document`, 
        { expiryDays: shareData.expiryDays }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba történt a megosztási link generálása során');
      }
      
      const data = await response.json();
      
      setShareData({
        ...shareData,
        shareLink: data.shareLink,
        pin: data.pin
      });
      
      fetchDocuments();
      showSuccess('Megosztási link sikeresen létrehozva');
    } catch (error) {
      console.error('Hiba a megosztási link generálásakor:', error);
      setError(error.message);
    }
  };
  
  // Delete document
  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Biztosan törli ezt a dokumentumot?')) return;
    
    try {
      const response = await api.delete(`/api/documents/${documentId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba történt a dokumentum törlése során');
      }
      
      fetchDocuments();
      showSuccess('Dokumentum sikeresen törölve');
    } catch (error) {
      console.error('Hiba a dokumentum törlésekor:', error);
      setError(error.message);
    }
  };

  // Show success message
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Handle form input changes for template
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle variable changes for document generation
  const handleVariableChange = (key, value) => {
    setDocumentData({
      ...documentData,
      variables: {
        ...documentData.variables,
        [key]: value
      }
    });
  };

  // Handle email form changes
  const handleEmailFormChange = (e) => {
    const { name, value } = e.target;
    setSendEmailData({
      ...sendEmailData,
      [name]: value
    });
  };

  if (loading && templates.length === 0 && documents.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dokumentum Kezelő</h1>
        <div className="space-x-2">
          {activeTab === 'templates' ? (
            <button
              onClick={() => {
                setShowTemplateForm(true);
                setSelectedTemplate(null);
                setFormData({
                  name: '',
                  description: '',
                  type: 'contract',
                  content: '',
                  language: 'hu',
                  variables: [],
                  isDefault: false
                });
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Plus className="h-5 w-5 mr-1" />
              Új Sablon
            </button>
          ) : (
            <button
              onClick={() => {
                setShowDocumentForm(true);
                setDocumentData({
                  templateId: '',
                  projectId: '',
                  variables: {}
                });
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <FilePlus className="h-5 w-5 mr-1" />
              Új Dokumentum
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
            Generált Dokumentumok
          </button>
        </nav>
      </div>

      {/* Templates tab content */}
      {activeTab === 'templates' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Keresés név, leírás vagy címke alapján..."
                  className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center border border-gray-300 rounded-md">
                <div className="px-3 py-2 bg-gray-50 border-r border-gray-300">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-3 pr-8 py-2 text-base border-0 focus:outline-none focus:ring-0"
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
          </div>

          {/* Templates list */}
          <div className="bg-white shadow overflow-hidden rounded-md">
            <ul className="divide-y divide-gray-200">
              {templates.length > 0 ? (
                templates.map((template) => {
                  const typeInfo = DOCUMENT_TYPES.find(t => t.value === template.type) || { label: 'Egyéb' };
                  
                  return (
                    <li key={template._id} className="hover:bg-gray-50">
                      <div className="px-6 py-4">
                        <div className="flex justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h3 className="text-lg font-medium text-indigo-600">{template.name}</h3>
                              {template.isDefault && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                  Alapértelmezett
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                            <div className="flex items-center mt-2 space-x-2 text-sm">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full flex items-center">
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                {typeInfo.label}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                {template.language === 'hu' ? 'Magyar' : 
                                 template.language === 'de' ? 'Német' : 'Angol'}
                              </span>
                              <span className="text-gray-500 flex items-center">
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                Frissítve: {new Date(template.updatedAt).toLocaleDateString('hu-HU')}
                              </span>
                              {template.usageCount > 0 && (
                                <span className="text-gray-500">
                                  Használva: {template.usageCount}x
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleEditTemplate(template)}
                              className="p-1 text-indigo-600 hover:text-indigo-800 rounded hover:bg-indigo-50"
                              title="Szerkesztés"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                setShowDocumentForm(true);
                                setDocumentData({
                                  ...documentData,
                                  templateId: template._id
                                });
                              }}
                              className="p-1 text-green-600 hover:text-green-800 rounded hover:bg-green-50"
                              title="Dokumentum generálása"
                            >
                              <FilePlus className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template._id)}
                              className="p-1 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                              title="Törlés"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="py-10 px-6 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-lg">Nincsenek még dokumentumsablonok</p>
                  <p className="text-gray-400 mt-1">
                    Kattintson az "Új Sablon" gombra egy új dokumentumsablon létrehozásához.
                  </p>
                </li>
              )}
            </ul>
          </div>
        </>
      )}

      {/* Documents tab content */}
      {activeTab === 'documents' && (
        <>
          {/* Status filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedStatus('')}
              className={`px-3 py-1.5 text-sm rounded-full border ${
                selectedStatus === '' 
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-300' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Összes
            </button>
            {DOCUMENT_STATUSES.map((status) => (
              <button
                key={status.value}
                onClick={() => setSelectedStatus(status.value)}
                className={`px-3 py-1.5 text-sm rounded-full border ${
                  selectedStatus === status.value 
                    ? `${status.color} border-${status.color.split(' ')[0].replace('bg-', 'border-')}` 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>

          {/* Documents list */}
          <div className="bg-white shadow overflow-hidden rounded-md">
            <ul className="divide-y divide-gray-200">
              {documents.length > 0 ? (
                documents.map((doc) => {
                  const status = DOCUMENT_STATUSES.find(s => s.value === doc.approvalStatus) || DOCUMENT_STATUSES[0];
                  
                  return (
                    <li key={doc._id} className="hover:bg-gray-50">
                      <div className="px-6 py-4">
                        <div className="flex justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-indigo-600">{doc.name}</h3>
                            <div className="flex items-center mt-2 space-x-2 text-sm">
                              <span className={`px-2 py-0.5 rounded-full ${status.color}`}>
                                {status.label}
                              </span>
                              {doc.projectId && (
                                <span className="text-gray-500">
                                  Projekt: {doc.projectId.name || doc.projectId}
                                </span>
                              )}
                              <span className="text-gray-500 flex items-center">
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                Létrehozva: {new Date(doc.createdAt).toLocaleDateString('hu-HU')}
                              </span>
                              {doc.sharing?.token && doc.sharing?.pin && (
                                <span className="text-blue-500 flex items-center" title="Megosztási link és PIN">
                                  <Link className="h-3.5 w-3.5 mr-1" />
                                  Megosztott {doc.sharing.pin ? `(PIN: ${doc.sharing.pin})` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleViewDocument(doc._id)}
                              className="p-1 text-indigo-600 hover:text-indigo-800 rounded hover:bg-indigo-50"
                              title="Megtekintés"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(doc._id)}
                              className="p-1 text-green-600 hover:text-green-800 rounded hover:bg-green-50"
                              title="Letöltés PDF-ként"
                            >
                              <Download className="h-5 w-5" />
                            </button>
                            {doc.approvalStatus === 'draft' && (
                              <button
                                onClick={() => handleUpdateDocumentStatus(doc._id, 'pendingApproval')}
                                className="p-1 text-yellow-600 hover:text-yellow-800 rounded hover:bg-yellow-50"
                                title="Jóváhagyásra küldés"
                              >
                                <FileCheck className="h-5 w-5" />
                              </button>
                            )}
                            {doc.approvalStatus === 'pendingApproval' && (
                              <>
                                <button
                                  onClick={() => handleUpdateDocumentStatus(doc._id, 'approved')}
                                  className="p-1 text-green-600 hover:text-green-800 rounded hover:bg-green-50"
                                  title="Jóváhagyás"
                                >
                                  <CheckCircle className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleUpdateDocumentStatus(doc._id, 'rejected')}
                                  className="p-1 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                                  title="Elutasítás"
                                >
                                  <XCircle className="h-5 w-5" />
                                </button>
                              </>
                            )}
                            {doc.approvalStatus === 'approved' && (
                              <button
                                onClick={() => {
                                  setSelectedDocument(doc);
                                  setShowSendForm(true);
                                  setSendEmailData({
                                    email: doc.projectId?.client?.email || '',
                                    subject: `Dokumentum: ${doc.name}`,
                                    message: `Tisztelt Ügyfelünk!\n\nMellékelten küldjük a következő dokumentumot: ${doc.name}.\n\n` +
                                    (doc.sharing?.token && doc.sharing?.pin ? 
                                    `A dokumentum online is megtekinthető az alábbi linken:\nLink: ${doc.sharing.link}\nPIN kód: ${doc.sharing.pin}\n\nA hozzáférés lejár: ${doc.sharing.expiresAt ? new Date(doc.sharing.expiresAt).toLocaleDateString('hu-HU') : 'N/A'}` : '')
                                  });
                                }}
                                className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50"
                                title="Küldés emailben"
                              >
                                <Send className="h-5 w-5" />
                              </button>
                            )}
                            {/* Link generálási gomb */}
                            <button
                              onClick={() => handleGenerateShareLink(doc._id)}
                              className="p-1 text-purple-600 hover:text-purple-800 rounded hover:bg-purple-50"
                              title="Megosztási link generálása"
                            >
                              <Link className="h-5 w-5" />
                            </button>
                            {/* Törlés gomb */}
                            <button
                              onClick={() => handleDeleteDocument(doc._id)}
                              className="p-1 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                              title="Dokumentum törlése"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="py-10 px-6 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-lg">Nincsenek még generált dokumentumok</p>
                  <p className="text-gray-400 mt-1">
                    Kattintson az "Új Dokumentum" gombra egy új dokumentum generálásához.
                  </p>
                </li>
              )}
            </ul>
          </div>
        </>
      )}

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-medium">
                {selectedTemplate ? 'Sablon szerkesztése' : 'Új sablon létrehozása'}
              </h2>
              <button
                onClick={() => setShowTemplateForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Sablon neve*
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Dokumentum típusa*
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleFormChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Leírás
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                    Nyelv
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleFormChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="hu">Magyar</option>
                    <option value="de">Német</option>
                    <option value="en">Angol</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleFormChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                    Beállítás alapértelmezettként
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Sablon tartalma*
                </label>
                <div className="border border-gray-300 rounded-md p-2 bg-gray-50">
                  <p className="text-xs text-gray-500 mb-2">
                    Használja a következő formátumot a változók beszúrásához: {'{{változóNév}}'}
                  </p>
                  <textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleFormChange}
                    rows={15}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                    placeholder="Például: Tisztelt {{clientName}}! Ezúton küldöm a {{projectName}} projekttel kapcsolatos dokumentumot."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowTemplateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Mégse
                </button>
                <button
                  onClick={selectedTemplate ? handleUpdateTemplate : handleCreateTemplate}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  {selectedTemplate ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Generation Form Modal */}
      {showDocumentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-medium">Dokumentum generálása</h2>
              <button
                onClick={() => setShowDocumentForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <label htmlFor="templateId" className="block text-sm font-medium text-gray-700 mb-1">
                  Dokumentumsablon*
                </label>
                <select
                  id="templateId"
                  name="templateId"
                  value={documentData.templateId}
                  onChange={(e) => setDocumentData({...documentData, templateId: e.target.value})}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                >
                  <option value="">Válasszon sablont</option>
                  {templates.map((template) => (
                    <option key={template._id} value={template._id}>
                      {template.name} ({DOCUMENT_TYPES.find(t => t.value === template.type)?.label})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-1">
                  Projekt (opcionális)
                </label>
                <select
                  id="projectId"
                  name="projectId"
                  value={documentData.projectId}
                  onChange={(e) => setDocumentData({...documentData, projectId: e.target.value})}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="">Nem kapcsolódik projekthez</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Ha projekthez kapcsolja, a rendszer automatikusan behelyettesíti a projekt adatait.
                </p>
              </div>

              {documentData.templateId && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Egyéni változók</h3>
                  <div className="space-y-3 border border-gray-200 rounded-md p-3 bg-gray-50">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500">
                          Dátum
                        </label>
                        <input
                          type="text"
                          value={documentData.variables.customDate || ''}
                          onChange={(e) => handleVariableChange('customDate', e.target.value)}
                          placeholder="pl. 2025.03.13."
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">
                          Helyszín
                        </label>
                        <input
                          type="text"
                          value={documentData.variables.location || ''}
                          onChange={(e) => handleVariableChange('location', e.target.value)}
                          placeholder="pl. Budapest"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">
                        Egyéb megjegyzés
                      </label>
                      <textarea
                        value={documentData.variables.notes || ''}
                        onChange={(e) => handleVariableChange('notes', e.target.value)}
                        rows={2}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDocumentForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Mégse
                </button>
                <button
                  onClick={handleGenerateDocument}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Dokumentum generálása
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewMode && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-medium">
                {selectedDocument.name} 
                <span className="ml-2 text-xs text-gray-500">(ID: {selectedDocument._id})</span>
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadPDF(selectedDocument._id)}
                  className="px-3 py-1 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 flex items-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF letöltése
                </button>
                <button
                  onClick={() => {
                    // Explicit bezárás és state reset
                    setPreviewMode(false);
                    setSelectedDocument(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* Kulcs hozzáadása a tartalom komponenshez, hogy minden új dokumentumnál újra renderelődjön */}
              <div key={`document-content-${selectedDocument._id}`} className="max-w-3xl mx-auto bg-white shadow-sm rounded-lg p-8 min-h-[800px]">
                <div dangerouslySetInnerHTML={{ __html: selectedDocument.htmlVersion || selectedDocument.content }} />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">Állapot:</span>
                <span className={`px-2 py-0.5 rounded-full text-sm ${
                  DOCUMENT_STATUSES.find(s => s.value === selectedDocument.approvalStatus)?.color || 'bg-gray-100 text-gray-800'
                }`}>
                  {DOCUMENT_STATUSES.find(s => s.value === selectedDocument.approvalStatus)?.label || 'Piszkozat'}
                </span>
              </div>
              
              {selectedDocument.approvalStatus === 'pendingApproval' && (
                <div className="flex items-center space-x-2">
                  <textarea
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="Jóváhagyási megjegyzés (opcionális)"
                    className="block w-64 border-gray-300 rounded-md shadow-sm text-sm"
                    rows={1}
                  />
                  <button
                    onClick={() => {
                      handleUpdateDocumentStatus(selectedDocument._id, 'approved');
                      // Állapot frissítése után töröljük a kiválasztást is
                      setPreviewMode(false);
                      setSelectedDocument(null);
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Jóváhagyás
                  </button>
                  <button
                    onClick={() => {
                      handleUpdateDocumentStatus(selectedDocument._id, 'rejected');
                      // Állapot frissítése után töröljük a kiválasztást is
                      setPreviewMode(false);
                      setSelectedDocument(null);
                    }}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 flex items-center"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Elutasítás
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {showSendForm && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-medium">Dokumentum küldése emailben</h2>
              <button
                onClick={() => setShowSendForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Címzett email címe*
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={sendEmailData.email}
                  onChange={handleEmailFormChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Tárgy*
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={sendEmailData.subject}
                  onChange={handleEmailFormChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Üzenet
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={sendEmailData.message}
                  onChange={handleEmailFormChange}
                  rows={5}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="mb-6 p-4 border border-gray-200 rounded bg-gray-50">
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-1 text-indigo-600" />
                  {selectedDocument.name}
                </h3>
                <p className="text-xs text-gray-500">
                  A dokumentum PDF formátumban lesz csatolva az emailhez.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSendForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Mégse
                </button>
                <button
                  onClick={() => handleSendDocument(selectedDocument._id)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Küldés
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      {showShareForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-medium">Dokumentum megosztása</h2>
              <button
                onClick={() => setShowShareForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {!shareData.shareLink ? (
                <>
                  <div className="mb-6">
                    <label htmlFor="expiryDays" className="block text-sm font-medium text-gray-700 mb-1">
                      Lejárati idő (napokban)
                    </label>
                    <input
                      type="number"
                      id="expiryDays"
                      min="1"
                      max="365"
                      value={shareData.expiryDays}
                      onChange={(e) => setShareData({...shareData, expiryDays: parseInt(e.target.value) || 30})}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Az ügyfél ennyi napig fogja tudni megtekinteni a dokumentumot a link segítségével.
                    </p>
                  </div>
                  
                  <div className="mb-6 p-4 border border-gray-200 rounded bg-gray-50">
                    <h3 className="text-sm font-medium mb-2">Megjegyzések</h3>
                    <p className="text-xs text-gray-500">
                      - A megosztási link bárki számára elérhetővé teszi a dokumentumot, aki ismeri a linket<br />
                      - A linken keresztül az ügyfél elfogadhatja vagy elutasíthatja a dokumentumot<br />
                      - A megosztási link a beállított napok elteltével automatikusan lejár<br />
                      - A megosztási linkkel együtt kapott dokumentum az eredeti állapotát fogja tükrözni, akkor is ha később módosítja
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowShareForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Mégse
                    </button>
                    <button
                      onClick={handleCreateShareLink}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Link generálása
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-2">Megosztási link sikeresen létrehozva</h3>
                    <div className="mt-3 flex">
                      <input
                        type="text"
                        readOnly
                        value={shareData.shareLink}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 flex-1 sm:text-sm border-gray-300 rounded-l-md"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(shareData.shareLink);
                          showSuccess('Link vágólapra másolva');
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-r-md text-sm font-medium hover:bg-indigo-700 flex items-center"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PIN kód
                      </label>
                      <div className="flex">
                        <input
                          type="text"
                          readOnly
                          value={shareData.pin}
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 w-40 sm:text-sm border-gray-300 rounded-l-md"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(shareData.pin);
                            showSuccess('PIN kód vágólapra másolva');
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-r-md text-sm font-medium hover:bg-indigo-700 flex items-center"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-red-600 font-semibold">
                        FONTOS: Jegyezd fel ezt a PIN kódot, mert az ügyfélnek szüksége lesz rá a dokumentum megtekintéséhez!
                      </p>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-4">
                      Ezen a linken keresztül az ügyfél megtekintheti és elfogadhatja a dokumentumot a PIN kód megadása után.
                      A link {shareData.expiryDays} nap múlva fog lejárni.
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowShareForm(false)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                    >
                      Bezárás
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;