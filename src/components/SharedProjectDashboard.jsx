import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Upload, FileText, Archive, Clock, AlertTriangle, Download, CreditCard,
  Check, X, Info, Edit, Monitor, Server, Bell, Users, MessageCircle, 
  Calendar, Link, Paperclip, Trash2, DownloadCloud, Eye, Search
} from 'lucide-react';
import QRCode from 'qrcode.react';

const SharedProjectDashboard = ({ project, onUpdate }) => {
  const [files, setFiles] = useState([]);
  const [logEntry, setLogEntry] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const fileInputRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [projectDocuments, setProjectDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFile, setPreviewFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileFilter, setFileFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  // Adatok betöltése a komponens inicializálásakor
  useEffect(() => {
    const savedFiles = localStorage.getItem(`project_${project._id}_files`);
    if (savedFiles) {
      setFiles(JSON.parse(savedFiles));
    }

    const savedComments = localStorage.getItem(`project_${project._id}_comments`);
    if (savedComments) {
      setComments(JSON.parse(savedComments));
    }

    setMilestones(project.milestones || []);
    setProjectDocuments(project.documents || []);
  }, [project._id]);

  // Fájlok mentése localStorage-ba amikor változnak
  useEffect(() => {
    if (files.length > 0) {
      localStorage.setItem(`project_${project._id}_files`, JSON.stringify(files));
    }
  }, [files, project._id]);

  // Kommentek mentése localStorage-ba amikor változnak
  useEffect(() => {
    if (comments.length > 0) {
      localStorage.setItem(`project_${project._id}_comments`, JSON.stringify(comments));
    }
  }, [comments, project._id]);

  const handleFileUpload = async (event) => {
    setLoading(true);
    try {
      const uploadedFiles = Array.from(event.target.files);
      if (uploadedFiles.length === 0) return;
      
      const newFiles = await Promise.all(uploadedFiles.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const fileData = {
              id: Date.now() + '_' + file.name.replace(/\s+/g, '_'),
              name: file.name,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString(),
              content: e.target.result
            };
            resolve(fileData);
          };
          reader.readAsDataURL(file);
        });
      }));

      setFiles(prevFiles => [...prevFiles, ...newFiles]);
      setActiveTab('files');
      showSuccessMessage('Fájl(ok) sikeresen feltöltve!');
    } catch (error) {
      console.error('Hiba a fájl feltöltésekor:', error);
      showErrorMessage('Hiba történt a fájl feltöltése során');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFile = (fileId) => {
    if (window.confirm('Biztosan törölni szeretné ezt a fájlt?')) {
      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      const updatedFiles = files.filter(file => file.id !== fileId);
      localStorage.setItem(`project_${project._id}_files`, JSON.stringify(updatedFiles));
      showSuccessMessage('Fájl sikeresen törölve');
    }
  };

  const handleDownloadFile = (file) => {
    try {
      const link = document.createElement('a');
      link.href = file.content;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Hiba a fájl letöltésekor:', error);
      showErrorMessage('Nem sikerült letölteni a fájlt');
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment = {
      id: Date.now(),
      text: newComment,
      author: 'Ügyfél',
      timestamp: new Date().toISOString()
    };
    
    setComments(prevComments => [comment, ...prevComments]);
    setNewComment('');
    showSuccessMessage('Hozzászólás sikeresen hozzáadva');
  };

  const handleDeleteComment = (commentId) => {
    if (window.confirm('Biztosan törölni szeretné ezt a hozzászólást?')) {
      setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
      showSuccessMessage('Hozzászólás sikeresen törölve');
    }
  };

  // SEPA átutalási QR kód generálása
  const generateSepaQrData = (invoice) => {
    const amount = typeof invoice.totalAmount === 'number' 
      ? invoice.totalAmount.toFixed(2) 
      : '0.00';
  
    return [
      'BCD',                                    // Service Tag (fix)
      '002',                                    // Verzió (fix)
      '1',                                      // Karakterkódolás (fix)
      'SCT',                                    // SEPA Credit Transfer (fix)
      'COBADEFF371',                           // Commerzbank Bruchsal BIC
      'Norbert Bartus',                        // Kedvezményezett neve
      'DE47663400180473463800',               // IBAN (nem változott)
      `EUR${amount}`,                          // Összeg EUR-ban
      '',                                      // Vevőazonosító (üres)
      invoice.number || '',                    // Számlaszám
      `RECHNUNG ${invoice.number}`             // Közlemény
    ].join('\n');
  };

  // Statisztikák számítása
  const stats = {
    totalInvoices: project.invoices?.length || 0,
    paidInvoices: project.invoices?.filter(inv => inv.status === 'fizetett').length || 0,
    pendingAmount: project.invoices?.reduce((sum, inv) => 
      inv.status !== 'fizetett' ? sum + (inv.totalAmount || 0) : sum, 0
    ) || 0,
    totalAmount: project.invoices?.reduce((sum, inv) => 
      sum + (inv.totalAmount || 0), 0
    ) || 0,
    totalFiles: files.length,
    totalComments: comments.length
  };

  const pieChartData = [
    { name: 'Fizetve', value: stats.paidInvoices },
    { name: 'Függőben', value: stats.totalInvoices - stats.paidInvoices }
  ];

  const COLORS = ['#10B981', '#F59E0B'];

  // Sikeres és hibaüzenetek kezelése
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const showErrorMessage = (message) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage('');
    }, 3000);
  };

  // Formázó függvények
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fájlok szűrése és rendezése
  const sortedFiles = [...files]
    .filter(file => {
      const matchesSearch = searchTerm ? 
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      
      let matchesType = true;
      if (fileFilter === 'documents') {
        matchesType = !file.type?.startsWith('image/');
      } else if (fileFilter === 'images') {
        matchesType = file.type?.startsWith('image/');
      }
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      } else if (sortBy === 'date-asc') {
        return new Date(a.uploadedAt) - new Date(b.uploadedAt);
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        return b.size - a.size;
      }
      return 0;
    });

  // Drag and drop támogatás
  useEffect(() => {
    if (activeTab !== 'files') return;
    
    const dropArea = document.getElementById('file-drop-area');
    if (!dropArea) return;
    
    const highlight = () => dropArea.classList.add('border-blue-400', 'bg-blue-50');
    const unhighlight = () => dropArea.classList.remove('border-blue-400', 'bg-blue-50');
    
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      highlight();
    };
    
    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      unhighlight();
    };
    
    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      unhighlight();
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload({ target: { files: e.dataTransfer.files } });
      }
    };
    
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    
    return () => {
      dropArea.removeEventListener('dragover', handleDragOver);
      dropArea.removeEventListener('dragleave', handleDragLeave);
      dropArea.removeEventListener('drop', handleDrop);
    };
  }, [activeTab]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Projekt fejléc */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="mt-1 text-gray-500">{project.description}</p>
              </div>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  project.status === 'aktív' ? 'bg-green-100 text-green-800' :
                  project.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  <div className="flex items-center">
                    <div className={`mr-1.5 h-2.5 w-2.5 rounded-full ${
                      project.status === 'aktív' ? 'bg-green-500' :
                      project.status === 'befejezett' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }`}></div>
                    {project.status}
                  </div>
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm text-gray-500">
              <Users className="h-4 w-4 mr-1.5" />
              <span>Ügyfél: {project.client?.name || 'N/A'}</span>
              <span className="mx-2">•</span>
              <Calendar className="h-4 w-4 mr-1.5" />
              <span>Utolsó frissítés: {formatDate(project.updatedAt || new Date())}</span>
            </div>
          </div>
        </div>

        {/* Sikerüzenetek és hibaüzenetek */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center">
            <Check className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}
        
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {errorMessage}
          </div>
        )}

        {/* Fájlfeltöltés gomb - mindig látható */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Feltöltés...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Fájl feltöltése
              </>
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple
          />
        </div>

        {/* Navigációs fülek */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Áttekintés
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`${
                activeTab === 'invoices'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
            >
              Számlák
              {project.invoices && project.invoices.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  {project.invoices.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`${
                activeTab === 'files'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
            >
              Fájlok
              {files.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  {files.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`${
                activeTab === 'comments'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
            >
              Hozzászólások
              {comments.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  {comments.length}
                </span>
              )}
            </button>
            {milestones.length > 0 && (
              <button
                onClick={() => setActiveTab('milestones')}
                className={`${
                  activeTab === 'milestones'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Mérföldkövek
              </button>
            )}
          </nav>
        </div>

        {/* Áttekintés nézet */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statisztikai kártyák */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Összes számla</p>
                    <p className="text-2xl font-bold">{stats.totalInvoices} db</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Fizetve</p>
                    <p className="text-2xl font-bold">{stats.paidInvoices} db</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Függő összeg</p>
                    <p className="text-2xl font-bold">{stats.pendingAmount} €</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Teljes összeg</p>
                    <p className="text-2xl font-bold">{stats.totalAmount} €</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Archive className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Projekt Tevékenység & Státusz */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grafikon */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Számlák Állapota</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} db`, 'Mennyiség']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Legutóbbi tevékenységek */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Legutóbbi tevékenységek</h3>
                <div className="space-y-4">
                  {/* Kombinált és rendezett tevékenységek */}
                  {[
                    ...files.map(file => ({
                      type: 'file',
                      id: file.id,
                      timestamp: file.uploadedAt,
                      content: file
                    })),
                    ...comments.map(comment => ({
                      type: 'comment',
                      id: comment.id,
                      timestamp: comment.timestamp,
                      content: comment
                    }))
                  ]
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, 5)
                    .map((activity) => (
                      <div key={`${activity.type}_${activity.id}`} className="flex p-3 bg-gray-50 rounded-lg">
                        <div className="mr-4">
                          {activity.type === 'file' ? (
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <MessageCircle className="h-5 w-5 text-green-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {activity.type === 'file' 
                              ? `Új fájl feltöltve: ${activity.content.name}`
                              : `Új hozzászólás: ${activity.content.author}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {activity.type === 'file'
                              ? `Méret: ${formatFileSize(activity.content.size)}`
                              : activity.content.text.substring(0, 50) + (activity.content.text.length > 50 ? '...' : '')}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(activity.timestamp)}
                          </p>
                        </div>
                        <div>
                          <button
                            onClick={() => activity.type === 'file' 
                              ? setActiveTab('files')
                              : setActiveTab('comments')}
                            className="text-indigo-600 hover:text-indigo-800 text-sm"
                          >
                            Megtekintés
                          </button>
                        </div>
                      </div>
                    ))}
                  
                  {files.length === 0 && comments.length === 0 && (
                    <div className="text-center text-gray-500 py-6">
                      Nincs még tevékenység. Töltsön fel fájlokat vagy szóljon hozzá a projekthez!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Számlák nézet */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Számlák</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {project.invoices?.length > 0 ? (
                project.invoices.map((invoice) => (
                  <div key={invoice._id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium">{invoice.number}</h3>
                        <p className="text-sm text-gray-500">
                          Kiállítva: {new Date(invoice.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          Fizetési határidő: {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{invoice.totalAmount} €</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.status === 'fizetett' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>

                    {/* SEPA QR kód és fizetési adatok */}
                    {invoice.status !== 'fizetett' && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium mb-2">Banki átutalás</h4>
                            <p className="text-sm">IBAN: DE47 6634 0014 0743 4638 00</p>
                            <p className="text-sm">SWIFT/BIC: COBADEFFXXX</p>
                            <p className="text-sm">Bank: Commerzbank AG</p>
                            <p className="text-sm mt-2">Közlemény: {invoice.number}</p>
                          </div>
                          <div className="flex justify-center">
                            <div>
                              <QRCode 
                                value={generateSepaQrData(invoice)}
                                size={150}
                                level="M"
                              />
                              <p className="text-xs text-gray-500 mt-2 text-center">
                                Szkennelje be a QR kódot a banki alkalmazással
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Számla tételek */}
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Tételek</h4>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Leírás</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Mennyiség</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Egységár</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Összesen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {invoice.items?.map((item, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 text-sm">{item.description}</td>
                              <td className="px-3 py-2 text-sm text-right">{item.quantity}</td>
                              <td className="px-3 py-2 text-sm text-right">{item.unitPrice} €</td>
                              <td className="px-3 py-2 text-sm text-right">{item.total} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  Nincsenek még számlák a projekthez
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fájlok nézet */}
{activeTab === 'files' && (
  <div className="bg-white rounded-lg shadow">
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Fájlok</h2>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Keresés..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Feltöltés
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
          />
        </div>
      </div>
    </div>
    
    {/* Upload progress */}
    {isUploading && (
      <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center">
          <div className="mr-3">
            <Upload className="h-5 w-5 text-blue-500 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-700">Feltöltés folyamatban...</span>
              <span className="text-xs text-blue-600">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    )}
    
    {/* Filter controls */}
    <div className="px-6 py-3 bg-gray-50 border-b flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setFileFilter('all')}
          className={`px-3 py-1 text-sm rounded ${
            fileFilter === 'all' 
              ? 'bg-blue-100 text-blue-700 font-medium' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Összes
        </button>
        <button
          onClick={() => setFileFilter('documents')}
          className={`px-3 py-1 text-sm rounded ${
            fileFilter === 'documents' 
              ? 'bg-blue-100 text-blue-700 font-medium' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Dokumentumok
        </button>
        <button
          onClick={() => setFileFilter('images')}
          className={`px-3 py-1 text-sm rounded ${
            fileFilter === 'images' 
              ? 'bg-blue-100 text-blue-700 font-medium' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Képek
        </button>
      </div>
      
      <div className="flex items-center">
        <span className="text-sm text-gray-500 mr-2">Rendezés:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-sm border rounded px-2 py-1 bg-white"
        >
          <option value="date-desc">Legújabb előre</option>
          <option value="date-asc">Legrégebbi előre</option>
          <option value="name">Név szerint</option>
          <option value="size">Méret szerint</option>
        </select>
      </div>
    </div>
    
    {/* File list */}
    <div 
      id="file-drop-area" 
      className={`divide-y divide-gray-200 ${
        files.length === 0 ? 'border-2 border-dashed border-gray-300 rounded-lg m-6' : ''
      }`}
    >
      {sortedFiles.length > 0 ? sortedFiles.map((file, index) => (
        <div key={index} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="font-medium">{file.name}</p>
              <div className="flex items-center text-sm text-gray-500">
                <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                <span className="mx-2">•</span>
                <span>{formatFileSize(file.size)}</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleFilePreview(file)}
              className="p-1 text-gray-600 hover:text-gray-800 rounded hover:bg-gray-100"
              title="Előnézet"
            >
              <Eye className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                const blob = new Blob([file.content], { type: 'application/octet-stream' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                a.click();
                window.URL.revokeObjectURL(url);
              }}
              className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50"
              title="Letöltés"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleDeleteFile(index)}
              className="p-1 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
              title="Törlés"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      )) : (
        <div className="py-10 text-center">
          {searchTerm || fileFilter !== 'all' ? (
            <div className="text-gray-500">
              <Search className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p>Nincs találat a keresési feltételeknek megfelelően</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFileFilter('all');
                }}
                className="mt-3 text-blue-600 hover:text-blue-800"
              >
                Szűrők törlése
              </button>
            </div>
          ) : (
            <div className="text-gray-500">
              <Upload className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>Még nincsenek feltöltött fájlok</p>
              <p className="text-sm mt-1">Húzd ide a fájlokat vagy kattints a feltöltés gombra</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Fájlok kiválasztása
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    
    {/* File preview modal */}
    {previewFile && (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-3xl w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gray-500" />
              {previewFile.name}
            </h3>
            <button
              onClick={() => setPreviewFile(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="bg-gray-100 rounded-lg p-4 min-h-[300px] mb-4 flex items-center justify-center">
            {previewFile.type?.startsWith('image/') ? (
              <img 
                src={URL.createObjectURL(new Blob([previewFile.content], { type: previewFile.type }))} 
                alt={previewFile.name}
                className="max-w-full max-h-[400px] object-contain"
              />
            ) : (
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">A fájl előnézete nem elérhető</p>
                <p className="text-sm text-gray-500 mt-2">
                  {previewFile.name} ({formatFileSize(previewFile.size)})
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-between">
            <div className="text-sm text-gray-500">
              Feltöltve: {new Date(previewFile.uploadedAt).toLocaleString()}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  const blob = new Blob([previewFile.content], { type: 'application/octet-stream' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = previewFile.name;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Download className="h-4 w-4 mr-1" />
                Letöltés
              </button>
              <button
                onClick={() => setPreviewFile(null)}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
)}

</div>
    </div>
  );
};

export default SharedProjectDashboard;