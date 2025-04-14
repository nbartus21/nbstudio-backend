import React, { useState, useEffect } from 'react';
import { FileText, Upload, Search, Filter, Plus, Eye, Download, Trash, MoreHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';
import { api } from '../../services/auth';

const API_URL = import.meta.env.VITE_API_URL || 'https://admin.nb-studio.net:5001/api';

const DocumentManager = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    documentType: '',
    status: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    documentType: 'general',
    tags: ''
  });

  // Dokumentumok lekérése
  const fetchDocuments = async (page = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page,
        limit: 10,
        sort: 'createdAt',
        order: 'desc'
      });
      
      // Keresési feltétel hozzáadása, ha van
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      // Szűrők hozzáadása, ha vannak
      if (filters.documentType) {
        queryParams.append('documentType', filters.documentType);
      }
      if (filters.status) {
        queryParams.append('status', filters.status);
      }
      
      const response = await api.get(`/documents?${queryParams.toString()}`);
      
      if (response.status === 200) {
        setDocuments(response.data.documents || []);
        setTotalPages(response.data.pagination.pages || 1);
        setCurrentPage(response.data.pagination.page || 1);
      }
    } catch (err) {
      console.error('Hiba a dokumentumok lekérésekor:', err);
      setError('Nem sikerült betölteni a dokumentumokat. Kérjük, próbálja újra később.');
    } finally {
      setLoading(false);
    }
  };

  // Komponens betöltésekor lekérjük a dokumentumokat
  useEffect(() => {
    fetchDocuments();
  }, [searchTerm, filters]);

  // Oldal váltása
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchDocuments(newPage);
    }
  };

  // Dokumentum törlése
  const handleDeleteDocument = async (id) => {
    if (window.confirm('Biztosan törölni szeretné ezt a dokumentumot?')) {
      try {
        const response = await api.delete(`/documents/${id}`);
        if (response.status === 200) {
          // Újra lekérjük a dokumentumokat a frissített lista megjelenítéséhez
          fetchDocuments(currentPage);
        }
      } catch (err) {
        console.error('Hiba a dokumentum törlésekor:', err);
        setError('Nem sikerült törölni a dokumentumot. Kérjük, próbálja újra később.');
      }
    }
  };

  // Dokumentum letöltése
  const handleDownloadDocument = (documentId, fileName) => {
    window.open(`${API_URL}/documents/${documentId}/download`, '_blank');
  };

  // Dokumentum megtekintése
  const handleViewDocument = (documentId) => {
    window.open(`${API_URL}/documents/${documentId}/view`, '_blank');
  };

  // Fájl kiválasztása
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  // Űrlap mező változtatása
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setUploadForm(prev => ({ ...prev, [name]: value }));
  };

  // Dokumentum feltöltése
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Kérjük, válasszon ki egy fájlt a feltöltéshez!');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', uploadForm.title);
    formData.append('description', uploadForm.description);
    formData.append('documentType', uploadForm.documentType);
    
    // Ha vannak címkék, hozzáadjuk őket
    if (uploadForm.tags) {
      formData.append('tags', uploadForm.tags);
    }
    
    try {
      const response = await api.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.status === 201) {
        // Sikeres feltöltés után bezárjuk a modált és frissítjük a listát
        setShowUploadModal(false);
        setSelectedFile(null);
        setUploadForm({
          title: '',
          description: '',
          documentType: 'general',
          tags: ''
        });
        fetchDocuments();
      }
    } catch (err) {
      console.error('Hiba a dokumentum feltöltésekor:', err);
      setError('Nem sikerült feltölteni a dokumentumot. Kérjük, próbálja újra később.');
    }
  };

  // Dokumentum típusok és státuszok
  const documentTypes = [
    { value: '', label: 'Összes típus' },
    { value: 'general', label: 'Általános' },
    { value: 'contract', label: 'Szerződés' },
    { value: 'invoice', label: 'Számla' },
    { value: 'report', label: 'Jelentés' },
    { value: 'proposal', label: 'Árajánlat' }
  ];
  
  const documentStatuses = [
    { value: '', label: 'Összes státusz' },
    { value: 'active', label: 'Aktív' },
    { value: 'archived', label: 'Archivált' },
    { value: 'pending', label: 'Függőben' }
  ];

  // Feltöltési modál
  const UploadModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Új dokumentum feltöltése</h2>
        
        <form onSubmit={handleUploadDocument}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Fájl kiválasztása
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="border rounded w-full py-2 px-3 text-gray-700 focus:outline-blue-500"
              required
            />
            {selectedFile && (
              <p className="mt-1 text-sm text-gray-500">
                Kiválasztott fájl: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Cím
            </label>
            <input
              type="text"
              name="title"
              value={uploadForm.title}
              onChange={handleFormChange}
              className="border rounded w-full py-2 px-3 text-gray-700 focus:outline-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Leírás
            </label>
            <textarea
              name="description"
              value={uploadForm.description}
              onChange={handleFormChange}
              className="border rounded w-full py-2 px-3 text-gray-700 focus:outline-blue-500"
              rows="3"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Dokumentum típusa
            </label>
            <select
              name="documentType"
              value={uploadForm.documentType}
              onChange={handleFormChange}
              className="border rounded w-full py-2 px-3 text-gray-700 focus:outline-blue-500"
            >
              {documentTypes.filter(type => type.value !== '').map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Címkék (vesszővel elválasztva)
            </label>
            <input
              type="text"
              name="tags"
              value={uploadForm.tags}
              onChange={handleFormChange}
              className="border rounded w-full py-2 px-3 text-gray-700 focus:outline-blue-500"
              placeholder="pl.: fontos, szerződés, projekt"
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Mégse
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              Feltöltés
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dokumentumkezelő</h1>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center"
        >
          <Plus className="mr-2" size={16} />
          Új dokumentum
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="col-span-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Keresés dokumentumok között..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border rounded-md focus:outline-blue-500"
              />
              <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
            </div>
          </div>
          
          <div>
            <select
              value={filters.documentType}
              onChange={(e) => setFilters(prev => ({ ...prev, documentType: e.target.value }))}
              className="w-full py-2 px-3 border rounded-md focus:outline-blue-500"
            >
              {documentTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full py-2 px-3 border rounded-md focus:outline-blue-500"
            >
              {documentStatuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FileText className="mx-auto text-gray-400" size={48} />
          <h3 className="mt-4 text-xl font-medium text-gray-900">Nincsenek dokumentumok</h3>
          <p className="mt-2 text-gray-500">
            {searchTerm || filters.documentType || filters.status
              ? 'A keresési feltételeknek megfelelő dokumentumok nem találhatók.'
              : 'Még nincsenek feltöltött dokumentumok. Kattintson az "Új dokumentum" gombra a feltöltéshez.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dokumentum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Típus
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feltöltés dátuma
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Státusz
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Műveletek
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded">
                          <FileText size={18} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {doc.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {doc.description || 'Nincs leírás'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {documentTypes.find(t => t.value === doc.documentType)?.label || doc.documentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString('hu-HU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        doc.status === 'active' ? 'bg-green-100 text-green-800' :
                        doc.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.status === 'active' ? 'Aktív' :
                         doc.status === 'archived' ? 'Archivált' :
                         doc.status === 'pending' ? 'Függőben' : doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDocument(doc._id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Megtekintés"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleDownloadDocument(doc._id, doc.title)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Letöltés"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Törlés"
                      >
                        <Trash size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <nav className="inline-flex shadow-sm -space-x-px">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                    currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <ArrowLeft size={16} />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === i + 1 ? 'bg-blue-50 text-blue-600 z-10' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                    currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <ArrowRight size={16} />
                </button>
              </nav>
            </div>
          )}
        </>
      )}
      
      {showUploadModal && <UploadModal />}
    </div>
  );
};

export default DocumentManager; 