import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { api } from '../services/auth';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  ChevronDown, 
  Check, 
  Eye, 
  Clock, 
  Filter, 
  Calendar, 
  AlertTriangle 
} from 'lucide-react';

const API_URL = 'https://admin.nb-studio.net:5001/api';

// Card component
const Card = ({ children, className = "" }) => {
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {children}
    </div>
  );
};

const BlogAdmin = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState('de');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    scheduled: 0,
    drafts: 0
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      const now = new Date();
      setStats({
        total: posts.length,
        published: posts.filter(post => post.published).length,
        scheduled: posts.filter(post => !post.published && post.scheduledDate && new Date(post.scheduledDate) > now).length,
        drafts: posts.filter(post => !post.published && (!post.scheduledDate || new Date(post.scheduledDate) <= now)).length
      });
    }
  }, [posts]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/posts`);
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Hiba a bejegyzések betöltésekor:', error);
      setError('Nem sikerült betölteni a blogbejegyzéseket. Kérjük, próbáld újra később.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a bejegyzést?')) return;
    
    try {
      await api.delete(`${API_URL}/posts/${id}`);
      await fetchPosts();
    } catch (error) {
      console.error('Hiba:', error);
      setError('Nem sikerült törölni a bejegyzést. Kérjük, próbáld újra később.');
    }
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    
    try {
      if (selectedPost._id) {
        await api.put(`${API_URL}/posts/${selectedPost._id}`, selectedPost);
      } else {
        await api.post(`${API_URL}/posts`, selectedPost);
      }
      
      await fetchPosts();
      setShowModal(false);
      setSelectedPost(null);
    } catch (error) {
      console.error('Hiba:', error);
      setError('Nem sikerült menteni a bejegyzést. Kérjük, próbáld újra később.');
    }
  };

  const handleTogglePublish = async (post) => {
    try {
      const updatedPost = { ...post, published: !post.published };
      await api.put(`${API_URL}/posts/${post._id}`, updatedPost);
      await fetchPosts();
    } catch (error) {
      console.error('Hiba:', error);
      setError('Nem sikerült frissíteni a bejegyzés állapotát. Kérjük, próbáld újra később.');
    }
  };

  // Filter posts
  const filteredPosts = posts.filter(post => {
    // Search filter
    const searchMatch = post.title.de.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        post.title.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        post.title.hu.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        post.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    let statusMatch = true;
    if (filterStatus !== 'all') {
      const now = new Date();
      if (filterStatus === 'published') {
        statusMatch = post.published;
      } else if (filterStatus === 'scheduled') {
        statusMatch = !post.published && post.scheduledDate && new Date(post.scheduledDate) > now;
      } else if (filterStatus === 'drafts') {
        statusMatch = !post.published && (!post.scheduledDate || new Date(post.scheduledDate) <= now);
      }
    }
    
    return searchMatch && statusMatch;
  });

  // Sort posts
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortOrder === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortOrder === 'alphabet') {
      return a.title.de.localeCompare(b.title.de);
    }
    return 0;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blog Kezelés</h1>
            <p className="text-gray-500 mt-1">Hozz létre, szerkeszt és kezelj blogbejegyzéseket</p>
          </div>
          <Link
            to="/blog/new"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Új bejegyzés
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Összes bejegyzés</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Közzétéve</p>
                <p className="text-2xl font-bold">{stats.published}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Ütemezve</p>
                <p className="text-2xl font-bold">{stats.scheduled}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Piszkozatok</p>
                <p className="text-2xl font-bold">{stats.drafts}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Bejegyzések keresése..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            
            <div className="flex gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded-lg px-4 py-2"
              >
                <option value="all">Összes állapot</option>
                <option value="published">Közzétéve</option>
                <option value="scheduled">Ütemezve</option>
                <option value="drafts">Piszkozatok</option>
              </select>
              
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="border rounded-lg px-4 py-2"
              >
                <option value="newest">Legújabbak előre</option>
                <option value="oldest">Legrégebbiek előre</option>
                <option value="alphabet">ABC sorrend</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {sortedPosts.map(post => (
            <Card key={post._id} className="p-0 overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="flex-grow p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        post.published 
                          ? 'bg-green-100 text-green-800' 
                          : post.scheduledDate && new Date(post.scheduledDate) > new Date()
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {post.published 
                        ? 'Közzétéve' 
                        : post.scheduledDate && new Date(post.scheduledDate) > new Date()
                          ? 'Ütemezve'
                          : 'Piszkozat'
                      }
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(post.createdAt)}
                    </span>
                  </div>
                  
                  <h2 className="text-xl font-semibold hover:text-blue-700 cursor-pointer" onClick={() => {
                    setSelectedPost(post);
                    setShowModal(true);
                  }}>
                    {post.title[activeLanguage]}
                  </h2>
                  
                  <div className="flex mt-2 space-x-4 text-sm">
                    <div className="flex items-center text-gray-500">
                      <span className="font-medium mr-1">Slug:</span>
                      <span className="text-gray-600">{post.slug}</span>
                    </div>
                    
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex items-center text-gray-500">
                        <span className="font-medium mr-1">Címkék:</span>
                        <span className="text-gray-600">{post.tags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedPost(post);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium py-1 px-2 rounded hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4 inline mr-1" />
                      Szerkesztés
                    </button>
                    
                    <button 
                      onClick={() => handleTogglePublish(post)}
                      className={`text-sm font-medium py-1 px-2 rounded ${
                        post.published 
                          ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50' 
                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                      }`}
                    >
                      {post.published ? 'Közzététel visszavonása' : 'Közzététel'}
                    </button>
                    
                    <button 
                      onClick={() => handleDelete(post._id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium py-1 px-2 rounded hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 inline mr-1" />
                      Törlés
                    </button>
                  </div>
                </div>
                
                {/* Language tabs */}
                <div className="flex md:flex-col p-4 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-200">
                  {['de', 'en', 'hu'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => setActiveLanguage(lang)}
                      className={`px-3 py-1 text-sm rounded-md ${
                        activeLanguage === lang
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          ))}
          
          {sortedPosts.length === 0 && (
            <div className="text-center p-8 bg-white rounded-lg shadow">
              <div className="text-gray-400 mb-2">
                <AlertTriangle className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nincs találat</h3>
              <p className="text-gray-500">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Próbáld meg módosítani a keresést vagy a szűrőket'
                  : 'Hozz létre egy új blogbejegyzést'
                }
              </p>
              {!searchQuery && filterStatus === 'all' && (
                <Link
                  to="/blog/new"
                  className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Új bejegyzés
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showModal && selectedPost && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-white rounded-lg w-full max-w-4xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSavePost}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    {selectedPost._id ? 'Bejegyzés szerkesztése' : 'Új bejegyzés létrehozása'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Bezárás</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Language Tabs */}
                <div className="border-b border-gray-200 mb-4">
                  <nav className="-mb-px flex space-x-4">
                    {['de', 'en', 'hu'].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setActiveLanguage(lang)}
                        className={`${
                          activeLanguage === lang
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Title input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1" htmlFor="title">
                    Cím ({activeLanguage.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={selectedPost.title[activeLanguage] || ''}
                    onChange={(e) => setSelectedPost({
                      ...selectedPost,
                      title: {
                        ...selectedPost.title,
                        [activeLanguage]: e.target.value
                      }
                    })}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>

                {/* Content */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Tartalom ({activeLanguage.toUpperCase()})
                  </label>
                  <Editor
                    apiKey="kshcdddb1ogetllqn5eoqe0xny2tf1hhr9xf4e69hrdmy667"
                    value={selectedPost.content[activeLanguage] || ''}
                    init={{
                      height: 400,
                      menubar: false,
                      plugins: 'link image code table lists',
                      toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent | link image | code'
                    }}
                    onEditorChange={(content) => setSelectedPost({
                      ...selectedPost,
                      content: {
                        ...selectedPost.content,
                        [activeLanguage]: content
                      }
                    })}
                  />
                </div>

                {/* Excerpt */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1" htmlFor="excerpt">
                    Összefoglaló ({activeLanguage.toUpperCase()})
                  </label>
                  <textarea
                    id="excerpt"
                    value={selectedPost.excerpt[activeLanguage] || ''}
                    onChange={(e) => setSelectedPost({
                      ...selectedPost,
                      excerpt: {
                        ...selectedPost.excerpt,
                        [activeLanguage]: e.target.value
                      }
                    })}
                    rows="3"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                {/* Common fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="slug">
                      Slug
                    </label>
                    <input
                      type="text"
                      id="slug"
                      value={selectedPost.slug || ''}
                      onChange={(e) => setSelectedPost({
                        ...selectedPost,
                        slug: e.target.value
                      })}
                      className="w-full p-2 border rounded-lg"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="tags">
                      Címkék (vesszővel elválasztva)
                    </label>
                    <input
                      type="text"
                      id="tags"
                      value={(selectedPost.tags || []).join(', ')}
                      onChange={(e) => setSelectedPost({
                        ...selectedPost,
                        tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                      })}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* Publish settings */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="published"
                      checked={selectedPost.published || false}
                      onChange={(e) => setSelectedPost({
                        ...selectedPost,
                        published: e.target.checked
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="published" className="ml-2 block text-sm text-gray-900">
                      Bejegyzés közzététele
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="scheduledDate">
                      Ütemezett közzététel (opcionális)
                    </label>
                    <input
                      type="datetime-local"
                      id="scheduledDate"
                      value={selectedPost.scheduledDate || ''}
                      onChange={(e) => setSelectedPost({
                        ...selectedPost,
                        scheduledDate: e.target.value
                      })}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Mentés
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogAdmin;