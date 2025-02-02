import React, { useState } from 'react';
import { generateSEOSuggestions, translateContent, generateMetaContent, suggestTags } from '../services/deepseekService';

const SEOAssistant = ({ content, language, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [seoSuggestions, setSeoSuggestions] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerateSEO = async () => {
    setLoading(true);
    setError(null);
    try {
      const suggestions = await generateSEOSuggestions(content, language);
      setSeoSuggestions(suggestions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async (targetLang) => {
    setLoading(true);
    setError(null);
    try {
      const translated = await translateContent(content, language, targetLang);
      onUpdate(translated, targetLang);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">SEO Assistant</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleGenerateSEO}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Generate SEO Suggestions
          </button>
          <button
            onClick={() => handleTranslate('en')}
            disabled={loading || language === 'en'}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Translate to English
          </button>
          <button
            onClick={() => handleTranslate('de')}
            disabled={loading || language === 'de'}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Translate to German
          </button>
          <button
            onClick={() => handleTranslate('hu')}
            disabled={loading || language === 'hu'}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Translate to Hungarian
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {seoSuggestions && (
        <div className="mt-4 bg-gray-50 p-4 rounded">
          <pre className="whitespace-pre-wrap">{seoSuggestions}</pre>
        </div>
      )}
    </div>
  );
};

export default SEOAssistant;