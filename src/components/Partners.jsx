import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, ExternalLink } from 'lucide-react';

const API_URL = 'https://admin.nb-studio.net:5001/api/public/partners';

const Partners = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLanguage, setActiveLanguage] = useState('de'); // Alapértelmezett nyelv

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API hiba: ${response.status}`);
      }
      
      const data = await response.json();
      setPartners(data);
    } catch (error) {
      console.error('Hiba a partnerek lekérésekor:', error);
      setError('Nem sikerült betölteni a partnereket. Kérjük, próbálja újra később.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-40 flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-40 flex justify-center items-center">
        <div className="text-center p-8 bg-gray-800 rounded-lg shadow max-w-lg">
          <div className="text-red-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Hiba történt</h2>
          <p className="text-gray-300">{error}</p>
          <button 
            onClick={fetchPartners}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Újrapróbálkozás
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-40 relative overflow-hidden">
      {/* Animált háttér */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 bg-blue-500/20"
          animate={{
            background: [
              'rgba(59, 130, 246, 0.2)',
              'rgba(139, 92, 246, 0.2)',
              'rgba(236, 72, 153, 0.2)',
              'rgba(59, 130, 246, 0.2)'
            ]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Partnereink
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Megbízható partnereink, akikkel együttműködve kiváló szolgáltatásokat nyújtunk ügyfeleinknek.
          </p>
        </motion.div>

        {/* Nyelv választó gombok */}
        <div className="flex justify-center mb-10 gap-4">
          {['de', 'en', 'hu'].map(lang => (
            <button
              key={lang}
              onClick={() => setActiveLanguage(lang)}
              className={`px-4 py-2 rounded-md ${
                activeLanguage === lang
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {lang === 'de' ? 'Deutsch' : lang === 'en' ? 'English' : 'Magyar'}
            </button>
          ))}
        </div>

        {partners.length === 0 ? (
          <div className="text-center p-8 bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-xl max-w-2xl mx-auto">
            <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Nincsenek elérhető partnerek</h2>
            <p className="text-gray-300">Hamarosan frissítjük az oldalt partnereinkkel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {partners.map((partner, index) => (
              <motion.a
                key={partner._id}
                href={partner.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative block p-6 rounded-xl overflow-hidden"
              >
                {/* Üveg háttér */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg border border-white/10 rounded-xl" />
                
                {/* Hover effekt */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                
                {/* Tartalom */}
                <div className="relative">
                  <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-blue-400 group-hover:to-purple-400 transition-all duration-300">
                    {partner.name?.[activeLanguage] || 'Partner'}
                  </h3>
                  <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300 mb-4">
                    {partner.description?.[activeLanguage] || 'Leírás nem elérhető'}
                  </p>
                  <div className="flex items-center text-blue-400 group-hover:text-blue-300 transition-colors duration-300">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    <span className="text-sm">Weboldal megtekintése</span>
                  </div>
                </div>
                
                {/* Fényeffekt */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000" />
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Partners;