import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Upload, FileText, Archive, Clock, AlertTriangle, Download, CreditCard,
  Check, X, Info, MessageCircle, Calendar, Users, Trash2, Eye, Search,
  LogOut, Plus, Filter, ArrowUp, ArrowDown, AlertCircle, FileCheck
} from 'lucide-react';
import QRCode from 'qrcode.react';

/**
 * Componente principal do painel do projeto compartilhado
 * Melhorado para garantir o isolamento de projetos e persistência de sessão
 */
const SharedProjectDashboard = ({ project, onUpdate, onLogout }) => {
  // Estado local
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const fileInputRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFile, setPreviewFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileFilter, setFileFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  /**
   * Carregar dados do localStorage quando o componente é inicializado
   * Garantimos que apenas os dados do projeto atual sejam carregados
   */
  useEffect(() => {
    if (!project || !project._id) return;
    
    // Carregar arquivos deste projeto específico
    try {
      const savedFiles = localStorage.getItem(`project_files_${project._id}`);
      if (savedFiles) {
        const parsedFiles = JSON.parse(savedFiles);
        // Garantir que apenas os arquivos deste projeto sejam carregados
        const projectFiles = parsedFiles.filter(file => 
          file.projectId === project._id || !file.projectId
        );
        
        console.log(`Carregados ${projectFiles.length} arquivos para o projeto ${project._id}`);
        setFiles(projectFiles);
      } else {
        console.log(`Nenhum arquivo encontrado para o projeto ${project._id}`);
        setFiles([]);
      }
    } catch (error) {
      console.error("Erro ao carregar arquivos:", error);
      setFiles([]);
    }

    // Carregar comentários deste projeto específico
    try {
      const savedComments = localStorage.getItem(`project_comments_${project._id}`);
      if (savedComments) {
        const parsedComments = JSON.parse(savedComments);
        // Garantir que apenas os comentários deste projeto sejam carregados
        const projectComments = parsedComments.filter(comment => 
          comment.projectId === project._id || !comment.projectId
        );
        
        console.log(`Carregados ${projectComments.length} comentários para o projeto ${project._id}`);
        setComments(projectComments);
      } else {
        console.log(`Nenhum comentário encontrado para o projeto ${project._id}`);
        setComments([]);
      }
    } catch (error) {
      console.error("Erro ao carregar comentários:", error);
      setComments([]);
    }

    // Definir milestones do projeto
    setMilestones(project.milestones || []);
  }, [project]);

  /**
   * Salvar arquivos no localStorage quando eles mudam
   * Uso de projectId para garantir o isolamento entre projetos
   */
  useEffect(() => {
    if (!project || !project._id) return;
    
    if (files.length > 0) {
      // Garantir que todos os arquivos tenham projectId definido
      const filesWithProjectId = files.map(file => ({
        ...file,
        projectId: file.projectId || project._id
      }));
      
      localStorage.setItem(`project_files_${project._id}`, JSON.stringify(filesWithProjectId));
      console.log(`Salvos ${filesWithProjectId.length} arquivos para o projeto ${project._id}`);
    }
  }, [files, project]);

  /**
   * Salvar comentários no localStorage quando eles mudam
   * Uso de projectId para garantir o isolamento entre projetos
   */
  useEffect(() => {
    if (!project || !project._id) return;
    
    if (comments.length > 0) {
      // Garantir que todos os comentários tenham projectId definido
      const commentsWithProjectId = comments.map(comment => ({
        ...comment,
        projectId: comment.projectId || project._id
      }));
      
      localStorage.setItem(`project_comments_${project._id}`, JSON.stringify(commentsWithProjectId));
      console.log(`Salvos ${commentsWithProjectId.length} comentários para o projeto ${project._id}`);
    }
  }, [comments, project]);

  /**
   * Manipulador de upload de arquivo melhorado
   * Adiciona projectId aos arquivos para garantir o isolamento
   */
  const handleFileUpload = async (event) => {
    if (!project || !project._id) {
      showErrorMessage('Erro: Projeto não encontrado.');
      return;
    }
    
    setLoading(true);
    setIsUploading(true);
    
    try {
      const uploadedFiles = Array.from(event.target.files);
      if (uploadedFiles.length === 0) {
        setIsUploading(false);
        setLoading(false);
        return;
      }
      
      let processedFiles = 0;
      const totalFiles = uploadedFiles.length;
      
      const newFiles = await Promise.all(uploadedFiles.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          
          reader.onload = (e) => {
            processedFiles++;
            setUploadProgress(Math.round((processedFiles / totalFiles) * 100));
            
            const fileData = {
              id: Date.now() + '_' + file.name.replace(/\s+/g, '_'),
              name: file.name,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString(),
              content: e.target.result,
              projectId: project._id // Importante: associar o arquivo ao projeto
            };
            resolve(fileData);
          };
          
          reader.onerror = () => {
            processedFiles++;
            setUploadProgress(Math.round((processedFiles / totalFiles) * 100));
            console.error(`Erro ao ler o arquivo: ${file.name}`);
            resolve(null);
          };
          
          reader.readAsDataURL(file);
        });
      }));

      // Filtrar arquivos nulos (erros de leitura)
      const validFiles = newFiles.filter(file => file !== null);
      
      if (validFiles.length > 0) {
        console.log(`Adicionando ${validFiles.length} arquivos ao projeto ${project._id}`);
        setFiles(prevFiles => [...prevFiles, ...validFiles]);
        setActiveTab('files');
        showSuccessMessage(`${validFiles.length} arquivo(s) carregado(s) com sucesso!`);
      } else {
        showErrorMessage('Nenhum arquivo válido foi carregado.');
      }
      
      // Atraso para mostrar 100% antes de esconder a barra de progresso
      setTimeout(() => {
        setIsUploading(false);
      }, 500);
    } catch (error) {
      console.error('Erro ao carregar arquivo:', error);
      showErrorMessage('Erro ao processar os arquivos.');
      setIsUploading(false);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Visualização prévia de arquivo
   */
  const handleFilePreview = (file) => {
    setPreviewFile(file);
    setIsPreviewModalOpen(true);
  };

  /**
   * Excluir arquivo com confirmação
   * Mantém apenas os arquivos que pertencem ao projeto atual
   */
  const handleDeleteFile = (fileId) => {
    if (window.confirm('Tem certeza que deseja excluir este arquivo?')) {
      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      showSuccessMessage('Arquivo excluído com sucesso');
    }
  };

  /**
   * Adicionar comentário com projectId para isolamento
   */
  const handleAddComment = () => {
    if (!project || !project._id) {
      showErrorMessage('Erro: Projeto não encontrado.');
      return;
    }
    
    if (!newComment.trim()) return;
    
    const comment = {
      id: Date.now(),
      text: newComment,
      author: 'Cliente',
      timestamp: new Date().toISOString(),
      projectId: project._id // Importante: associar o comentário ao projeto
    };
    
    console.log(`Adicionando comentário ao projeto ${project._id}`);
    setComments(prevComments => [comment, ...prevComments]);
    setNewComment('');
    showSuccessMessage('Comentário adicionado com sucesso');
  };

  /**
   * Excluir comentário com confirmação
   */
  const handleDeleteComment = (commentId) => {
    if (window.confirm('Tem certeza que deseja excluir este comentário?')) {
      setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
      showSuccessMessage('Comentário excluído com sucesso');
    }
  };

  /**
   * Gerar QR code para SEPA
   */
  const generateSepaQrData = (invoice) => {
    const amount = typeof invoice.totalAmount === 'number' 
      ? invoice.totalAmount.toFixed(2) 
      : '0.00';
  
    return [
      'BCD',                                    // Service Tag
      '002',                                    // Version
      '1',                                      // Encoding
      'SCT',                                    // SEPA Credit Transfer
      'COBADEFF371',                           // BIC
      'Norbert Bartus',                        // Beneficiary name
      'DE47663400180473463800',               // IBAN
      `EUR${amount}`,                          // Amount in EUR
      '',                                      // Customer ID (empty)
      invoice.number || '',                    // Invoice number
      `RECHNUNG ${invoice.number}`             // Reference
    ].join('\n');
  };

  /**
   * Ver fatura em formato A4
   */
  const handleViewInvoice = (invoice) => {
    setViewingInvoice(invoice);
  };

  /**
   * Funções de formatação
   */
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

  const formatShortDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('hu-HU');
  };

  /**
   * Mensagens de sucesso e erro
   */
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

  /**
   * Filtrar e ordenar arquivos do projeto atual
   */
  const projectFiles = files.filter(file => file.projectId === project._id || !file.projectId);
  
  const sortedFiles = [...projectFiles]
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

  /**
   * Comentários do projeto atual
   */
  const projectComments = comments.filter(comment => 
    comment.projectId === project._id || !comment.projectId
  );

  /**
   * Calcular estatísticas
   */
  const stats = {
    totalInvoices: project.invoices?.length || 0,
    paidInvoices: project.invoices?.filter(inv => inv.status === 'fizetett').length || 0,
    pendingAmount: project.invoices?.reduce((sum, inv) => 
      inv.status !== 'fizetett' ? sum + (inv.totalAmount || 0) : sum, 0
    ) || 0,
    totalAmount: project.invoices?.reduce((sum, inv) => 
      sum + (inv.totalAmount || 0), 0
    ) || 0,
    totalFiles: sortedFiles.length,
    totalComments: projectComments.length
  };

  const pieChartData = [
    { name: 'Fizetve', value: stats.paidInvoices },
    { name: 'Függőben', value: stats.totalInvoices - stats.paidInvoices }
  ];

  const COLORS = ['#10B981', '#F59E0B'];

  /**
   * Drag and drop para upload de arquivos
   */
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
  }, [activeTab, project]);

  // Verificação de segurança
  if (!project) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-6 bg-white rounded-lg shadow-md">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Projeto não encontrado</h2>
        <p className="text-gray-600 mb-4">Não foi possível carregar os dados do projeto.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md"
        >
          Atualizar página
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Cabeçalho superior com informações do projeto e botão de saída */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <Users className="h-4 w-4 mr-1.5" />
                  <span className="mr-2">Ügyfél: {project.client?.name || 'N/A'}</span>
                  <span className="mx-1">•</span>
                  <Calendar className="h-4 w-4 mx-1" />
                  <span>Utolsó frissítés: {formatShortDate(project.updatedAt || new Date())}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                project.status === 'aktív' ? 'bg-green-100 text-green-800' :
                project.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                <div className={`mr-1.5 h-2.5 w-2.5 rounded-full ${
                  project.status === 'aktív' ? 'bg-green-500' :
                  project.status === 'befejezett' ? 'bg-blue-500' :
                  'bg-gray-500'
                }`}></div>
                {project.status}
              </span>
              <button
                onClick={onLogout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Kilépés
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mensagens de notificação */}
        {successMessage && (
          <div className="mb-6 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center shadow-sm">
            <Check className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}
        
        {errorMessage && (
          <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center shadow-sm">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {errorMessage}
          </div>
        )}

        {/* Abas de navegação */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
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
                {sortedFiles.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    {sortedFiles.length}
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
                {projectComments.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    {projectComments.length}
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
        </div>

        {/* Botão de Upload de Arquivo (Sempre Visível) */}
        {(activeTab === 'files' || activeTab === 'overview') && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center shadow"
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
        )}

        {/* Conteúdo da guia Visão Geral */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Cartões estatísticos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
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

              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Fizetve</p>
                    <p className="text-2xl font-bold">{stats.paidInvoices} db</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <FileCheck className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
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

              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
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

            {/* Gráficos e Atividades Recentes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico */}
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

              {/* Atividades Recentes */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Legutóbbi tevékenységek</h3>
                <div className="space-y-3">
                  {/* Combinar e ordenar todas as atividades */}
                  {[
                    ...sortedFiles.map(file => ({
                      type: 'file',
                      id: file.id,
                      timestamp: file.uploadedAt,
                      content: file
                    })),
                    ...projectComments.map(comment => ({
                      type: 'comment',
                      id: comment.id,
                      timestamp: comment.timestamp,
                      content: comment
                    }))
                  ]
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, 5)
                    .map((activity) => (
                      <div key={`${activity.type}_${activity.id}`} className="flex p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
                  
                  {sortedFiles.length === 0 && projectComments.length === 0 && (
                    <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg">
                      <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="font-medium">Nincs még tevékenység</p>
                      <p className="text-sm mt-1">Töltsön fel fájlokat vagy szóljon hozzá a projekthez!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo da guia Faturas */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Számlák</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {project.invoices?.length > 0 ? (
                project.invoices.map((invoice) => (
                  <div key={invoice._id || invoice.number} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium">{invoice.number}</h3>
                        <p className="text-sm text-gray-500">
                          Kiállítva: {formatShortDate(invoice.date)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Fizetési határidő: {formatShortDate(invoice.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{invoice.totalAmount} €</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.status === 'fizetett' 
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'késedelmes' 
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex justify-end space-x-3 my-3">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Számla megtekintése
                      </button>
                      <button
                        onClick={() => window.alert('A letöltés funkció fejlesztés alatt áll.')}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF letöltése
                      </button>
                    </div>

                    {/* Código QR SEPA e detalhes de pagamento */}
                    {invoice.status !== 'fizetett' && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
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

                    {/* Itens da Fatura */}
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Tételek</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leírás</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mennyiség</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Egységár</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Összesen</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {invoice.items?.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm whitespace-nowrap">{item.description}</td>
                                <td className="px-3 py-2 text-sm text-right whitespace-nowrap">{item.quantity}</td>
                                <td className="px-3 py-2 text-sm text-right whitespace-nowrap">{item.unitPrice} €</td>
                                <td className="px-3 py-2 text-sm text-right whitespace-nowrap font-medium">{item.total} €</td>
                              </tr>
                            ))}
                            <tr className="bg-gray-50">
                              <td colSpan="3" className="px-3 py-2 text-right font-medium">Összesen:</td>
                              <td className="px-3 py-2 text-right font-bold">{invoice.totalAmount} €</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-lg font-medium text-gray-600">Nincsenek még számlák a projekthez</p>
                  <p className="text-sm mt-1">A számlákat a projekthez kapcsolódóan a rendszergazda állítja ki.</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Conteúdo da guia Arquivos */}
        {activeTab === 'files' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Fájlok</h2>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Keresés..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Progresso de upload */}
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
            
            {/* Filtros e ordenação de arquivos */}
            <div className="px-6 py-3 bg-gray-50 border-b flex flex-wrap items-center justify-between">
              <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                <span className="text-sm text-gray-600 flex items-center">
                  <Filter className="h-4 w-4 mr-1" />
                  Szűrés:
                </span>
                <button
                  onClick={() => setFileFilter('all')}
                  className={`px-3 py-1 text-sm rounded ${
                    fileFilter === 'all' 
                      ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200' 
                      : 'text-gray-600 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  Összes
                </button>
                <button
                  onClick={() => setFileFilter('documents')}
                  className={`px-3 py-1 text-sm rounded ${
                    fileFilter === 'documents' 
                      ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200' 
                      : 'text-gray-600 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  Dokumentumok
                </button>
                <button
                  onClick={() => setFileFilter('images')}
                  className={`px-3 py-1 text-sm rounded ${
                    fileFilter === 'images' 
                      ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200' 
                      : 'text-gray-600 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  Képek
                </button>
              </div>
              
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2 flex items-center">
                  <ArrowDown className="h-4 w-4 mr-1" />
                  Rendezés:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="date-desc">Legújabb előre</option>
                  <option value="date-asc">Legrégebbi előre</option>
                  <option value="name">Név szerint</option>
                  <option value="size">Méret szerint</option>
                </select>
              </div>
            </div>
            
            {/* Lista de arquivos ou área de soltar */}
            <div 
              id="file-drop-area" 
              className={`divide-y divide-gray-200 ${
                sortedFiles.length === 0 ? 'border-2 border-dashed border-gray-300 rounded-lg m-6 p-10' : ''
              }`}
            >
              {sortedFiles.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fájl neve</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feltöltve</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Méret</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Műveletek</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedFiles.map((file, index) => (
                        <tr key={file.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-gray-100">
                                {file.type?.startsWith('image/') ? (
                                  <img 
                                    src={file.content} 
                                    alt={file.name}
                                    className="h-10 w-10 rounded-lg object-cover"
                                  />
                                ) : (
                                  <FileText className="h-5 w-5 text-gray-500" />
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.name}</div>
                                <div className="text-sm text-gray-500">{file.type || 'Ismeretlen típus'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{formatShortDate(file.uploadedAt)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{formatFileSize(file.size)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleFilePreview(file)}
                                className="p-1 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100"
                                title="Előnézet"
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = file.content;
                                  link.download = file.name;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="p-1 text-indigo-600 hover:text-indigo-900 rounded hover:bg-indigo-50"
                                title="Letöltés"
                              >
                                <Download className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                className="p-1 text-red-600 hover:text-red-900 rounded hover:bg-red-50"
                                title="Törlés"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10">
                  {searchTerm || fileFilter !== 'all' ? (
                    <div className="text-gray-500">
                      <Search className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                      <p className="text-lg font-medium">Nincs találat a keresési feltételeknek megfelelően</p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setFileFilter('all');
                        }}
                        className="mt-3 text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Szűrők törlése
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <Upload className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-lg font-medium">Még nincsenek feltöltött fájlok</p>
                      <p className="text-sm mt-1">Húzza ide a fájlokat vagy kattintson a feltöltés gombra</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Upload className="h-4 w-4 mr-2 inline-block" />
                        Fájlok kiválasztása
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conteúdo da guia Comentários */}
        {activeTab === 'comments' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Hozzászólások</h2>
            </div>
            
            {/* Formulário de Adição de Comentários */}
            <div className="p-6 border-b border-gray-200">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleAddComment();
              }}>
                <div className="mb-3">
                  <label htmlFor="commentText" className="block text-sm font-medium text-gray-700 mb-1">
                    Új hozzászólás
                  </label>
                  <textarea
                    id="commentText"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    rows={4}
                    placeholder="Írja ide hozzászólását..."
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Hozzászólás küldése
                  </button>
                </div>
              </form>
            </div>
            
            {/* Lista de Comentários */}
            <div className="divide-y divide-gray-200">
              {projectComments.length > 0 ? (
                projectComments.map((comment) => (
                  <div key={comment.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-800 font-bold">
                            {comment.author && comment.author[0].toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex justify-between items-center">
                          <div className="font-medium text-gray-900">{comment.author}</div>
                          <div className="text-sm text-gray-500">{formatDate(comment.timestamp)}</div>
                        </div>
                        <div className="mt-2 text-gray-700 whitespace-pre-wrap text-sm">
                          {comment.text}
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-600 hover:text-red-800 text-sm flex items-center"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Törlés
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-lg font-medium text-gray-600">Még nincsenek hozzászólások</p>
                  <p className="text-sm mt-1">Legyen Ön az első, aki hozzászól a projekthez!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Visualização de Arquivos */}
        {isPreviewModalOpen && previewFile && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-medium flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-500" />
                  {previewFile.name}
                </h3>
                <button
                  onClick={() => {
                    setPreviewFile(null);
                    setIsPreviewModalOpen(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 flex-1 overflow-auto flex items-center justify-center bg-gray-100">
                {previewFile.type?.startsWith('image/') ? (
                  <img 
                    src={previewFile.content} 
                    alt={previewFile.name}
                    className="max-w-full max-h-[600px] object-contain"
                  />
                ) : (
                  <div className="text-center p-10">
                    <FileText className="h-16 w-16 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 font-medium">A fájl előnézete nem támogatott</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {previewFile.name} ({formatFileSize(previewFile.size)})
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center p-4 border-t bg-gray-50">
                <div className="text-sm text-gray-500">
                  Feltöltve: {formatDate(previewFile.uploadedAt)}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewFile.content;
                      link.download = previewFile.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center text-sm"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Letöltés
                  </button>
                  <button
                    onClick={() => {
                      setPreviewFile(null);
                      setIsPreviewModalOpen(false);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm"
                  >
                    Bezárás
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Visualização de Fatura */}
        {viewingInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-medium flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-500" />
                  Számla: {viewingInvoice.number}
                </h3>
                <button
                  onClick={() => setViewingInvoice(null)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 flex-1 overflow-auto">
                <div className="w-full max-w-2xl mx-auto bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
                  {/* Cabeçalho da Fatura */}
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-2xl font-bold">SZÁMLA</h2>
                      <p className="text-gray-600">Számlaszám: {viewingInvoice.number}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Kelt: {formatShortDate(viewingInvoice.date)}</p>
                      <p className="text-gray-600">Fizetési határidő: {formatShortDate(viewingInvoice.dueDate)}</p>
                    </div>
                  </div>
                  
                  {/* Informações da Empresa */}
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="font-bold mb-2 text-gray-700">Szolgáltató:</h3>
                      <p className="font-medium">Norbert Bartus</p>
                      <p>NB Studio</p>
                      <p>Adószám: 12345678-1-42</p>
                      <p>1234 Budapest, Példa utca 1.</p>
                      <p>Email: info@nb-studio.net</p>
                    </div>
                    <div>
                      <h3 className="font-bold mb-2 text-gray-700">Vevő:</h3>
                      <p className="font-medium">{project.client?.name || 'N/A'}</p>
                      {project.client?.companyName && <p>{project.client.companyName}</p>}
                      {project.client?.taxNumber && <p>Adószám: {project.client.taxNumber}</p>}
                      <p>Email: {project.client?.email || 'N/A'}</p>
                      {project.client?.address && (
                        <p>
                          {project.client.address.postalCode} {project.client.address.city}, {project.client.address.street}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Tabela de Itens */}
                  <div className="mb-8">
                    <h3 className="font-bold mb-2 text-gray-700">Tételek:</h3>
                    <table className="min-w-full border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="py-2 px-3 text-left border-b border-gray-200 text-gray-700">Leírás</th>
                          <th className="py-2 px-3 text-right border-b border-gray-200 text-gray-700">Mennyiség</th>
                          <th className="py-2 px-3 text-right border-b border-gray-200 text-gray-700">Egységár</th>
                          <th className="py-2 px-3 text-right border-b border-gray-200 text-gray-700">Összesen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingInvoice.items?.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="py-2 px-3">{item.description}</td>
                            <td className="py-2 px-3 text-right">{item.quantity}</td>
                            <td className="py-2 px-3 text-right">{item.unitPrice} €</td>
                            <td className="py-2 px-3 text-right">{item.total} €</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan="3" className="py-2 px-3 text-right">Végösszeg:</td>
                          <td className="py-2 px-3 text-right">{viewingInvoice.totalAmount} €</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  {/* Informações de Pagamento */}
                  <div className="mb-8">
                    <h3 className="font-bold mb-2 text-gray-700">Fizetési információk:</h3>
                    <div className="bg-gray-50 p-3 border border-gray-200 rounded">
                      <p>IBAN: DE47 6634 0014 0743 4638 00</p>
                      <p>SWIFT/BIC: COBADEFFXXX</p>
                      <p>Bank: Commerzbank AG</p>
                      <p>Közlemény: {viewingInvoice.number}</p>
                    </div>
                  </div>
                  
                  {/* Rodapé */}
                  <div className="text-center text-gray-600 text-sm mt-12">
                    <p>Köszönjük, hogy minket választott!</p>
                    <p className="mt-1">Ez a számla elektronikusan készült és érvényes aláírás nélkül is.</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end items-center p-4 border-t bg-gray-50">
                <div className="flex space-x-3">
                  <button
                    onClick={() => window.alert('A PDF letöltés funkció fejlesztés alatt áll.')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center text-sm"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Letöltés PDF-ként
                  </button>
                  <button
                    onClick={() => setViewingInvoice(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm"
                  >
                    Bezárás
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedProjectDashboard;