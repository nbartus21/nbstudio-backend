import React, { useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { generateSEOSuggestions, translateContent, generateMetaContent } from '../services/deepseekService';

export function BlogCreator() {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(null);

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleCreate = async () => {
    try {
      setLoading(true);

      // Először generáljuk a magyar verzió SEO javaslatait
      const seoSuggestions = await generateSEOSuggestions(content, 'hu');
      
      // Generáljuk a meta tartalmakat
      const metaContent = await generateMetaContent(content, 'hu');

      // Fordítás németré és angolra
      const [deContent, enContent] = await Promise.all([
        translateContent(content, 'hu', 'de'),
        translateContent(content, 'hu', 'en')
      ]);

      // Német és angol SEO optimalizáció
      const [deMeta, enMeta] = await Promise.all([
        generateMetaContent(deContent, 'de'),
        generateMetaContent(enContent, 'en')
      ]);

      // Előnézet létrehozása
      const postData = {
        title: {
          hu: title,
          de: await translateContent(title, 'hu', 'de'),
          en: await translateContent(title, 'hu', 'en')
        },
        content: {
          hu: content,
          de: deContent,
          en: enContent
        },
        excerpt: {
          hu: metaContent.metaDescription,
          de: deMeta.metaDescription,
          en: enMeta.metaDescription
        },
        slug: generateSlug(title),
        published: false
      };

      setPreview(postData);

      // API hívás a bejegyzés létrehozásához
      const response = await fetch('https://nbstudio-backend.onrender.com/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      // Siker esetén töröljük az űrlapot
      setTitle('');
      setContent('');
      setPreview(null);
      alert('Blog bejegyzés sikeresen létrehozva!');

    } catch (error) {
      console.error('Error creating post:', error);
      alert('Hiba történt a bejegyzés létrehozása során: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Új blog bejegyzés létrehozása</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cím (magyar nyelven)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Add meg a bejegyzés címét..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tartalom (magyar nyelven)
          </label>
          <Editor
            apiKey="kshcdddb1ogetllqn5eoqe0xny2tf1hhr9xf4e69hrdmy667"
            value={content}
            init={{
              height: 500,
              menubar: false,
              plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'help', 'wordcount'
              ],
              toolbar: 'undo redo | blocks | ' +
                'bold italic backcolor | alignleft aligncenter ' +
                'alignright alignjustify | bullist numlist outdent indent | ' +
                'removeformat | help'
            }}
            onEditorChange={(newContent) => setContent(newContent)}
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={loading || !title || !content}
          className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
            ${loading || !title || !content 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin h-5 w-5 mr-3 border-2 border-white border-t-transparent rounded-full"></div>
              Feldolgozás...
            </div>
          ) : (
            'Bejegyzés létrehozása'
          )}
        </button>

        {preview && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Előnézet:</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Magyar:</h4>
                <p>Cím: {preview.title.hu}</p>
                <p>Kivonat: {preview.excerpt.hu}</p>
              </div>
              <div>
                <h4 className="font-medium">Német:</h4>
                <p>Cím: {preview.title.de}</p>
                <p>Kivonat: {preview.excerpt.de}</p>
              </div>
              <div>
                <h4 className="font-medium">Angol:</h4>
                <p>Cím: {preview.title.en}</p>
                <p>Kivonat: {preview.excerpt.en}</p>
              </div>
              <div>
                <h4 className="font-medium">URL slug:</h4>
                <p>{preview.slug}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Named export
export { BlogCreator as default };