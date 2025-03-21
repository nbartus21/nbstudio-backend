import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import SEO from '../components/SEO';

export default function Imprint() {
  const intl = useIntl();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchImprintData = async () => {
      try {
        // API-kulcs a környezeti változókból
        const apiKey = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';
        
        // Az API URL - a backend cím és port beállítások alapján
        const apiUrl = 'https://admin.nb-studio.net:5001/api/public/webpages/imprint';
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setPageData(data);
      } catch (err) {
        console.error('Error fetching imprint data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchImprintData();
  }, []);

  // Nyelv-specifikus tartalom kiválasztása
  const getLocalizedContent = () => {
    if (!pageData) return null;
    
    // Aktuális nyelv lekérése
    const currentLocale = intl.locale || 'en';
    
    return {
      title: pageData.title[currentLocale] || pageData.title.en,
      content: pageData.content[currentLocale] || pageData.content.en
    };
  };

  const localizedContent = getLocalizedContent();

  return (
    <div className="min-h-screen bg-black text-white py-40 relative overflow-hidden">
      <SEO
        title={intl.formatMessage({ id: 'imprint.seo.title' })}
        description={intl.formatMessage({ id: 'imprint.seo.description' })}
      />

      {/* Animated background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 bg-blue-500/30"
          animate={{
            background: [
              'rgba(59, 130, 246, 0.3)',
              'rgba(139, 92, 246, 0.3)',
              'rgba(236, 72, 153, 0.3)',
              'rgba(59, 130, 246, 0.3)'
            ]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-30" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 rounded-2xl"
        >
          {loading && (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="text-red-500 p-4">
              <h2 className="text-xl font-bold mb-2">Error Loading Content</h2>
              <p>{error}</p>
              
              {/* Fallback tartalom megjelenítése hiba esetén */}
              <div className="mt-8">
                <h1 className="text-3xl font-bold mb-8">
                  {intl.formatMessage({ id: 'imprint.title' })}
                </h1>

                <section className="mb-8">
                  <h2 className="text-xl font-bold mb-4">
                    {intl.formatMessage({ id: 'imprint.company.title' })}
                  </h2>
                  <p className="mb-2">NB-Studio</p>
                  <p className="mb-2">Norbert Bartus</p>
                  <p className="mb-2">Kübelstraße 12</p>
                  <p className="mb-2">76646 Bruchsal</p>
                  <p className="mb-2">Deutschland</p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-bold mb-4">
                    {intl.formatMessage({ id: 'imprint.contact.title' })}
                  </h2>
                  <p className="mb-2">
                    {intl.formatMessage({ id: 'imprint.contact.phone' })}: +49 (0) 176 / 3415 6797
                  </p>
                  <p className="mb-2">
                    {intl.formatMessage({ id: 'imprint.contact.email' })}: info@nb-studio.net
                  </p>
                </section>
              </div>
            </div>
          )}

          {!loading && !error && localizedContent && (
            <>
              <h1 className="text-3xl font-bold mb-8">
                {localizedContent.title}
              </h1>
              
              {/* API-ról érkező HTML tartalom biztonságos megjelenítése */}
              <div 
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: localizedContent.content }}
              />
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
