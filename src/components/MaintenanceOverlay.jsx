import React, { useState, useEffect } from 'react';

const MaintenanceOverlay = () => {
  const [isInMaintenance, setIsInMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        // Lekérjük a weboldal beállításokat az API-ról
        const response = await fetch('https://admin.nb-studio.net:5001/api/settings/public/website');
        
        if (!response.ok) {
          console.error('Nem sikerült lekérni a karbantartási állapotot');
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        
        // Ellenőrizzük, hogy a weboldal karbantartás alatt van-e
        if (data.maintenanceMode === true) {
          setIsInMaintenance(true);
          setMaintenanceMessage(data.maintenanceMessage || 'A weboldal karbantartás alatt áll. Kérjük, látogasson vissza később!');
        } else {
          setIsInMaintenance(false);
        }
      } catch (error) {
        console.error('Hiba a karbantartási állapot lekérésekor:', error);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenanceStatus();
    
    // Rendszeres ellenőrzés (5 percenként)
    const interval = setInterval(checkMaintenanceStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Ha még töltődik vagy nincs karbantartás, nem jelenítünk meg semmit
  if (loading || !isInMaintenance) {
    return null;
  }

  // Karbantartási overlay megjelenítése
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Karbantartás</h2>
        <p className="text-gray-600 mb-6">{maintenanceMessage}</p>
        <div className="animate-pulse flex justify-center">
          <div className="h-2 w-2 bg-gray-500 rounded-full mx-1"></div>
          <div className="h-2 w-2 bg-gray-500 rounded-full mx-1 animation-delay-200"></div>
          <div className="h-2 w-2 bg-gray-500 rounded-full mx-1 animation-delay-400"></div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceOverlay;
