import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { api } from '../services/auth';
import { 
  Calendar, Clock, Languages, Check, AlertTriangle, 
  Save, Eye, ArrowLeft, Plus, Trash2, Edit, Copy, 
  RefreshCw, Globe, Clock8, ListFilter, Search, 
  Layers, CheckCircle2, XCircle
} from 'lucide-react';

// Import deepseekService and other services
import { 
  generateBlogContent, 
  generateTitle, 
  generateSEODescription, 
  translateContent 
} from '../services/chatGptService';
import { deepseekService } from '../services/deepseekService';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const BlogManagement = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // States for posts management
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // States for post editing
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState('hu');
  
  // States for filtering and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // States for content generation
  const [topic, setTopic] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [contentLength, setContentLength] = useState('medium');
  const [generationMethod, setGenerationMethod] = useState('deepseek');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Default empty post structure
  const emptyPost = {
    title: { hu: '', en: '', de: '' },
    content: { hu: '', en: '', de: '' },
    excerpt: { hu: '', en: '', de: '' },
    slug: '',
    tags: [],
    published: false,
    scheduledDate: ''
  };

  // Fetch all posts on component mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Initialize editing mode if ID is provided
  useEffect(() => {
    if (id) {
      handleEditPost(id);
    } else {
      setIsEditing(false);
      setCurrentPost(null);
    }
  }, [id]);

  // Update filtered posts when posts, search term or status filter changes
  useEffect(() => {
    filterPosts();
  }, [posts, searchTerm, statusFilter]);

  // Fetch posts from API
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/posts`);
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      setError('Blog bejegyzések betöltése sikertelen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter posts based on search term and status filter
  const filterPosts = () => {
    let filtered = [...posts];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(post => 
        Object.values(post.title).some(title => 
          title.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        post.slug.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      const now = new Date();
      
      if (statusFilter === 'published') {
        filtered = filtered.filter(post => post.published);
      } else if (statusFilter === 'scheduled') {
        filtered = filtered.filter(post => 
          !post.published && post.scheduledDate && new Date(post.scheduledDate) > now
        );
      } else if (statusFilter === 'draft') {
        filtered = filtered.filter(post => 
          !post.published && (!post.scheduledDate || new Date(post.scheduledDate) <= now)
        );
      }
    }
    
    // Sort by creation date, newest first
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    setFilteredPosts(filtered);
  };

  // Handle creating a new post
  const handleNewPost = () => {
    setCurrentPost({...emptyPost, scheduledDate: getFormattedDate()});
    setIsEditing(true);
    setCurrentLanguage('hu');
    navigate('/blog/new');
  };

  // Handle editing an existing post
  const handleEditPost = async (postId) => {
    try {
      setLoading(true);
      const postToEdit = posts.find(p => p._id === postId);
      
      if (postToEdit) {
        setCurrentPost({
          ...postToEdit,
          scheduledDate: postToEdit.scheduledDate ? new Date(postToEdit.scheduledDate).toISOString().slice(0, 16) : ''
        });
        setIsEditing(true);
        setCurrentLanguage('hu');
        navigate(`/blog/edit/${postId}`);
      } else {
        const response = await api.get(`${API_URL}/posts/${postId}`);
        const data = await response.json();
        setCurrentPost({
          ...data,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate).toISOString().slice(0, 16) : ''
        });
        setIsEditing(true);
        setCurrentLanguage('hu');
      }
    } catch (err) {
      setError('Bejegyzés betöltése sikertelen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle saving a post (create or update)
  const handleSavePost = async () => {
    try {
      setLoading(true);
      setError('');

      const postData = {
        ...currentPost,
        scheduledDate: currentPost.scheduledDate ? new Date(currentPost.scheduledDate).toISOString() : null
      };
      
      let response;
      
      if (currentPost._id) {
        // Update existing post
        response = await api.put(`${API_URL}/posts/${currentPost._id}`, postData);
        setSuccess('Bejegyzés sikeresen frissítve!');
      } else {
        // Create new post
        if (!postData.slug) {
          postData.slug = generateSlug(postData.title.en || postData.title.hu);
        }
        response = await api.post(`${API_URL}/posts`, postData);
        setSuccess('Bejegyzés sikeresen létrehozva!');
      }
      
      await fetchPosts();
      setIsEditing(false);
      navigate('/blog');
    } catch (err) {
      setError('Bejegyzés mentése sikertelen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a post
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a bejegyzést?')) {
      return;
    }
    
    try {
      setLoading(true);
      await api.delete(`${API_URL}/posts/${postId}`);
      setSuccess('Bejegyzés sikeresen törölve!');
      await fetchPosts();
    } catch (err) {
      setError('Bejegyzés törlése sikertelen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate blog content using AI
  const generateContent = async () => {
    if (!topic) {
      setError('Kérlek add meg a blog témáját');
      return;
    }

    try {
      setIsGenerating(true);
      setError('');

      let content, title, excerpt;
      
      // Determine the target character count based on selected length
      const targetCharCount = contentLength === 'short' ? 1000 : 
                              contentLength === 'medium' ? 1250 : 1500;
                              
      // Generate content using selected method
      if (generationMethod === 'deepseek') {
        // Use deepseekService for content generation
        [content, title, excerpt] = await Promise.all([
          deepseekService.generateBlogContent(topic, 'hu', targetCharCount),
          deepseekService.generateTitle(topic, 'hu'),
          deepseekService.generateSEODescription(topic, 'hu')
        ]);
      } else {
        // Use original chatGptService
        [content, title, excerpt] = await Promise.all([
          generateBlogContent(topic, 'hu'),
          generateTitle(topic, 'hu'),
          generateSEODescription(topic, 'hu')
        ]);
      }

      // Update current post with generated content for Hungarian
      setCurrentPost(prev => ({
        ...prev,
        title: { ...prev.title, hu: title },
        content: { ...prev.content, hu: content },
        excerpt: { ...prev.excerpt, hu: excerpt },
        slug: generateSlug(title)
      }));
      
      setSuccess('Magyar tartalom generálva! Fordítások előkészítése folyamatban...');
      
      // Generate content for other languages
      await generateTranslations(content, title, excerpt);
      
    } catch (err) {
      setError('Tartalomgenerálás sikertelen: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate translations for other languages
  const generateTranslations = async (huContent, huTitle, huExcerpt) => {
    try {
      // Determine which service to use for translations
      const translateFunc = generationMethod === 'deepseek' ? 
        deepseekService.translateContent : translateContent;
      
      // Generate translations for English and German
      const [enContent, deContent, enTitle, deTitle, enExcerpt, deExcerpt] = await Promise.all([
        translateFunc(huContent, 'hu', 'en'),
        translateFunc(huContent, 'hu', 'de'),
        translateFunc(huTitle, 'hu', 'en'),
        translateFunc(huTitle, 'hu', 'de'),
        translateFunc(huExcerpt, 'hu', 'en'),
        translateFunc(huExcerpt, 'hu', 'de')
      ]);
      
      // Update current post with all languages
      setCurrentPost(prev => ({
        ...prev,
        title: { hu: huTitle, en: enTitle, de: deTitle },
        content: { hu: huContent, en: enContent, de: deContent },
        excerpt: { hu: huExcerpt, en: enExcerpt, de: deExcerpt }
      }));
      
      setSuccess('Tartalom minden nyelven sikeresen legenerálva!');
    } catch (err) {
      setError('Fordítás sikertelen: ' + err.message);
    }
  };

  // Generate a slug from a title
  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60); // Limit slug length
  };

  // Get formatted date for datetime-local input
  const getFormattedDate = (date = new Date()) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  // Get minimum datetime value (now)
  const getMinDateTimeValue = () => {
    return getFormattedDate();
  };

  // Handle editor content change
  const handleEditorChange = (content) => {
    setCurrentPost(prev => ({
      ...prev,
      content: { ...prev.content, [currentLanguage]: content }
    }));
  };

  // Handle post status change
  const handleStatusChange = (status) => {
    if (status === 'published') {
      setCurrentPost(prev => ({
        ...prev,
        published: true,
        scheduledDate: ''
      }));
    } else if (status === 'scheduled') {
      setCurrentPost(prev => ({
        ...prev,
        published: false,
        scheduledDate: prev.scheduledDate || getFormattedDate(new Date(Date.now() + 86400000)) // tomorrow
      }));
    } else {
      setCurrentPost(prev => ({
        ...prev,
        published: false,
        scheduledDate: ''
      }));
    }
  };

  // Back to list view
  const handleBackToList = () => {
    setIsEditing(false);
    setCurrentPost(null);
    navigate('/blog');
  };

  // Calculate word and character count
  const getContentStats = (content) => {
    if (!content) return { words: 0, chars: 0 };
    
    // Remove HTML tags for accurate counting
    const textContent = content.replace(/<[^>]*>/g, ' ');
    const words = textContent.split(/\s+/).filter(Boolean).length;
    const chars = textContent.replace(/\s+/g, '').length;
    
    return { words, chars };
  };

  // Determine if the character count is within the target range
  const getContentLengthStatus = (content) => {
    const { chars } = getContentStats(content || '');
    if (chars < 1000) return 'too-short';
    if (chars > 1500) return 'too-long';
    return 'good';
  };

  // Determine CSS class based on content length status
  const getContentLengthClass = (status) => {
    switch(status) {
      case 'too-short': return 'text-red-500';
      case 'too-long': return 'text-yellow-500';
      case 'good': return 'text-green-500';
      default: return '';
    }
  };

  // Render edit/create form
  if (isEditing) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        {/* Top bar with back button and actions */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Vissza a bejegyzésekhez
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={handleSavePost}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Mentés...' : 'Bejegyzés mentése'}
            </button>
            
            <div className="relative group">
              <button
                className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                {currentPost?.published ? (
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                ) : currentPost?.scheduledDate ? (
                  <Clock8 className="w-4 h-4 mr-2 text-blue-600" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2 text-gray-600" />
                )}
                {currentPost?.published ? 'Közzétéve' : currentPost?.scheduledDate ? 'Ütemezve' : 'Vázlat'}
              </button>
              
              {/* Status dropdown menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
                <div className="py-1">
                  <button
                    onClick={() => handleStatusChange('published')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                    Közzététel most
                  </button>
                  <button
                    onClick={() => handleStatusChange('scheduled')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    <Clock8 className="w-4 h-4 mr-2 text-blue-600" />
                    Ütemezés
                  </button>
                  <button
                    onClick={() => handleStatusChange('draft')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    <XCircle className="w-4 h-4 mr-2 text-gray-600" />
                    Mentés vázlatként
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
            <Check className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Main content column */}
          <div className="col-span-12 lg:col-span-8">
            {/* Language selector */}
            <div className="flex justify-between items-center mb-4 bg-gray-100 p-3 rounded-md">
              <div className="flex space-x-2">
                {['hu', 'en', 'de'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCurrentLanguage(lang)}
                    className={`px-3 py-1 rounded-md ${
                      currentLanguage === lang
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
              <Languages className="h-5 w-5 text-gray-500" />
            </div>
            
            {/* Title input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cím ({currentLanguage.toUpperCase()})
              </label>
              <input
                type="text"
                value={currentPost?.title?.[currentLanguage] || ''}
                onChange={(e) => setCurrentPost(prev => ({
                  ...prev,
                  title: { ...prev.title, [currentLanguage]: e.target.value }
                }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Add meg a címet ${currentLanguage.toUpperCase()} nyelven`}
              />
            </div>
            
            {/* Content editor */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tartalom ({currentLanguage.toUpperCase()})
              </label>
              <Editor
                apiKey="kshcdddb1ogetllqn5eoqe0xny2tf1hhr9xf4e69hrdmy667"
                value={currentPost?.content?.[currentLanguage] || ''}
                onEditorChange={handleEditorChange}
                init={{
                  height: 500,
                  menubar: false,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                    'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
                    'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | link | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                }}
              />
              
              {/* Character count */}
              {currentPost?.content && (
                <div className="mt-2 text-sm flex items-center">
                  <span className={getContentLengthClass(getContentLengthStatus(currentPost.content[currentLanguage]))}>
                    {getContentStats(currentPost.content[currentLanguage]).chars} karakter
                    / {getContentStats(currentPost.content[currentLanguage]).words} szó
                  </span>
                  {getContentLengthStatus(currentPost.content[currentLanguage]) === 'too-short' && (
                    <span className="ml-2 text-red-500">(Minimum 1000 karakter ajánlott)</span>
                  )}
                  {getContentLengthStatus(currentPost.content[currentLanguage]) === 'too-long' && (
                    <span className="ml-2 text-yellow-500">(Maximum 1500 karakter ajánlott)</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Excerpt input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kivonat / Meta leírás ({currentLanguage.toUpperCase()})
              </label>
              <textarea
                value={currentPost?.excerpt?.[currentLanguage] || ''}
                onChange={(e) => setCurrentPost(prev => ({
                  ...prev,
                  excerpt: { ...prev.excerpt, [currentLanguage]: e.target.value }
                }))}
                rows="3"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Add meg a kivonatot ${currentLanguage.toUpperCase()} nyelven (max 160 karakter a SEO szempontjából)`}
              />
              <div className="mt-1 text-xs text-gray-500 flex justify-between">
                <span>Keresési találatokhoz és közösségi megosztáshoz használva</span>
                <span className={currentPost?.excerpt?.[currentLanguage]?.length > 160 ? 'text-red-500' : ''}>
                  {currentPost?.excerpt?.[currentLanguage]?.length || 0}/160
                </span>
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4">
            {/* AI Content Generation Panel */}
            <div className="bg-white p-4 border rounded-md shadow-sm mb-4">
              <h3 className="text-lg font-medium mb-3">AI Tartalomgenerátor</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téma</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Add meg a blog témáját..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tartalom hossza</label>
                  <select
                    value={contentLength}
                    onChange={(e) => setContentLength(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="short">Rövid (~1000 karakter)</option>
                    <option value="medium">Közepes (~1250 karakter)</option>
                    <option value="long">Hosszú (~1500 karakter)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AI motor</label>
                  <select
                    value={generationMethod}
                    onChange={(e) => setGenerationMethod(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="deepseek">DeepSeek (Ajánlott)</option>
                    <option value="chatgpt">ChatGPT</option>
                  </select>
                </div>
                
                <button
                  onClick={generateContent}
                  disabled={isGenerating || !topic}
                  className="w-full py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generálás folyamatban...
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 mr-2" />
                      Tartalom generálása
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Post Settings Panel */}
            <div className="bg-white p-4 border rounded-md shadow-sm mb-4">
              <h3 className="text-lg font-medium mb-3">Bejegyzés beállításai</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL slug</label>
                  <div className="flex">
                    <input
                      type="text"
                      value={currentPost?.slug || ''}
                      onChange={(e) => setCurrentPost(prev => ({
                        ...prev,
                        slug: e.target.value
                      }))}
                      className="flex-1 px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => setCurrentPost(prev => ({
                        ...prev,
                        slug: generateSlug(prev.title.en || prev.title.hu)
                      }))}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-r-md hover:bg-gray-300"
                      title="Slug generálása a címből"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Közzétételi állapot</label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="status-draft"
                        checked={!currentPost?.published && !currentPost?.scheduledDate}
                        onChange={() => handleStatusChange('draft')}
                        className="mr-2"
                      />
                      <label htmlFor="status-draft" className="text-sm">Vázlat</label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="status-published"
                        checked={!!currentPost?.published}
                        onChange={() => handleStatusChange('published')}
                        className="mr-2"
                      />
                      <label htmlFor="status-published" className="text-sm">Közzétéve</label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="status-scheduled"
                        checked={!currentPost?.published && !!currentPost?.scheduledDate}
                        onChange={() => handleStatusChange('scheduled')}
                        className="mr-2"
                      />
                      <label htmlFor="status-scheduled" className="text-sm">Ütemezve</label>
                    </div>
                  </div>
                </div>
                
                {!currentPost?.published && !!currentPost?.scheduledDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ütemezés időpontja</label>
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                      <input
                        type="datetime-local"
                        value={currentPost?.scheduledDate || ''}
                        onChange={(e) => setCurrentPost(prev => ({
                          ...prev,
                          scheduledDate: e.target.value
                        }))}
                        min={getMinDateTimeValue()}
                        className="flex-1 px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Címkék</label>
                  <input
                    type="text"
                    value={(currentPost?.tags || []).join(', ')}
                    onChange={(e) => setCurrentPost(prev => ({
                      ...prev,
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    }))}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Add meg a címkéket vesszővel elválasztva"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render posts list view
  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Blog bejegyzések</h1>
        <button
          onClick={handleNewPost}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Új bejegyzés
        </button>
      </div>
      
      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
          <Check className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white p-4 border rounded-md shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-md"
                placeholder="Bejegyzések keresése..."
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
          
          {/* Status filter */}
          <div className="w-full md:w-auto">
            <div className="flex items-center">
              <ListFilter className="w-5 h-5 text-gray-400 mr-2" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md"
              >
                <option value="all">Összes bejegyzés</option>
                <option value="published">Közzétett</option>
                <option value="scheduled">Ütemezett</option>
                <option value="draft">Vázlatok</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Posts table */}
      {loading && !filteredPosts.length ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12 bg-white border rounded-md">
          <p className="text-gray-500">Nem található bejegyzés</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-md">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cím
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nyelvek
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Állapot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Létrehozva
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPosts.map((post) => (
                <tr key={post._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {post.title.hu || post.title.en || post.title.de}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">
                      {post.slug}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-1">
                      {['hu', 'en', 'de'].map((lang) => (
                        <span 
                          key={lang}
                          className={`px-2 py-1 inline-flex text-xs rounded-full ${
                            post.title[lang] && post.content[lang] 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {lang.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {post.published ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Közzétéve
                      </span>
                    ) : post.scheduledDate && new Date(post.scheduledDate) > new Date() ? (
                      <div>
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Ütemezve
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(post.scheduledDate).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Vázlat
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditPost(post._id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Szerkesztés"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          const newPost = {
                            ...emptyPost,
                            title: { ...post.title },
                            content: { ...post.content },
                            excerpt: { ...post.excerpt },
                            tags: [...post.tags],
                            slug: `${post.slug}-masolat`
                          };
                          setCurrentPost(newPost);
                          setIsEditing(true);
                          navigate('/blog/new');
                        }}
                        className="text-green-600 hover:text-green-900"
                        title="Másolat készítése"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeletePost(post._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Törlés"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BlogManagement;