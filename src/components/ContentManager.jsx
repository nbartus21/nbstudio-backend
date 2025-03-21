import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useIntl } from 'react-intl';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'https://admin.nb-studio.net';

const ContentManager = () => {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState(0);
  const [pages, setPages] = useState({
    terms: { content: {} },
    privacy: { content: {} },
    cookies: { content: {} },
    imprint: { content: {} }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Define page sections for each content type
  const pageSections = {
    terms: [
      'title',
      'general.title', 'general.content',
      'usage.title', 'usage.content',
      'liability.title', 'liability.content',
      'changes.title', 'changes.content',
      'contact.title', 'contact.name', 'contact.email'
    ],
    privacy: [
      'title',
      'general.title', 'general.content',
      'data.title', 'data.item1', 'data.item2', 'data.item3', 'data.item4',
      'cookies.title', 'cookies.content',
      'rights.title', 'rights.item1', 'rights.item2', 'rights.item3', 'rights.item4', 'rights.item5',
      'contact.title', 'contact.name', 'contact.email'
    ],
    cookies: [
      'title',
      'general.title', 'general.content',
      'types.title', 'types.item1', 'types.item2', 'types.item3',
      'management.title', 'management.content',
      'contact.title', 'contact.name', 'contact.email'
    ],
    imprint: [
      'title',
      'company.title',
      'contact.title', 'contact.phone', 'contact.email',
      'registration.title', 'registration.vatId',
      'responsibility.title', 'responsibility.content',
      'disclaimer.title', 'disclaimer.content'
    ]
  };

  // Add SEO fields to each page
  Object.keys(pageSections).forEach(page => {
    pageSections[page].unshift('seo.title', 'seo.description');
  });

  useEffect(() => {
    fetchContentPages();
  }, []);

  const fetchContentPages = async () => {
    setLoading(true);
    try {
      const slugs = ['terms', 'privacy', 'cookies', 'imprint'];
      const pagesData = {};

      await Promise.all(slugs.map(async (slug) => {
        try {
          const response = await axios.get(`${API_URL}/api/content-pages/${slug}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-API-Key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
            }
          });
          
          // Convert Map to object if necessary
          const content = response.data.content instanceof Map
            ? Object.fromEntries(response.data.content)
            : response.data.content;
          
          pagesData[slug] = { ...response.data, content };
        } catch (error) {
          if (error.response && error.response.status === 404) {
            // Create a template with empty fields if page doesn't exist
            pagesData[slug] = {
              slug,
              content: createEmptyContent(slug),
              isNew: true
            };
          } else {
            console.error(`Error fetching ${slug} page:`, error);
            toast.error(`Error fetching ${slug} page. Please try again.`);
          }
        }
      }));

      setPages(pagesData);
    } catch (error) {
      console.error('Error fetching content pages:', error);
      toast.error('Error fetching content pages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createEmptyContent = (slug) => {
    const content = {};
    pageSections[slug].forEach(key => {
      content[key] = '';
    });
    return content;
  };

  const handleContentChange = (slug, key, value) => {
    setPages(prevPages => ({
      ...prevPages,
      [slug]: {
        ...prevPages[slug],
        content: {
          ...prevPages[slug].content,
          [key]: value
        }
      }
    }));
  };

  const saveContent = async (slug) => {
    setSaving(true);
    try {
      const response = await axios.put(
        `${API_URL}/api/content-pages/${slug}`,
        { content: pages[slug].content },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-API-Key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
          }
        }
      );

      setPages(prevPages => ({
        ...prevPages,
        [slug]: {
          ...response.data,
          content: response.data.content instanceof Map
            ? Object.fromEntries(response.data.content)
            : response.data.content
        }
      }));

      toast.success(`${slug.charAt(0).toUpperCase() + slug.slice(1)} page saved successfully!`);
    } catch (error) {
      console.error(`Error saving ${slug} page:`, error);
      toast.error(`Error saving ${slug} page. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const renderInputField = (slug, key) => {
    const isMultiline = key.includes('content') || key.includes('item');
    const value = pages[slug]?.content[key] || '';
    const label = key.split('.').pop();

    return (
      <div className="mb-4" key={key}>
        <label className="block text-sm font-medium text-gray-200 mb-1">
          {label.charAt(0).toUpperCase() + label.slice(1)}
        </label>
        {isMultiline ? (
          <textarea
            value={value}
            onChange={(e) => handleContentChange(slug, key, e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            rows="4"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => handleContentChange(slug, key, e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
          />
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 text-white">
      <h1 className="text-3xl font-bold mb-6">Content Management</h1>
      
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <Tabs selectedIndex={activeTab} onSelect={index => setActiveTab(index)}>
          <TabList className="flex border-b border-gray-700 mb-8">
            <Tab className="cursor-pointer px-6 py-3 font-medium border-b-2 border-transparent hover:text-blue-400 hover:border-blue-400 transition-colors" selectedClassName="text-blue-400 border-blue-400">
              Terms of Service
            </Tab>
            <Tab className="cursor-pointer px-6 py-3 font-medium border-b-2 border-transparent hover:text-blue-400 hover:border-blue-400 transition-colors" selectedClassName="text-blue-400 border-blue-400">
              Privacy Policy
            </Tab>
            <Tab className="cursor-pointer px-6 py-3 font-medium border-b-2 border-transparent hover:text-blue-400 hover:border-blue-400 transition-colors" selectedClassName="text-blue-400 border-blue-400">
              Cookies Policy
            </Tab>
            <Tab className="cursor-pointer px-6 py-3 font-medium border-b-2 border-transparent hover:text-blue-400 hover:border-blue-400 transition-colors" selectedClassName="text-blue-400 border-blue-400">
              Imprint
            </Tab>
          </TabList>

          {/* Terms of Service */}
          <TabPanel>
            <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-6">Edit Terms of Service</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pageSections.terms.map(key => renderInputField('terms', key))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => saveContent('terms')}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-md font-medium
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </TabPanel>

          {/* Privacy Policy */}
          <TabPanel>
            <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-6">Edit Privacy Policy</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pageSections.privacy.map(key => renderInputField('privacy', key))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => saveContent('privacy')}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-md font-medium
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </TabPanel>

          {/* Cookies Policy */}
          <TabPanel>
            <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-6">Edit Cookies Policy</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pageSections.cookies.map(key => renderInputField('cookies', key))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => saveContent('cookies')}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-md font-medium
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </TabPanel>

          {/* Imprint */}
          <TabPanel>
            <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-6">Edit Imprint</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pageSections.imprint.map(key => renderInputField('imprint', key))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => saveContent('imprint')}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-md font-medium
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </TabPanel>
        </Tabs>
      )}
    </div>
  );
};

export default ContentManager;
