import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import QuoteDetailsView from './QuoteDetailsView.jsx';
import QuoteStatusBadge from './QuoteStatusBadge.jsx';
import { Loader } from 'lucide-react';

const SharedQuoteView = () => {
  const { token } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dummy project adat, amit valódi adattal kellene helyettesíteni
  const [project, setProject] = useState({
    financial: {
      currency: 'EUR'
    }
  });

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        setLoading(true);
        setError('');
        
        // API kulcs a fejlécben (ezt a valós környezetben helyettesíteni kell)
        const config = {
          headers: {
            'X-API-Key': process.env.REACT_APP_API_KEY || 'your-api-key-here'
          }
        };
        
        const response = await axios.get(`/api/public/quotes/${token}`, config);
        setQuote(response.data);
        
        // Ha van projektID, akkor lekérjük a projekt adatait is
        if (response.data.projectId) {
          try {
            const projectResponse = await axios.get(`/api/public/projects/${response.data.projectId}`, config);
            setProject(projectResponse.data || {
              financial: { currency: 'EUR' }
            });
          } catch (err) {
            console.warn('Nem sikerült a projekt adatait lekérni:', err);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Hiba az árajánlat lekérésekor:', err);
        setError(err.response?.data?.message || 'Hiba történt az árajánlat betöltése során');
        setLoading(false);
      }
    };

    if (token) {
      fetchQuote();
    }
  }, [token]);

  // Árajánlat állapotának frissítése
  const handleStatusUpdate = (updatedQuote) => {
    setQuote({
      ...quote,
      ...updatedQuote
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full">
          <div className="text-red-600 text-center mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">Hiba történt</h2>
          <p className="text-gray-600 text-center">{error}</p>
          <div className="mt-6 text-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Újrapróbálás
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
          <h2 className="text-2xl font-bold mb-4">Árajánlat nem található</h2>
          <p className="text-gray-600">A keresett árajánlat nem létezik vagy lejárt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 bg-indigo-600 text-white">
            <div className="flex flex-wrap justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Árajánlat</h1>
                <p className="text-indigo-100">Árajánlat szám: {quote.quoteNumber}</p>
              </div>
              <QuoteStatusBadge 
                status={quote.status}
                className="bg-white bg-opacity-20 text-white border border-white border-opacity-20"
              />
            </div>
          </div>
          
          <div className="p-6">
            <QuoteDetailsView
              quote={quote}
              project={project}
              isClient={true}
              onStatusUpdate={handleStatusUpdate}
            />
          </div>
          
          <div className="p-6 bg-gray-50 border-t">
            <div className="text-center text-sm text-gray-500">
              <p>Ez az árajánlat elektronikusan készült és nem igényel aláírást.</p>
              <p className="mt-1">
                © {new Date().getFullYear()} NB Studio - Minden jog fenntartva
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedQuoteView;