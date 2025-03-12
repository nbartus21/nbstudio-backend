import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';

const BlogPostCreator = () => {
  const [post, setPost] = useState({
    title: {
      de: '',
      en: '',
      hu: ''
    },
    content: {
      de: '',
      en: '',
      hu: ''
    },
    excerpt: {
      de: '',
      en: '',
      hu: ''
    },
    slug: '',
    tags: '',
    published: false
  });

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeLanguage, setActiveLanguage] = useState('hu');
  const [editingPostId, setEditingPostId] = useState(null);

  // Fetch existing posts
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/posts');
      
      if (!response.ok) {
        throw new Error('Nem sikerült betölteni a blogbejegyzéseket');
      }
      
      const data = await response.json();
      setPosts(data);
      setError(null);
    } catch (error) {
      console.error('Hiba a blogbejegyzések betöltésekor:', error);
      setError('Nem sikerült betölteni a blogbejegyzéseket');
    } finally {
      setLoading(false);
    }
  };

  // Generate slug from Hungarian title
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
      .trim();                  // Trim leading/trailing hyphens
  };

  // Update form data
  const handleInputChange = (e, language, field) => {
    const { value } = e.target;
    
    if (language) {
      // Update language-specific field
      setPost(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [language]: value
        }
      }));
      
      // Auto-generate slug from Hungarian title
      if (field === 'title' && language === 'hu') {
        setPost(prev => ({
          ...prev,
          slug: generateSlug(value)
        }));
      }
    } else {
      // Update normal field
      setPost(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Handle tags input
  const handleTagsChange = (e) => {
    setPost(prev => ({
      ...prev,
      tags: e.target.value
    }));
  };

  // Handle publish toggle
  const handlePublishToggle = () => {
    setPost(prev => ({
      ...prev,
      published: !prev.published
    }));
  };

  // Reset form
  const resetForm = () => {
    setPost({
      title: { de: '', en: '', hu: '' },
      content: { de: '', en: '', hu: '' },
      excerpt: { de: '', en: '', hu: '' },
      slug: '',
      tags: '',
      published: false
    });
    setEditingPostId(null);
  };

  // Save post
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validate required fields
      if (!post.title.hu || !post.content.hu || !post.excerpt.hu || 
          !post.title.en || !post.content.en || !post.excerpt.en ||
          !post.title.de || !post.content.de || !post.excerpt.de) {
        throw new Error('Minden nyelven kötelező kitölteni a címet, tartalmat és kivonatot!');
      }
      
      if (!post.slug) {
        throw new Error('Az URL slug nem lehet üres!');
      }
      
      // Convert tags to proper format
      // Ensure tags is an array (even if empty)
      const formattedTags = typeof post.tags === 'string' 
        ? post.tags.split(',').map(tag => tag.trim()).filter(tag => tag) 
        : (Array.isArray(post.tags) ? post.tags : []);
      
      const postData = {
        ...post,
        tags: formattedTags
      };
      
      let response;
      
      if (editingPostId) {
        // Update existing post
        response = await api.put(`/api/posts/${editingPostId}`, postData);
      } else {
        // Create new post
        response = await api.post('/api/posts', postData);
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Nem sikerült menteni a blogbejegyzést');
      }
      
      const savedPost = await response.json();
      
      // Update posts list
      if (editingPostId) {
        setPosts(prev => prev.map(p => p._id === editingPostId ? savedPost : p));
      } else {
        setPosts(prev => [savedPost, ...prev]);
      }
      
      setSuccessMessage(editingPostId ? 'Blogbejegyzés sikeresen frissítve!' : 'Blogbejegyzés sikeresen létrehozva!');
      resetForm();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (error) {
      console.error('Hiba a blogbejegyzés mentésekor:', error);
      setError(error.message || 'Nem sikerült menteni a blogbejegyzést');
    } finally {
      setLoading(false);
    }
  };

  // Edit post
  const handleEditPost = (postId) => {
    const postToEdit = posts.find(p => p._id === postId);
    
    if (postToEdit) {
      setPost({
        title: { ...postToEdit.title },
        content: { ...postToEdit.content },
        excerpt: { ...postToEdit.excerpt },
        slug: postToEdit.slug,
        tags: Array.isArray(postToEdit.tags) ? postToEdit.tags.join(', ') : postToEdit.tags,
        published: postToEdit.published
      });
      
      setEditingPostId(postId);
      
      // Scroll to top of the form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Delete post
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a blogbejegyzést?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await api.delete(`/api/posts/${postId}`);
      
      if (!response.ok) {
        throw new Error('Nem sikerült törölni a blogbejegyzést');
      }
      
      // Update posts list
      setPosts(prev => prev.filter(p => p._id !== postId));
      
      setSuccessMessage('Blogbejegyzés sikeresen törölve!');
      
      // If we're editing the post that was just deleted, reset the form
      if (editingPostId === postId) {
        resetForm();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (error) {
      console.error('Hiba a blogbejegyzés törlésekor:', error);
      setError('Nem sikerült törölni a blogbejegyzést');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {editingPostId ? 'Blogbejegyzés szerkesztése' : 'Új blogbejegyzés'}
        </h1>
        {editingPostId && (
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Új bejegyzés
          </button>
        )}
      </div>

      {/* Error & Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Post Form */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <form onSubmit={handleSubmit}>
          {/* Language Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-4" aria-label="Languages">
              <button
                type="button"
                onClick={() => setActiveLanguage('hu')}
                className={`py-2 px-4 text-sm font-medium ${
                  activeLanguage === 'hu'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Magyar
              </button>
              <button
                type="button"
                onClick={() => setActiveLanguage('de')}
                className={`py-2 px-4 text-sm font-medium ${
                  activeLanguage === 'de'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Német
              </button>
              <button
                type="button"
                onClick={() => setActiveLanguage('en')}
                className={`py-2 px-4 text-sm font-medium ${
                  activeLanguage === 'en'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Angol
              </button>
            </nav>
          </div>

          {/* Title Input */}
          <div className="mb-4">
            <label htmlFor={`title-${activeLanguage}`} className="block text-sm font-medium text-gray-700 mb-1">
              Cím ({activeLanguage === 'hu' ? 'magyar' : activeLanguage === 'de' ? 'német' : 'angol'})
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id={`title-${activeLanguage}`}
              value={post.title[activeLanguage]}
              onChange={(e) => handleInputChange(e, activeLanguage, 'title')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={activeLanguage === 'hu' ? 'A bejegyzés címe magyarul' : activeLanguage === 'de' ? 'Titel auf Deutsch' : 'Title in English'}
              required={true}
            />
          </div>

          {/* Excerpt Input */}
          <div className="mb-4">
            <label htmlFor={`excerpt-${activeLanguage}`} className="block text-sm font-medium text-gray-700 mb-1">
              Rövid kivonat ({activeLanguage === 'hu' ? 'magyar' : activeLanguage === 'de' ? 'német' : 'angol'})
              {activeLanguage === 'hu' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id={`excerpt-${activeLanguage}`}
              value={post.excerpt[activeLanguage]}
              onChange={(e) => handleInputChange(e, activeLanguage, 'excerpt')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              rows="2"
              placeholder={activeLanguage === 'hu' ? 'Rövid összefoglaló a bejegyzésről' : activeLanguage === 'de' ? 'Kurze Zusammenfassung' : 'Brief summary of the post'}
              required={true}
            ></textarea>
          </div>

          {/* Content Input */}
          <div className="mb-4">
            <label htmlFor={`content-${activeLanguage}`} className="block text-sm font-medium text-gray-700 mb-1">
              Tartalom ({activeLanguage === 'hu' ? 'magyar' : activeLanguage === 'de' ? 'német' : 'angol'})
              {activeLanguage === 'hu' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id={`content-${activeLanguage}`}
              value={post.content[activeLanguage]}
              onChange={(e) => handleInputChange(e, activeLanguage, 'content')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              rows="10"
              placeholder={activeLanguage === 'hu' ? 'A bejegyzés tartalma...' : activeLanguage === 'de' ? 'Inhalt des Beitrags...' : 'Post content...'}
              required={true}
            ></textarea>
          </div>

          {/* Common Fields Section */}
          <div className="mt-8 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Általános beállítások</h3>
            
            {/* Slug */}
            <div className="mb-4">
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  /blog/
                </span>
                <input
                  type="text"
                  id="slug"
                  value={post.slug}
                  onChange={(e) => handleInputChange(e, null, 'slug')}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="url-slug-for-the-post"
                  required
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">Az URL bejegyzésazonosító, amely a címből generálódik.</p>
            </div>
            
            {/* Tags */}
            <div className="mb-4">
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Címkék (vesszővel elválasztva)
              </label>
              <input
                type="text"
                id="tags"
                value={typeof post.tags === 'string' ? post.tags : (post.tags?.join(', ') || '')}
                onChange={handleTagsChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="pl.: webfejlesztés, dizájn, marketing"
              />
            </div>
            
            {/* Published Toggle */}
            <div className="mb-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="published"
                  checked={post.published}
                  onChange={handlePublishToggle}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="published" className="ml-2 block text-sm text-gray-900">
                  Publikálva
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Ha be van jelölve, a bejegyzés nyilvánosan elérhető lesz.
              </p>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Feldolgozás...
                  </>
                ) : (
                  editingPostId ? 'Bejegyzés mentése' : 'Bejegyzés létrehozása'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Existing Posts */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Meglévő bejegyzések</h2>
        
        {loading && posts.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white shadow-md rounded-lg p-8 text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="text-lg font-medium">Nincs még blogbejegyzés</p>
            <p className="mt-1">Hozz létre egy új bejegyzést a fenti űrlappal.</p>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg divide-y divide-gray-200">
            {posts.map((post) => (
              <div key={post._id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{post.title.hu || post.title.en || post.title.de}</h3>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{post.excerpt.hu || post.excerpt.en || post.excerpt.de}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {post.tags && post.tags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        post.published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {post.published ? 'Publikálva' : 'Vázlat'}
                      </span>
                      <span className="mx-2">•</span>
                      <span>Slug: {post.slug}</span>
                      <span className="mx-2">•</span>
                      <span>Létrehozva: {new Date(post.createdAt).toLocaleDateString('hu-HU')}</span>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleEditPost(post._id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Szerkesztés
                    </button>
                    <button
                      onClick={() => handleDeletePost(post._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Törlés
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPostCreator;