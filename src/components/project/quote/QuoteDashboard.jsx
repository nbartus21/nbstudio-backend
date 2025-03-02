import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Calendar,
  X,
  FileText
} from 'lucide-react';

// API kulcs az autentikációhoz
const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';
const API_URL = 'https://admin.nb-studio.net:5001';

const QuoteDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalQuotes: 0,
    activeQuotes: 0,
    acceptedQuotes: 0,
    rejectedQuotes: 0,
    expiredQuotes: 0,
    totalAmount: 0,
    acceptedAmount: 0,
    conversionRate: 0,
    expiringQuotes: [],
    monthlyStats: [],
    statusDistribution: []
  });

  // Adatok lekérése a szerverről
  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Közvetlen API hívás
      const response = await fetch(`${API_URL}/api/public/quotes/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error(`Elemzési adatok lekérése sikertelen: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Analitika sikeresen betöltve:', data);
      setAnalytics(data);
    } catch (error) {
      console.error('Hiba az analitikai adatok lekérdezésekor:', error);
      setError(error.message);
      
      // Tesztadatok megjelenítése, ha a szerver nem válaszol
      generateMockData();
    } finally {
      setLoading(false);
    }
  };

  // Mock adatok generálása ha a szerver nincs kész
  const generateMockData = () => {
    const mockData = {
      totalQuotes: 147,
      activeQuotes: 23,
      acceptedQuotes: 86,
      rejectedQuotes: 19,
      expiredQuotes: 19,
      totalAmount: 87450,
      acceptedAmount: 53200,
      conversionRate: 58.5,
      expiringQuotes: [
        { _id: '1', quoteNumber: 'AJ-2023120001', client: { name: 'Demo Kft.' }, totalAmount: 1850, validUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
        { _id: '2', quoteNumber: 'AJ-2023120012', client: { name: 'Példa Bt.' }, totalAmount: 2750, validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
        { _id: '3', quoteNumber: 'AJ-2023120023', client: { name: 'Teszt Zrt.' }, totalAmount: 5400, validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() }
      ],
      monthlyStats: [
        { month: 'Jan', quotes: 8, accepted: 5, amount: 3200 },
        { month: 'Feb', quotes: 12, accepted: 7, amount: 4100 },
        { month: 'Már', quotes: 10, accepted: 6, amount: 3800 },
        { month: 'Ápr', quotes: 15, accepted: 9, amount: 5600 },
        { month: 'Máj', quotes: 18, accepted: 11, amount: 6700 },
        { month: 'Jún', quotes: 14, accepted: 8, amount: 5200 },
        { month: 'Júl', quotes: 16, accepted: 10, amount: 6300 },
        { month: 'Aug', quotes: 13, accepted: 7, amount: 4900 },
        { month: 'Szep', quotes: 19, accepted: 13, amount: 7200 },
        { month: 'Okt', quotes: 22, accepted: 15, amount: 8500 },
        { month: 'Nov', quotes: 17, accepted: 10, amount: 6800 },
        { month: 'Dec', quotes: 12, accepted: 6, amount: 4600 }
      ],
      statusDistribution: [
        { name: 'Elküldve', value: 23 },
        { name: 'Elfogadva', value: 86 },
        { name: 'Elutasítva', value: 19 },
        { name: 'Lejárt', value: 19 }
      ]
    };
    
    setAnalytics(mockData);
  };
  
  // Betöltéskor lekérdezzük az elemzési adatokat
  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Pénznem formázás
  const formatCurrency = (amount, currency = 'EUR') => {
    return `${amount.toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
  };
  
  // Dátum formázás
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU');
  };
  
  // Napok számolása a lejáratig
  const getDaysRemaining = (dateString) => {
    const validUntil = new Date(dateString);
    const today = new Date();
    const diffTime = validUntil - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Statisztika kártya komponens
  const StatCard = ({ title, value, icon, trend, trendValue, color }) => {
    return (
      <div className={`bg-white rounded-lg shadow p-6 border-t-4 border-${color}-500`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            
            {trend && (
              <div className={`flex items-center mt-2 text-sm text-${trend === 'up' ? 'green' : 'red'}-600`}>
                {trend === 'up' ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          
          <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}>
            {icon}
          </div>
        </div>
      </div>
    );
  };

  // Komponens a hamarosan lejáró árajánlatokhoz
  const ExpiringQuotes = ({ quotes }) => {
    if (!quotes || quotes.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-gray-500">Nincsenek hamarosan lejáró árajánlatok</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {quotes.map(quote => {
          const daysLeft = getDaysRemaining(quote.validUntil);
          let colorClass = 'text-yellow-600';
          
          if (daysLeft <= 2) {
            colorClass = 'text-red-600';
          } else if (daysLeft >= 5) {
            colorClass = 'text-green-600';
          }
          
          return (
            <div key={quote._id} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{quote.quoteNumber}</div>
                  <div className="text-sm text-gray-500">{quote.client.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(quote.totalAmount)}</div>
                  <div className={`text-sm ${colorClass} font-medium`}>
                    {daysLeft} nap múlva lejár
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Színek a grafikonokhoz
  const chartColors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="container mx-auto p-4">
      {error && !loading && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Statisztikák betöltése...</p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold mb-6">Árajánlat Dashboard</h1>
          
          {/* Fő statisztikák */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Összes árajánlat"
              value={analytics.totalQuotes}
              icon={<FileText className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Elfogadott árajánlatok"
              value={analytics.acceptedQuotes}
              icon={<CheckCircle className="h-6 w-6" />}
              color="green"
              trend="up"
              trendValue={`${analytics.conversionRate}% konverzió`}
            />
            <StatCard
              title="Aktív árajánlatok értéke"
              value={formatCurrency(analytics.totalAmount)}
              icon={<DollarSign className="h-6 w-6" />}
              color="indigo"
            />
            <StatCard
              title="Elfogadott árajánlatok értéke"
              value={formatCurrency(analytics.acceptedAmount)}
              icon={<DollarSign className="h-6 w-6" />}
              color="purple"
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Havi statisztikák */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4">Havi árajánlat statisztikák</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quotes" name="Árajánlatok" fill="#4f46e5" />
                    <Bar dataKey="accepted" name="Elfogadott" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Státusz eloszlás */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4">Árajánlatok státusz szerint</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Hamarosan lejáró árajánlatok */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Calendar className="h-5 w-5 text-red-500 mr-2" />
              <h2 className="text-lg font-medium">Hamarosan lejáró árajánlatok</h2>
            </div>
            <ExpiringQuotes quotes={analytics.expiringQuotes} />
          </div>
        </>
      )}
    </div>
  );
};

export default QuoteDashboard;