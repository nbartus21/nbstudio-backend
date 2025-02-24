import React, { useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { format } from 'date-fns';
import { CalendarClock, Languages, Check, AlertTriangle } from 'lucide-react';
import { 
  generateSEOSuggestions, 
  translateContent, 
  generateMetaContent 
} from '../services/deepseekService';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const ScheduledBlogCreator = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState({
    hu: { content: '', title: '', excerpt: '' },
    en: { content: '', title: '', excerpt: '' },
    de: { content: '', title: '', excerpt: '' }
  });
  const [publishDate, setPublishDate] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('hu');
  
  const generateInitialContent = async (topic) => {
    try {
      setLoading(true);
      setError('');
      
      // Generate Hungarian content first
      const huContent = await generateBlogContent(topic, 'hu');
      const huSeo = await generateSEOSuggestions(huContent.content, 'hu');
      const huMeta = await generateMetaContent(huContent.content, 'hu');
      
      // Translate to other languages
      const [enContent, deContent] = await Promise.all([
        translateContent(huContent.content, 'hu', 'en'),
        translateContent(huContent.content, 'hu', 'de')
      ]);
      
      // Generate SEO and meta for translations
      const [enSeo, deSeo] = await Promise.all([
        generateSEOSuggestions(enContent, 'en'),
        generateSEOSuggestions(deContent, 'de')
      ]);
      
      const [enMeta, deMeta] = await Promise.all([
        generateMetaContent(enContent, 'en'),
        generateMetaContent(deContent, 'de')
      ]);
      
      setGeneratedContent({
        hu: {
          content: huContent.content,
          title: huContent.title,
          excerpt: huMeta.metaDescription,
          seo: huSeo
        },
        en: {
          content: enContent,
          title: await translateContent(huContent.title, 'hu', 'en'),
          excerpt: enMeta.metaDescription,
          seo: enSeo
        },
        de: {
          content: deContent,
          title: await translateContent(huContent.title, 'hu', 'de'),
          excerpt: deMeta.metaDescription,
          seo: deSeo
        }
      });
      
      setStep(2);
      setSuccess('Tartalom generálva minden nyelven!');
    } catch (error) {
      setError('Hiba történt a tartalom generálása során: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const generateBlogContent = async (topic, language) => {
    // Itt használjuk a deepseek szolgáltatást a megadott karakter limittel
    const prompt = `Write a blog post about ${topic} in ${language}. 
                   The content should be between 1800-2000 characters long.
                   Include an engaging title.`;
    
    const response = await fetch('YOUR_DEEPSEEK_ENDPOINT', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    const data = await response.json();
    return {
      content: data.content,
      title: data.title
    };
  };
  
  const handlePublish = async () => {
    try {
      setLoading(true);
      
      const postData = {
        title: {
          hu: generatedContent.hu.title,
          en: generatedContent.en.title,
          de: generatedContent.de.title
        },
        content: {
          hu: generatedContent.hu.content,
          en: generatedContent.en.content,
          de: generatedContent.de.content
        },
        excerpt: {
          hu: generatedContent.hu.excerpt,
          en: generatedContent.en.excerpt,
          de: generatedContent.de.excerpt
        },
        slug: generateSlug(generatedContent.en.title),
        scheduledDate: publishDate,
        published: false,
        tags: []
      };
      
      const response = await api.post(`${API_URL}/posts`, postData);
      
      if (response.ok) {
        setSuccess('Blog bejegyzés sikeresen ütemezve!');
        resetForm();
      } else {
        throw new Error('Hiba történt a mentés során');
      }
    } catch (error) {
      setError('Nem sikerült menteni a bejegyzést: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };
  
  const resetForm = () => {
    setStep(1);
    setSelectedTopic('');
    setPublishDate('');
    setGeneratedContent({
      hu: { content: '', title: '', excerpt: '' },
      en: { content: '', title: '', excerpt: '' },
      de: { content: '', title: '', excerpt: '' }
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Ütemezett Blog Bejegyzés Létrehozása</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
          <Check className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}
      
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Blog Téma
            </label>
            <input
              type="text"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Add meg a blog témáját..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Publikálás Időpontja
            </label>
            <div className="flex items-center">
              <CalendarClock className="h-5 w-5 mr-2 text-gray-400" />
              <input
                type="datetime-local"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="px-3 py-2 border rounded-md"
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              />
            </div>
          </div>
          
          <button
            onClick={() => generateInitialContent(selectedTopic)}
            disabled={!selectedTopic || !publishDate || loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generálás folyamatban...' : 'Tartalom Generálása'}
          </button>
        </div>
      )}
      
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-4">
              {['hu', 'en', 'de'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setCurrentLanguage(lang)}
                  className={`px-3 py-1 rounded ${
                    currentLanguage === lang
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <Languages className="h-6 w-6 text-gray-400" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cím
            </label>
            <input
              type="text"
              value={generatedContent[currentLanguage].title}
              onChange={(e) => setGeneratedContent({
                ...generatedContent,
                [currentLanguage]: {
                  ...generatedContent[currentLanguage],
                  title: e.target.value
                }
              })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tartalom
            </label>
            <Editor
              apiKey="kshcdddb1ogetllqn5eoqe0xny2tf1hhr9xf4e69hrdmy667"
              value={generatedContent[currentLanguage].content}
              onEditorChange={(content) => setGeneratedContent({
                ...generatedContent,
                [currentLanguage]: {
                  ...generatedContent[currentLanguage],
                  content
                }
              })}
              init={{
                height: 500,
                menubar: false,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                  'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
                  'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount'
                ],
                toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | help'
              }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kivonat
            </label>
            <textarea
              value={generatedContent[currentLanguage].excerpt}
              onChange={(e) => setGeneratedContent({
                ...generatedContent,
                [currentLanguage]: {
                  ...generatedContent[currentLanguage],
                  excerpt: e.target.value
                }
              })}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SEO Javaslatok
            </label>
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="whitespace-pre-wrap text-sm">
                {generatedContent[currentLanguage].seo}
              </pre>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50"
            >
              Mégse
            </button>
            <button
              onClick={handlePublish}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Mentés...' : 'Ütemezett Publikálás'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledBlogCreator;