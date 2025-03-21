import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import SEO from '../components/SEO';

const API_URL = import.meta.env.VITE_API_URL || 'https://admin.nb-studio.net';

const ContentPage = () => {
  const { slug } = useParams();
  const intl = useIntl();
  const [pageContent, setPageContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/public/content-pages/${slug}`, {
          headers: {
            'X-API-Key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
          }
        });
        
        // Convert Map to object if necessary
        const content = response.data.content instanceof Map
          ? Object.fromEntries(response.data.content)
          : response.data.content;
        
        setPageContent(content);
        setError(null);
      } catch (error) {
        console.error(`Error fetching ${slug} page content:`, error);
        setError('Failed to load page content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (slug && ['terms', 'privacy', 'cookies', 'imprint'].includes(slug)) {
      fetchContent();
    } else {
      setError('Invalid page requested');
      setLoading(false);
    }
  }, [slug]);

  // Function to render different content sections based on the page slug
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <h2 className="text-xl text-red-400 mb-4">Error</h2>
          <p>{error}</p>
        </div>
      );
    }

    // If we have no content yet
    if (!pageContent || Object.keys(pageContent).length === 0) {
      return (
        <div className="text-center py-12">
          <p>No content available for this page yet.</p>
        </div>
      );
    }

    switch (slug) {
      case 'terms':
        return renderTermsContent();
      case 'privacy':
        return renderPrivacyContent();
      case 'cookies':
        return renderCookiesContent();
      case 'imprint':
        return renderImprintContent();
      default:
        return <p>Page not found</p>;
    }
  };

  // Renders the Terms of Service content
  const renderTermsContent = () => (
    <>
      <h1 className="text-3xl font-bold mb-8">
        {pageContent.title || 'Terms of Service'}
      </h1>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['general.title'] || 'General Information'}
        </h2>
        <p className="mb-4">
          {pageContent['general.content'] || ''}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['usage.title'] || 'Usage'}
        </h2>
        <p className="mb-4">
          {pageContent['usage.content'] || ''}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['liability.title'] || 'Liability'}
        </h2>
        <p className="mb-4">
          {pageContent['liability.content'] || ''}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['changes.title'] || 'Changes to Terms'}
        </h2>
        <p className="mb-4">
          {pageContent['changes.content'] || ''}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">
          {pageContent['contact.title'] || 'Contact'}
        </h2>
        <p className="mb-2">
          {pageContent['contact.name'] ? `${pageContent['contact.name']}: Norbert Bartus` : 'Name: Norbert Bartus'}
        </p>
        <p className="mb-2">
          {pageContent['contact.email'] ? `${pageContent['contact.email']}: kontakt@nb-studio.net` : 'Email: kontakt@nb-studio.net'}
        </p>
      </section>
    </>
  );

  // Renders the Privacy Policy content
  const renderPrivacyContent = () => (
    <>
      <h1 className="text-3xl font-bold mb-8">
        {pageContent.title || 'Privacy Policy'}
      </h1>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['general.title'] || 'General Information'}
        </h2>
        <p className="mb-4">
          {pageContent['general.content'] || ''}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['data.title'] || 'Data We Collect'}
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>{pageContent['data.item1'] || ''}</li>
          <li>{pageContent['data.item2'] || ''}</li>
          <li>{pageContent['data.item3'] || ''}</li>
          <li>{pageContent['data.item4'] || ''}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['cookies.title'] || 'Cookies'}
        </h2>
        <p className="mb-4">
          {pageContent['cookies.content'] || ''}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['rights.title'] || 'Your Rights'}
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>{pageContent['rights.item1'] || ''}</li>
          <li>{pageContent['rights.item2'] || ''}</li>
          <li>{pageContent['rights.item3'] || ''}</li>
          <li>{pageContent['rights.item4'] || ''}</li>
          <li>{pageContent['rights.item5'] || ''}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['contact.title'] || 'Contact'}
        </h2>
        <p className="mb-2">
          {pageContent['contact.name'] ? `${pageContent['contact.name']}: Norbert Bartus` : 'Name: Norbert Bartus'}
        </p>
        <p className="mb-2">
          {pageContent['contact.email'] ? `${pageContent['contact.email']}: datenschutz@nb-studio.net` : 'Email: datenschutz@nb-studio.net'}
        </p>
      </section>
    </>
  );

  // Renders the Cookies Policy content
  const renderCookiesContent = () => (
    <>
      <h1 className="text-3xl font-bold mb-8">
        {pageContent.title || 'Cookies Policy'}
      </h1>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['general.title'] || 'General Information'}
        </h2>
        <p className="mb-4">
          {pageContent['general.content'] || ''}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['types.title'] || 'Types of Cookies'}
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>{pageContent['types.item1'] || ''}</li>
          <li>{pageContent['types.item2'] || ''}</li>
          <li>{pageContent['types.item3'] || ''}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['management.title'] || 'Cookie Management'}
        </h2>
        <p className="mb-4">
          {pageContent['management.content'] || ''}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">
          {pageContent['contact.title'] || 'Contact'}
        </h2>
        <p className="mb-2">
          {pageContent['contact.name'] ? `${pageContent['contact.name']}: Norbert Bartus` : 'Name: Norbert Bartus'}
        </p>
        <p className="mb-2">
          {pageContent['contact.email'] ? `${pageContent['contact.email']}: info@nb-studio.net` : 'Email: info@nb-studio.net'}
        </p>
      </section>
    </>
  );

  // Renders the Imprint content
  const renderImprintContent = () => (
    <>
      <h1 className="text-3xl font-bold mb-8">
        {pageContent.title || 'Imprint'}
      </h1>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['company.title'] || 'Company Information'}
        </h2>
        <p className="mb-2">NB-Studio</p>
        <p className="mb-2">Norbert Bartus</p>
        <p className="mb-2">Kübelstraße 12</p>
        <p className="mb-2">76646 Bruchsal</p>
        <p className="mb-2">Deutschland</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['contact.title'] || 'Contact'}
        </h2>
        <p className="mb-2">
          {pageContent['contact.phone'] ? `${pageContent['contact.phone']}: +49 (0) 176 / 3415 6797` : 'Phone: +49 (0) 176 / 3415 6797'}
        </p>
        <p className="mb-2">
          {pageContent['contact.email'] ? `${pageContent['contact.email']}: info@nb-studio.net` : 'Email: info@nb-studio.net'}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['registration.title'] || 'Registration Information'}
        </h2>
        <p className="mb-2">
          {pageContent['registration.vatId'] ? `${pageContent['registration.vatId']}: DE358680100` : 'VAT ID: DE358680100'}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {pageContent['responsibility.title'] || 'Responsibility for Content'}
        </h2>
        <p className="mb-4">
          {pageContent['responsibility.content'] || ''}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">
          {pageContent['disclaimer.title'] || 'Disclaimer'}
        </h2>
        <p className="mb-4">
          {pageContent['disclaimer.content'] || ''}
        </p>
      </section>
    </>
  );

  return (
    <div className="min-h-screen bg-black text-white py-40 relative overflow-hidden">
      <SEO
        title={pageContent['seo.title'] || `${slug.charAt(0).toUpperCase() + slug.slice(1)}`}
        description={pageContent['seo.description'] || ``}
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
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
};

export default ContentPage;
