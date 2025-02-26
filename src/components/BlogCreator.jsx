import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { generateSEOSuggestions } from '../services/deepseekService';
import { api } from '../services/auth';
import { 
  Check, 
  AlertCircle, 
  Loader, 
  ArrowLeft, 
  Languages,
  Sparkles,
  RefreshCw,
  Globe,
  CheckCircle,
  Book,
  Tags
} from 'lucide-react';

const API_URL = 'https://admin.nb-studio.net:5001/api';

// Segítő komponensek
const Kártya = ({ children, className = "" }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {children}
    </div>
  );
};

const ÉrtesítésBanner = ({ üzenet, típus, onClose }) => {
  const háttérSzín = típus === 'success' ? 'bg-green-50 border-green-400 text-green-700' : 
                 típus === 'error' ? 'bg-red-50 border-red-400 text-red-700' : 
                 'bg-blue-50 border-blue-400 text-blue-700';
  
  const Ikon = típus === 'success' ? CheckCircle : 
              típus === 'error' ? AlertCircle : 
              Loader;
  
  return (
    <div className={`p-4 mb-6 border rounded-lg flex justify-between items-center ${háttérSzín}`}>
      <div className="flex items-center">
        <Ikon size={20} className="mr-2" />
        <span>{üzenet}</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <span className="sr-only">Bezárás</span>
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};

const BlogKészítő = () => {
  const navigate = useNavigate();
  const [betöltés, setBetöltés] = useState(false);
  const [generálás, setGenerálás] = useState({
    seo: false,
    fordítás: false,
    címkék: false
  });
  const [autoGenerálás, setAutoGenerálás] = useState(false);
  const [cím, setCím] = useState('');
  const [tartalom, setTartalom] = useState('');
  const [előnézetAdat, setElőnézetAdat] = useState(null);
  const [értesítés, setÉrtesítés] = useState(null);
  const [aiSegítségBekapcsolva, setAiSegítségBekapcsolva] = useState(true);
  const [aktívFül, setAktívFül] = useState('szerkesztő'); // 'szerkesztő' vagy 'előnézet'
  const [meta, setMeta] = useState({
    címkék: '',
    seoTitle: '',
    seoDescription: ''
  });

  // URL slug generálása a címből
  const slugGenerálás = (szöveg) => {
    return szöveg
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Értesítés megjelenítése
  const értesítésMegjelenítése = (üzenet, típus = 'success') => {
    setÉrtesítés({ üzenet, típus });
    setTimeout(() => {
      setÉrtesítés(null);
    }, 5000);
  };
  
  // Értesítés kézi elutasítása
  const értesítésElutasítása = () => {
    setÉrtesítés(null);
  };

  // SEO javaslatok generálása
  const seoGenerálása = async () => {
    if (!tartalom) {
      értesítésMegjelenítése('A tartalomnak kitöltve kell lennie a SEO javaslatok generálásához', 'error');
      return;
    }

    if (!aiSegítségBekapcsolva) {
      értesítésMegjelenítése('Az AI segítség ki van kapcsolva', 'error');
      return;
    }

    try {
      setGenerálás({...generálás, seo: true});
      értesítésMegjelenítése('SEO javaslatok generálása folyamatban...', 'info');

      // SEO javaslatok generálása
      const seoJavaslatok = await generateSEOSuggestions(tartalom, 'hu');


      // Meta leírás generálása
      const huMeta = await api.post(`${API_URL}/meta/generate`, { 
        content: tartalom, 
        language: 'hu' 
      }).then(res => res.json());

      setMeta({
        ...meta,
        seoTitle: seoJavaslatok.title || cím,
        seoDescription: huMeta.metaDescription || ''
      });

      értesítésMegjelenítése('SEO javaslatok sikeresen generálva!', 'success');
    } catch (error) {
      console.error('Hiba a SEO javaslatok generálása során:', error);
      értesítésMegjelenítése('Hiba a SEO javaslatok generálása során', 'error');
    } finally {
      setGenerálás({...generálás, seo: false});
    }
  };

  // Címke javaslatok generálása
  const címkékGenerálása = async () => {
    if (!cím || !tartalom) {
      értesítésMegjelenítése('A címnek és a tartalomnak kitöltve kell lennie a címke javaslatokhoz', 'error');
      return;
    }

    if (!aiSegítségBekapcsolva) {
      értesítésMegjelenítése('Az AI segítség ki van kapcsolva', 'error');
      return;
    }

    try {
      setGenerálás({...generálás, címkék: true});
      értesítésMegjelenítése('Címke javaslatok generálása folyamatban...', 'info');

      // Javasolt címkék generálása
      const javasoltCímkék = await api.post(`${API_URL}/tags/suggest`, {
        content: tartalom,
        title: cím
      }).then(res => res.json());

      setMeta({
        ...meta,
        címkék: javasoltCímkék.tags.join(', ')
      });

      értesítésMegjelenítése('Címke javaslatok sikeresen generálva!', 'success');
    } catch (error) {
      console.error('Hiba a címke javaslatok generálása során:', error);
      értesítésMegjelenítése('Hiba a címke javaslatok generálása során', 'error');
    } finally {
      setGenerálás({...generálás, címkék: false});
    }
  };

  // Minden tartalom és fordítás automatikus generálása
  const mindenGenerálása = async () => {
    if (!cím || !tartalom) {
      értesítésMegjelenítése('A címnek és a tartalomnak kitöltve kell lennie az automatikus generáláshoz', 'error');
      return;
    }

    if (!aiSegítségBekapcsolva) {
      értesítésMegjelenítése('Az AI segítség ki van kapcsolva. Kapcsold be az automatikus generálás használatához.', 'error');
      return;
    }

    try {
      setAutoGenerálás(true);
      értesítésMegjelenítése('Tartalom és fordítások automatikus generálása folyamatban...', 'info');

      // 1. SEO javaslatok és meta tartalom generálása
      const seoJavaslatok = await api.post(`${API_URL}/seo/generate`, {
        content: tartalom,
        language: 'hu'
      }).then(res => res.json());

      // 2. Fordítások generálása
      const [deCím, enCím] = await Promise.all([
        api.post(`${API_URL}/translate`, { text: cím, from: 'hu', to: 'de' }).then(res => res.json()),
        api.post(`${API_URL}/translate`, { text: cím, from: 'hu', to: 'en' }).then(res => res.json())
      ]);

      const [deTartalom, enTartalom] = await Promise.all([
        api.post(`${API_URL}/translate`, { text: tartalom, from: 'hu', to: 'de' }).then(res => res.json()),
        api.post(`${API_URL}/translate`, { text: tartalom, from: 'hu', to: 'en' }).then(res => res.json())
      ]);

      // 3. Meta leírások generálása minden nyelvhez
      const [huMeta, deMeta, enMeta] = await Promise.all([
        api.post(`${API_URL}/meta/generate`, { content: tartalom, language: 'hu' }).then(res => res.json()),
        api.post(`${API_URL}/meta/generate`, { content: deTartalom.translation, language: 'de' }).then(res => res.json()),
        api.post(`${API_URL}/meta/generate`, { content: enTartalom.translation, language: 'en' }).then(res => res.json())
      ]);

      // 4. Javasolt címkék generálása
      const javasoltCímkék = await api.post(`${API_URL}/tags/suggest`, {
        content: tartalom,
        title: cím
      }).then(res => res.json());

      // Előnézeti adatok előkészítése
      const slug = slugGenerálás(cím);
      const bejegyzésAdat = {
        title: {
          hu: cím,
          de: deCím.translation || cím,
          en: enCím.translation || cím
        },
        content: {
          hu: tartalom,
          de: deTartalom.translation || tartalom,
          en: enTartalom.translation || tartalom
        },
        excerpt: {
          hu: huMeta.metaDescription || '',
          de: deMeta.metaDescription || '',
          en: enMeta.metaDescription || ''
        },
        slug,
        tags: javasoltCímkék.tags || [],
        published: false
      };

      setElőnézetAdat(bejegyzésAdat);
      setMeta({
        címkék: javasoltCímkék.tags.join(', '),
        seoTitle: seoJavaslatok.title || cím,
        seoDescription: huMeta.metaDescription || ''
      });

      értesítésMegjelenítése('Tartalom és fordítások sikeresen generálva!', 'success');
    } catch (error) {
      console.error('Hiba az automatikus generálás során:', error);
      értesítésMegjelenítése('Hiba a generálás során. Kérjük, próbáld újra.', 'error');
    } finally {
      setAutoGenerálás(false);
    }
  };

  // Blog bejegyzés létrehozása
  const bejegyzésLétrehozása = async () => {
    if (!cím || !tartalom) {
      értesítésMegjelenítése('A cím és a tartalom kitöltése kötelező', 'error');
      return;
    }

    try {
      setBetöltés(true);

      // Ha már van előnézeti adat, használjuk azt
      let bejegyzésAdat = előnézetAdat;
      
      // Ellenkező esetben generáljuk a minimálisan szükséges adatokat
      if (!bejegyzésAdat) {
        bejegyzésAdat = {
          title: {
            hu: cím,
            de: cím, // Kézi fordítást igényel
            en: cím  // Kézi fordítást igényel
          },
          content: {
            hu: tartalom,
            de: tartalom, // Kézi fordítást igényel
            en: tartalom  // Kézi fordítást igényel
          },
          excerpt: {
            hu: tartalom.substring(0, 150) + '...',
            de: tartalom.substring(0, 150) + '...',
            en: tartalom.substring(0, 150) + '...'
          },
          slug: slugGenerálás(cím),
          tags: meta.címkék ? meta.címkék.split(',').map(tag => tag.trim()) : [],
          published: false
        };
      }

      // Adatok küldése az API-nak
      const response = await api.post(`${API_URL}/posts`, bejegyzésAdat);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Nem sikerült létrehozni a bejegyzést');
      }

      értesítésMegjelenítése('Blog bejegyzés sikeresen létrehozva!', 'success');
      
      // Űrlap visszaállítása
      setCím('');
      setTartalom('');
      setElőnézetAdat(null);
      setMeta({
        címkék: '',
        seoTitle: '',
        seoDescription: ''
      });
      
      // Átirányítás a blog adminisztrációs felületre rövid késleltetés után
      setTimeout(() => {
        navigate('/blog');
      }, 2000);
    } catch (error) {
      console.error('Hiba a bejegyzés létrehozása során:', error);
      értesítésMegjelenítése('Hiba a bejegyzés létrehozása során: ' + error.message, 'error');
    } finally {
      setBetöltés(false);
    }
  };

  // Komponens renderelése
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Fejléc vissza gombbal */}
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate('/blog')}
            className="flex items-center text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Vissza a Blog Adminisztrációhoz
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="ai-segitseg"
                checked={aiSegítségBekapcsolva}
                onChange={(e) => setAiSegítségBekapcsolva(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ai-segitseg" className="ml-2 text-sm text-gray-600">
                AI Segítség Bekapcsolása
              </label>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setAktívFül('szerkesztő')}
                className={`px-3 py-1 text-sm rounded-md ${
                  aktívFül === 'szerkesztő' 
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Szerkesztő
              </button>
              <button
                onClick={() => setAktívFül('előnézet')}
                className={`px-3 py-1 text-sm rounded-md ${
                  aktívFül === 'előnézet' 
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Előnézet
              </button>
            </div>
          </div>
        </div>
          
        {/* Oldal címe */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Új Blog Bejegyzés Létrehozása</h1>
          <p className="mt-2 text-gray-600">
            Írd meg a tartalmat magyarul, és az AI segít lefordítani és optimalizálni
          </p>
        </div>
        
        {/* Értesítés */}
        {értesítés && (
          <ÉrtesítésBanner 
            üzenet={értesítés.üzenet} 
            típus={értesítés.típus} 
            onClose={értesítésElutasítása}
          />
        )}
        
        {/* Fő tartalom */}
        <div className="flex flex-col space-y-6">
          {aktívFül === 'szerkesztő' ? (
            <>
              {/* Cím beviteli mező */}
              <Kártya className="p-6">
                <label htmlFor="cim" className="block text-sm font-medium text-gray-700 mb-2">
                  Bejegyzés Címe (magyar)
                </label>
                <input
                  type="text"
                  id="cim"
                  value={cím}
                  onChange={(e) => setCím(e.target.value)}
                  placeholder="Írd be a blog bejegyzés címét..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </Kártya>
              
              {/* Tartalom szerkesztő */}
              <Kártya className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bejegyzés Tartalma (magyar)
                </label>
                <Editor
                  apiKey="kshcdddb1ogetllqn5eoqe0xny2tf1hhr9xf4e69hrdmy667"
                  value={tartalom}
                  init={{
                    height: 500,
                    menubar: true,
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
                  onEditorChange={(newContent) => setTartalom(newContent)}
                />
              </Kártya>
              
              {/* AI Eszközök */}
              <Kártya className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Sparkles className="h-5 w-5 text-blue-600 mr-2" />
                  AI Segédeszközök
                </h3>
                
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={seoGenerálása}
                    disabled={generálás.seo || !aiSegítségBekapcsolva}
                    className={`flex items-center px-4 py-2 rounded-md text-sm ${
                      !aiSegítségBekapcsolva ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                      generálás.seo ? 'bg-blue-100 text-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {generálás.seo ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                    SEO Javaslatok Generálása
                  </button>
                  
                  <button
                    onClick={címkékGenerálása}
                    disabled={generálás.címkék || !aiSegítségBekapcsolva}
                    className={`flex items-center px-4 py-2 rounded-md text-sm ${
                      !aiSegítségBekapcsolva ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                      generálás.címkék ? 'bg-blue-100 text-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {generálás.címkék ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : <Tags className="h-4 w-4 mr-2" />}
                    Címkék Generálása
                  </button>
                  
                  <button
                    onClick={mindenGenerálása}
                    disabled={autoGenerálás || !aiSegítségBekapcsolva}
                    className={`flex items-center px-4 py-2 rounded-md text-sm ${
                      !aiSegítségBekapcsolva ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                      autoGenerálás ? 'bg-blue-100 text-blue-700' : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {autoGenerálás ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : <Languages className="h-4 w-4 mr-2" />}
                    Minden Automatikus Generálása
                  </button>
                </div>
                
                {/* SEO és metaadat mezők */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SEO Cím
                    </label>
                    <input
                      type="text"
                      value={meta.seoTitle}
                      onChange={(e) => setMeta({...meta, seoTitle: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="SEO-ra optimalizált cím"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Címkék (vesszővel elválasztva)
                    </label>
                    <input
                      type="text"
                      value={meta.címkék}
                      onChange={(e) => setMeta({...meta, címkék: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="címke1, címke2, címke3"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SEO Leírás
                    </label>
                    <textarea
                      value={meta.seoDescription}
                      onChange={(e) => setMeta({...meta, seoDescription: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Meta leírás a keresőmotorok számára"
                    />
                  </div>
                </div>
              </Kártya>
            </>
          ) : (
            /* Előnézet fül tartalma */
            <Kártya className="p-6">
              {előnézetAdat ? (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold mb-4">Előnézet</h2>
                  
                  {/* Nyelvi fülek */}
                  <div className="flex border-b space-x-4">
                    {['hu', 'de', 'en'].map(lang => (
                      <button
                        key={lang}
                        className="px-3 py-2 border-b-2 border-transparent hover:border-blue-500 hover:text-blue-600 focus:outline-none"
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  
                  {/* Tartalom előnézet */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-700">Magyar</h3>
                      <h4 className="text-xl font-bold mt-2">{előnézetAdat.title.hu}</h4>
                      <p className="text-gray-500 mt-1">{előnézetAdat.excerpt.hu}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-700">Német</h3>
                      <h4 className="text-xl font-bold mt-2">{előnézetAdat.title.de}</h4>
                      <p className="text-gray-500 mt-1">{előnézetAdat.excerpt.de}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-700">Angol</h3>
                      <h4 className="text-xl font-bold mt-2">{előnézetAdat.title.en}</h4>
                      <p className="text-gray-500 mt-1">{előnézetAdat.excerpt.en}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-700">URL Slug</h3>
                      <code className="block mt-1 p-2 bg-gray-100 rounded">{előnézetAdat.slug}</code>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-700">Címkék</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {előnézetAdat.tags.map((címke, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            {címke}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <RefreshCw className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nincs elérhető előnézet</h3>
                  <p className="text-gray-500 mb-4">
                    Töltsd ki az űrlapot és használd az AI automatikus generálást az előnézet megtekintéséhez
                  </p>
                  <button
                    onClick={() => setAktívFül('szerkesztő')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  >
                    Vissza a Szerkesztőhöz
                  </button>
                </div>
              )}
            </Kártya>
          )}
          
          {/* Küldés gomb */}
          <div className="flex justify-end">
            <button
              onClick={bejegyzésLétrehozása}
              disabled={betöltés || !cím || !tartalom}
              className={`px-6 py-3 rounded-md font-medium ${
                betöltés || !cím || !tartalom
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {betöltés ? (
                <>
                  <Loader className="inline-block h-4 w-4 mr-2 animate-spin" />
                  Bejegyzés Létrehozása...
                </>
              ) : (
                'Blog Bejegyzés Létrehozása'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogKészítő;