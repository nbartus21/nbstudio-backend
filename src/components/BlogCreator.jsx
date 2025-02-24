import React, { useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { Calendar, Clock, Languages, Check, AlertTriangle } from 'lucide-react';
// A javított importálás a chatGptService-ből
import { 
  generateBlogContent, 
  generateTitle, 
  generateSEODescription, 
  translateContent 
} from '../services/chatGptService';
import { api } from '../services/auth';
// Opcionálisan importáljuk a deepseekService-t is, ha közvetlenül is használnánk
import { deepseekService } from '../deepseekService';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const BlogCreator = () => {
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
  // AI motor kiválasztásához (ha szükséges)
  const [selectedAI, setSelectedAI] = useState('deepseek'); // 'deepseek', 'xai', 'google', 'anthropic'

  // Tartalom generálása chatGptService függvényeivel (ami a deepseekService-t használja)
  const generateInitialContent = async (topic) => {
    try {
      setLoading(true);
      setError('');

      // Ha egy másik AI motort szeretnénk használni
      if (selectedAI !== 'deepseek') {
        deepseekService.setModel(selectedAI);
      }

      // Először magyar nyelven generáljuk
      const [huContent, huTitle] = await Promise.all([
        generateBlogContent(topic, 'hu'),
        generateTitle(topic, 'hu')
      ]);

      // Meta leírás generálása
      const huExcerpt = await generateSEODescription(huContent, 'hu');

      // Tartalom fordítása más nyelvekre
      const [enContent, deContent] = await Promise.all([
        translateContent(huContent, 'hu', 'en'),
        translateContent(huContent, 'hu', 'de')
      ]);

      // Címek fordítása
      const [enTitle, deTitle] = await Promise.all([
        translateContent(huTitle, 'hu', 'en'),
        translateContent(huTitle, 'hu', 'de')
      ]);

      // Meta leírások generálása más nyelveken
      const [enExcerpt, deExcerpt] = await Promise.all([
        generateSEODescription(enContent, 'en'),
        generateSEODescription(deContent, 'de')
      ]);

      setGeneratedContent({
        hu: {
          content: huContent,
          title: huTitle,
          excerpt: huExcerpt
        },
        en: {
          content: enContent,
          title: enTitle,
          excerpt: enExcerpt
        },
        de: {
          content: deContent,
          title: deTitle,
          excerpt: deExcerpt
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
        scheduledDate: new Date(publishDate).toISOString(),
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

  const getMinDateTimeString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Szó és karakterszám számítása
  const getContentStats = (content) => {
    if (!content) return { words: 0, chars: 0 };
    
    // HTML tagek eltávolítása a pontos számoláshoz
    const textContent = content.replace(/<[^>]*>/g, ' ');
    const words = textContent.split(/\s+/).filter(Boolean).length;
    const chars = textContent.replace(/\s+/g, '').length;
    
    return { words, chars };
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
          
          {/* AI kiválasztása - opcionális */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Motor
            </label>
            <select
              value={selectedAI}
              onChange={(e) => setSelectedAI(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="deepseek">DeepSeek (Alapértelmezett)</option>
              <option value="xai">XAI</option>
              <option value="google">Google Generative AI</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Publikálás Időpontja
            </label>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-gray-400" />
              <input
                type="datetime-local"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="px-3 py-2 border rounded-md"
                min={getMinDateTimeString()}
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
                toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | help',
                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
              }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kivonat (Meta leírás)
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
              Karakter Számláló
            </label>
            <div className="text-sm text-gray-600">
              {getContentStats(generatedContent[currentLanguage].content).chars} karakter / 
              {getContentStats(generatedContent[currentLanguage].content).words} szó
              {getContentStats(generatedContent[currentLanguage].content).chars < 1000 && 
                <span className="text-red-500 ml-2">(Minimum 1000 karakter ajánlott)</span>
              }
              {getContentStats(generatedContent[currentLanguage].content).chars > 1500 && 
                <span className="text-yellow-500 ml-2">(Maximum 1500 karakter ajánlott)</span>
              }
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
              disabled={loading || Object.values(generatedContent).some(
                content => 
                  getContentStats(content.content).chars < 1000 || 
                  getContentStats(content.content).chars > 1500
              )}
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

export default BlogCreator;