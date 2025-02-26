import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
// MagicLogin.jsx elején
console.log("MagicLogin komponens betöltve");

const MagicLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);

  // Ellenőrizzük, hogy van-e token az URL-ben és érvényesítjük
  useEffect(() => {
    const verifyMagicLink = async () => {
      const query = new URLSearchParams(location.search);
      const token = query.get('token');
      
      if (token) {
        setVerifyingToken(true);
        setLoading(true);
        
        try {
          const response = await fetch('https://admin.nb-studio.net:5001/api/auth/verify-magic-link', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token })
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Érvénytelen link');
          }
          
          // Mentjük a token-t
          sessionStorage.setItem('token', data.token);
          sessionStorage.setItem('isAuthenticated', 'true');
          
          // Törli a tokent az URL-ből a biztonsági kockázat csökkentése érdekében
          navigate('/dashboard', { replace: true });
          
        } catch (error) {
          console.error('Magic link hiba:', error);
          setError(error.message || 'Hiba történt a bejelentkezés során');
          setVerifyingToken(false);
        } finally {
          setLoading(false);
        }
      } else {
        // Ellenőrizzük, hogy van-e már aktív munkamenet
        const isAuth = sessionStorage.getItem('isAuthenticated');
        if (isAuth === 'true') {
          navigate('/blog');
        }
      }
    };
    
    verifyMagicLink();
  }, [location, navigate]);

  // Magic link kérése
  const handleRequestMagicLink = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Kérjük, add meg az email címed');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('https://admin.nb-studio.net:5001/api/auth/request-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Hiba történt');
      }
      
      setSuccess(`Bejelentkezési link elküldve a következő címre: ${data.email}`);
      
    } catch (error) {
      console.error('Magic link kérési hiba:', error);
      setError(error.message || 'Nem sikerült elküldeni a bejelentkezési linket');
    } finally {
      setLoading(false);
    }
  };

  // Ha a tokent éppen ellenőrizzük, mutass betöltő képernyőt
  if (verifyingToken || loading && verifyingToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Bejelentkezés folyamatban...</h2>
        <p className="text-gray-500 mt-2">Kérjük, várj, amíg ellenőrizzük a bejelentkezési linket.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            NB Studio Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Bejelentkezés email címmel
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleRequestMagicLink}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email cím
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="appearance-none rounded-md relative block w-full pl-10 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Add meg az admin email címed"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Bejelentkezési link küldése...
                </div>
              ) : (
                'Bejelentkezési link küldése'
              )}
            </button>
          </div>
          
          <div className="text-center text-sm">
            <p className="text-gray-600">
              Egy egyszer használatos bejelentkezési linket küldünk a megadott email címre.
              <br/>A link 15 percig érvényes.
            </p>
          </div>
          
          <div className="text-sm text-center">
            <a 
              href="/login" 
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Inkább jelszóval jelentkeznék be
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MagicLogin;