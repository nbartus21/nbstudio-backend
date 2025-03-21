import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import SEO from '../components/SEO';

export default function Cookies() {
  const intl = useIntl();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get the current language from the intl context
  const currentLanguage = intl.locale || 'de';

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://admin.nb-studio.net:5001/api/public/content/cookies', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        setContent(data.content);
      } catch (error) {
        console.error('Error fetching content:', error);
        setError('Failed to load content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  // Dynamically access content for the current language or fallback to a default language
  const getLocalizedContent = () => {
    if (!content) return null;
    
    // Use the current language if available, otherwise try these fallbacks in order
    return content[currentLanguage] || content.en || content.de || content.hu || {};
  };

  const localizedContent = getLocalizedContent();

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white py-40 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !localizedContent) {
    return (
      <div className="min-h-screen bg-black text-white py-40 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="glass-card p-8 rounded-2xl">
            <h1 className="text-3xl font-bold mb-8">
              {intl.formatMessage({ id: 'cookies.title' })}
            </h1>
            <p className="text-red-400">
              {error || 'Content not available in your language.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-40 relative overflow-hidden">
      <SEO
        title={localizedContent.seo?.title || intl.formatMessage({ id: 'cookies.seo.title' })}
        description={localizedContent.seo?.description || intl.formatMessage({ id: 'cookies.seo.description' })}
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
          <h1 className="text-3xl font-bold mb-8">
            {localizedContent.title || intl.formatMessage({ id: 'cookies.title' })}
          </h1>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">
              {localizedContent.general?.title || intl.formatMessage({ id: 'cookies.general.title' })}
            </h2>
            <p className="mb-4">
              {localizedContent.general?.content || intl.formatMessage({ id: 'cookies.general.content' })}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">
              {localizedContent.types?.title || intl.formatMessage({ id: 'cookies.types.title' })}
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>{localizedContent.types?.item1 || intl.formatMessage({ id: 'cookies.types.item1' })}</li>
              <li>{localizedContent.types?.item2 || intl.formatMessage({ id: 'cookies.types.item2' })}</li>
              <li>{localizedContent.types?.item3 || intl.formatMessage({ id: 'cookies.types.item3' })}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">
              {localizedContent.management?.title || intl.formatMessage({ id: 'cookies.management.title' })}
            </h2>
            <p className="mb-4">
              {localizedContent.management?.content || intl.formatMessage({ id: 'cookies.management.content' })}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">
              {localizedContent.contact?.title || intl.formatMessage({ id: 'cookies.contact.title' })}
            </h2>
            <p className="mb-2">
              {localizedContent.contact?.name || intl.formatMessage({ id: 'cookies.contact.name' })}: Norbert Bartus
            </p>
            <p className="mb-2">
              {localizedContent.contact?.email || intl.formatMessage({ id: 'cookies.contact.email' })}: info@nb-studio.net
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}