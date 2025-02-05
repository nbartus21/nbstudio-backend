import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import SEOAssistant from './SEOAssistant'; // Új komponens importálása
import { api } from '../services/auth';  // Importáljuk az api service-t

const API_URL = 'https://admin.nb-studio.net:5001/api';

// Icon Components
const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const AddIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
  </svg>
);

// InfoIcon komponens a tooltiphez
const InfoIcon = () => (
  <svg 
    className="w-4 h-4 text-gray-400 hover:text-gray-600" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth="2" 
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
    />
  </svg>
);

// Modal Component
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-lg w-full max-w-4xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// Main Component
const BlogAdmin = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const editorRef = useRef(null);

  // Fetch posts - módosított verzió
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/posts`);
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Add new post - módosított verzió
  const handleAddPost = async () => {
    try {
      const newPost = {
        title: {
          de: 'New Post DE',
          en: 'New Post EN',
          hu: 'New Post HU'
        },
        content: {
          de: 'Content DE',
          en: 'Content EN',
          hu: 'Content HU'
        },
        excerpt: {
          de: 'Excerpt DE',
          en: 'Excerpt EN',
          hu: 'Excerpt HU'
        },
        slug: 'new-post-' + Date.now(),
        tags: [],
        published: false,
        scheduledDate: scheduledDate || null
      };

      const response = await api.post(`${API_URL}/posts`, newPost);
      await fetchPosts();
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    }
  };

  // Edit post
  const handleEdit = (post) => {
    setEditingPost(post);
    setIsEditModalOpen(true);
  };

  // Update post - módosított verzió
  const handleUpdatePost = async (e, updatedPost) => {
    e.preventDefault();
    try {
      await api.put(`${API_URL}/posts/${updatedPost._id}`, updatedPost);
      await fetchPosts();
      setIsEditModalOpen(false);
      setEditingPost(null);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    }
  };

  // Delete post - módosított verzió
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await api.delete(`${API_URL}/posts/${id}`);
        await fetchPosts();
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 bg-red-50 p-4 rounded-lg">
          Error: {error}
        </div>
      </div>
    );
  }

  // Edit Form Component
  const EditForm = ({ post, onSubmit }) => {
    const [activeTab, setActiveTab] = useState('de');
    const [localPost, setLocalPost] = useState(post);

    const handleEditorChange = (lang, content) => {
      setLocalPost({
        ...localPost,
        content: { ...localPost.content, [lang]: content }
      });
    };

    const handleSEOUpdate = (updatedContent, targetLang) => {
      setLocalPost({
        ...localPost,
        content: { ...localPost.content, [targetLang]: updatedContent }
      });
    };

    return (
      <form onSubmit={(e) => onSubmit(e, localPost)} className="space-y-6">
        <SEOAssistant 
          content={localPost.content[activeTab]}
          language={activeTab}
          onUpdate={handleSEOUpdate}
        />

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Edit Post</h2>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(false)}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Language Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4">
            {['de', 'en', 'hu'].map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveTab(lang)}
                className={`${
                  activeTab === lang
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </nav>
        </div>

        {/* Active Language Content */}
        <div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={localPost.title[activeTab]}
              onChange={(e) => setLocalPost({
                ...localPost,
                title: { ...localPost.title, [activeTab]: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Content</label>
            <Editor
              apiKey="kshcdddb1ogetllqn5eoqe0xny2tf1hhr9xf4e69hrdmy667"
              value={localPost.content[activeTab]}
              init={{
                height: 400,
                menubar: false,
                plugins: 'link image code table lists',
                toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent | link image | code'
              }}
              onEditorChange={(content) => handleEditorChange(activeTab, content)}
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Excerpt</label>
            <textarea
              value={localPost.excerpt[activeTab]}
              onChange={(e) => setLocalPost({
                ...localPost,
                excerpt: { ...localPost.excerpt, [activeTab]: e.target.value }
              })}
              rows="2"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Common Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Slug</label>
            <input
              type="text"
              value={localPost.slug}
              onChange={(e) => setLocalPost({
                ...localPost,
                slug: e.target.value
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={localPost.published}
                onChange={(e) => setLocalPost({
                  ...localPost,
                  published: e.target.checked
                })}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label className="ml-2 text-sm text-gray-900">Published</label>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Schedule Publication</label>
              <input
                type="datetime-local"
                value={localPost.scheduledDate || ''}
                onChange={(e) => setLocalPost({
                  ...localPost,
                  scheduledDate: e.target.value
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Blog Administration</h1>
          <button
            onClick={handleAddPost}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
          >
            <AddIcon />
            <span className="ml-2">Add New Post</span>
          </button>
        </div>

        {/* Posts Table */}
        <div className="overflow-x-auto">
          <div className="align-middle inline-block min-w-full">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                      Title (DE)
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                      Title (EN)
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                      Title (HU)
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      Slug
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {posts.map((post) => (
                    <tr key={post._id} className="hover:bg-gray-50">
                      {['de', 'en', 'hu'].map((lang) => (
                        <td key={lang} className="px-3 py-4">
                          <div className="flex items-center">
                            <div className="truncate max-w-[200px]">
                              {post.title[lang]}
                            </div>
                            <div className="ml-2 group relative cursor-pointer">
                              <InfoIcon />
                              <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded shadow-lg -left-1/2 mt-1">
                                {post.title[lang]}
                              </div>
                            </div>
                          </div>
                        </td>
                      ))}
                      <td className="px-3 py-4">
                        <div className="flex items-center">
                          <div className="truncate max-w-[120px]">
                            {post.slug}
                          </div>
                          <div className="ml-2 group relative cursor-pointer">
                            <InfoIcon />
                            <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded shadow-lg -left-1/2 mt-1">
                              {post.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          post.published
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {post.published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(post)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => handleDelete(post._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
          {editingPost && (
            <EditForm 
              post={editingPost} 
              onSubmit={handleUpdatePost}
            />
          )}
        </Modal>
      </div>
    </div>
  );
};

export default BlogAdmin;