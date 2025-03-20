import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { 
  Plus, 
  Search, 
  Book, 
  Pencil, 
  Trash, 
  Folder, 
  ChevronDown, 
  ChevronUp, 
  Save,
  X
} from 'lucide-react';
import {
  getAllWikiEntries,
  getWikiCategories,
  createWikiEntry,
  updateWikiEntry,
  deleteWikiEntry,
  getWikiEntryById
} from '../services/wikiService';

const WikiKnowledgeBase = () => {
  const intl = useIntl();
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Form state for new/edit entry
  const [formData, setFormData] = useState({
    title: { en: '', hu: '', de: '' },
    content: { en: '', hu: '', de: '' },
    keywords: { en: [], hu: [], de: [] },
    category: ''
  });

  // Load data
  useEffect(() => {
    fetchEntries();
    fetchCategories();
  }, []);

  // Filter entries based on search and category
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchQuery === '' || 
      (entry.title.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
       entry.title.hu.toLowerCase().includes(searchQuery.toLowerCase()) ||
       entry.title.de.toLowerCase().includes(searchQuery.toLowerCase()) ||
       entry.content.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
       entry.content.hu.toLowerCase().includes(searchQuery.toLowerCase()) ||
       entry.content.de.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === '' || entry.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Fetch all entries
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const data = await getAllWikiEntries();
      setEntries(data);
    } catch (error) {
      console.error('Error fetching wiki entries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const data = await getWikiCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Handle create new entry
  const handleCreateEntry = () => {
    setSelectedEntry(null);
    setFormData({
      title: { en: '', hu: '', de: '' },
      content: { en: '', hu: '', de: '' },
      keywords: { en: [], hu: [], de: [] },
      category: ''
    });
    setIsEditing(true);
    setFormErrors({});
  };

  // Handle edit entry
  const handleEditEntry = async (entry) => {
    setSelectedEntry(entry);
    
    // Get full entry details if needed
    try {
      const fullEntry = await getWikiEntryById(entry._id);
      setFormData({
        title: fullEntry.title,
        content: fullEntry.content,
        keywords: fullEntry.keywords,
        category: fullEntry.category
      });
      setIsEditing(true);
      setFormErrors({});
    } catch (error) {
      console.error('Error fetching entry details:', error);
    }
  };

  // Handle view entry
  const handleViewEntry = async (entry) => {
    try {
      const fullEntry = await getWikiEntryById(entry._id);
      setSelectedEntry(fullEntry);
      setIsEditing(false);
    } catch (error) {
      console.error('Error fetching entry details:', error);
    }
  };

  // Handle delete entry
  const handleDeleteEntry = async (entryId) => {
    if (window.confirm(intl.formatMessage({ id: 'wiki.confirm.delete' }))) {
      try {
        await deleteWikiEntry(entryId);
        fetchEntries();
        if (selectedEntry && selectedEntry._id === entryId) {
          setSelectedEntry(null);
        }
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  // Handle form input change
  const handleInputChange = (e, language, field) => {
    const { value } = e.target;
    
    if (field === 'category') {
      setFormData({ ...formData, category: value });
    } else {
      setFormData({
        ...formData,
        [field]: {
          ...formData[field],
          [language]: value
        }
      });
    }
  };

  // Handle keywords change
  const handleKeywordsChange = (e, language) => {
    const { value } = e.target;
    const keywords = value.split(',').map(k => k.trim()).filter(k => k !== '');
    
    setFormData({
      ...formData,
      keywords: {
        ...formData.keywords,
        [language]: keywords
      }
    });
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    const languages = ['en', 'hu', 'de'];
    
    // Check if all required fields are filled
    if (!formData.category) {
      errors.category = 'Category is required';
    }
    
    languages.forEach(lang => {
      if (!formData.title[lang]) {
        errors[`title_${lang}`] = `Title in ${lang} is required`;
      }
      if (!formData.content[lang]) {
        errors[`content_${lang}`] = `Content in ${lang} is required`;
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save entry
  const handleSaveEntry = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      if (selectedEntry) {
        // Update existing entry
        await updateWikiEntry(selectedEntry._id, formData);
      } else {
        // Create new entry
        await createWikiEntry(formData);
      }
      
      fetchEntries();
      setIsEditing(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    if (selectedEntry) {
      handleViewEntry(selectedEntry);
    } else {
      setSelectedEntry(null);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">
        {intl.formatMessage({ id: 'wiki.title' })}
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Sidebar - List of entries with search and filters */}
        <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={intl.formatMessage({ id: 'wiki.search' })}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
            <button
              onClick={handleCreateEntry}
              className="ml-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              title={intl.formatMessage({ id: 'wiki.add.entry' })}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          {/* Category filter */}
          <div className="mb-4">
            <select
              className="w-full px-4 py-2 bg-gray-700 rounded-lg"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">{intl.formatMessage({ id: 'wiki.all.categories' })}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          
          {/* Entries list */}
          <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2">{intl.formatMessage({ id: 'wiki.loading' })}</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <Book className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>{intl.formatMessage({ id: 'wiki.no.entries' })}</p>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div 
                  key={entry._id}
                  className={`mb-2 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedEntry && selectedEntry._id === entry._id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => handleViewEntry(entry)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium truncate">
                      {entry.title[intl.locale] || entry.title.en}
                    </h3>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEntry(entry);
                        }}
                        className="p-1 rounded hover:bg-gray-500 transition-colors"
                        title={intl.formatMessage({ id: 'wiki.edit' })}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEntry(entry._id);
                        }}
                        className="p-1 rounded hover:bg-gray-500 transition-colors"
                        title={intl.formatMessage({ id: 'wiki.delete' })}
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs mt-1 flex items-center">
                    <Folder className="w-3 h-3 mr-1" />
                    <span>{entry.category}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="md:col-span-2 bg-gray-800 rounded-xl p-6 shadow-lg">
          {isEditing ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  {selectedEntry 
                    ? intl.formatMessage({ id: 'wiki.edit.entry' }) 
                    : intl.formatMessage({ id: 'wiki.new.entry' })}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSaveEntry}
                    className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 flex items-center"
                  >
                    <Save className="w-5 h-5 mr-1" />
                    {intl.formatMessage({ id: 'wiki.save' })}
                  </button>
                </div>
              </div>
              
              {/* Category input */}
              <div className="mb-4">
                <label className="block mb-1 font-medium">
                  {intl.formatMessage({ id: 'wiki.category' })}
                </label>
                <select
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                  value={formData.category}
                  onChange={(e) => handleInputChange(e, null, 'category')}
                >
                  <option value="">{intl.formatMessage({ id: 'wiki.select.category' })}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {formErrors.category && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>
                )}
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder={intl.formatMessage({ id: 'wiki.new.category' })}
                    className="px-4 py-2 bg-gray-700 rounded-lg w-full"
                    onChange={(e) => handleInputChange(e, null, 'category')}
                  />
                </div>
              </div>
              
              {/* Multilingual Form */}
              <div className="space-y-6">
                {['en', 'hu', 'de'].map((lang) => (
                  <div key={lang} className="p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-lg font-medium mb-3">
                      {lang === 'en' && 'English'}
                      {lang === 'hu' && 'Magyar'}
                      {lang === 'de' && 'Deutsch'}
                    </h3>
                    
                    <div className="mb-4">
                      <label className="block mb-1">
                        {intl.formatMessage({ id: 'wiki.title' })}
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-gray-600 rounded-lg"
                        value={formData.title[lang]}
                        onChange={(e) => handleInputChange(e, lang, 'title')}
                      />
                      {formErrors[`title_${lang}`] && (
                        <p className="text-red-500 text-sm mt-1">{formErrors[`title_${lang}`]}</p>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <label className="block mb-1">
                        {intl.formatMessage({ id: 'wiki.content' })}
                      </label>
                      <textarea
                        className="w-full px-4 py-2 bg-gray-600 rounded-lg min-h-32"
                        value={formData.content[lang]}
                        onChange={(e) => handleInputChange(e, lang, 'content')}
                      ></textarea>
                      {formErrors[`content_${lang}`] && (
                        <p className="text-red-500 text-sm mt-1">{formErrors[`content_${lang}`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block mb-1">
                        {intl.formatMessage({ id: 'wiki.keywords' })}
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-gray-600 rounded-lg"
                        placeholder={intl.formatMessage({ id: 'wiki.keywords.hint' })}
                        value={formData.keywords[lang].join(', ')}
                        onChange={(e) => handleKeywordsChange(e, lang)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : selectedEntry ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  {selectedEntry.title[intl.locale] || selectedEntry.title.en}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditEntry(selectedEntry)}
                    className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Pencil className="w-5 h-5 mr-1" />
                    {intl.formatMessage({ id: 'wiki.edit' })}
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(selectedEntry._id)}
                    className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 flex items-center"
                  >
                    <Trash className="w-5 h-5 mr-1" />
                    {intl.formatMessage({ id: 'wiki.delete' })}
                  </button>
                </div>
              </div>
              
              <div className="mb-4 flex items-center">
                <span className="bg-blue-500 text-xs px-2 py-1 rounded-lg font-medium">
                  {selectedEntry.category}
                </span>
                {selectedEntry.keywords[intl.locale] && 
                 selectedEntry.keywords[intl.locale].length > 0 && (
                  <div className="ml-3 text-gray-400 text-sm flex items-center flex-wrap">
                    {selectedEntry.keywords[intl.locale].map((keyword, idx) => (
                      <span key={idx} className="mr-2 mb-1 bg-gray-700 px-2 py-0.5 rounded">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-gray-700 rounded-lg whitespace-pre-line">
                {selectedEntry.content[intl.locale] || selectedEntry.content.en}
              </div>
              
              <div className="mt-4 text-sm text-gray-400">
                <p>
                  {intl.formatMessage(
                    { id: 'wiki.created.at' },
                    { date: new Date(selectedEntry.createdAt).toLocaleDateString(intl.locale) }
                  )}
                </p>
                <p>
                  {intl.formatMessage(
                    { id: 'wiki.updated.at' },
                    { date: new Date(selectedEntry.updatedAt).toLocaleDateString(intl.locale) }
                  )}
                </p>
                <p>
                  {intl.formatMessage(
                    { id: 'wiki.created.by' },
                    { author: selectedEntry.createdBy }
                  )}
                </p>
              </div>
              
              {/* Language tabs */}
              <div className="mt-6">
                <h3 className="font-medium mb-2">
                  {intl.formatMessage({ id: 'wiki.other.languages' })}
                </h3>
                <div className="flex space-x-2">
                  {Object.keys(selectedEntry.title)
                    .filter(lang => lang !== intl.locale)
                    .map(lang => (
                      <button
                        key={lang}
                        className="px-3 py-1 bg-gray-700 rounded-lg hover:bg-gray-600"
                      >
                        {lang === 'en' && 'English'}
                        {lang === 'hu' && 'Magyar'}
                        {lang === 'de' && 'Deutsch'}
                      </button>
                    ))
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Book className="w-16 h-16 text-blue-500 mb-4" />
              <h2 className="text-xl font-medium mb-2">
                {intl.formatMessage({ id: 'wiki.select.or.create' })}
              </h2>
              <p className="text-gray-400 text-center max-w-md mb-6">
                {intl.formatMessage({ id: 'wiki.description' })}
              </p>
              <button
                onClick={handleCreateEntry}
                className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                {intl.formatMessage({ id: 'wiki.add.entry' })}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WikiKnowledgeBase;