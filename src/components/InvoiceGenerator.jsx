import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const InvoiceGenerator = ({ invoice, projectEmail }) => {
  const [paymentLink, setPaymentLink] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [email, setEmail] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Email ellenőrzés
  const verifyEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (email.toLowerCase() === projectEmail.toLowerCase()) {
      setIsVerified(true);
      // Ha az email helyes, generáljuk a fizetési linket
      await generateStripeLink();
    } else {
      setError('A megadott email cím nem egyezik a projektben szereplővel.');
    }
    setIsLoading(false);
  };

  // SEPA átutalási QR kód generálása
  const generateSEPAQR = () => {
    const data = {
      name: invoice.client?.name || '',
      iban: "HU42117730161111111111111111", // Példa IBAN
      amount: invoice.totalAmount,
      reference: invoice.number,
      description: `Számla: ${invoice.number}`
    };

    const qrData = [
      'BCD',                  
      '002',                 
      '1',                   
      'SCT',                 
      data.iban,             
      data.name,             
      invoice.totalAmount,   
      'EUR',                 
      data.reference,        
      data.description       
    ].join('\n');

    return qrData;
  };

  // Stripe fizetési link generálása
  const generateStripeLink = async () => {
    try {
      const response = await fetch('https://nbstudio-backend.onrender.com/api/create-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: invoice.totalAmount * 100,
          currency: 'eur',
          invoice_id: invoice._id,
          email: email // Email továbbítása a backendnek
        })
      });

      if (!response.ok) throw new Error('Hiba a fizetési link létrehozásakor');
      
      const data = await response.json();
      setPaymentLink(data.url);
    } catch (error) {
      console.error('Fizetési link hiba:', error);
      setError('Hiba történt a fizetési link létrehozásakor');
    }
  };

  if (!isVerified) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Számla megtekintése</h3>
        <p className="text-sm text-gray-600 mb-4">
          A számla megtekintéséhez kérjük, adja meg az email címét ellenőrzés céljából.
        </p>
        
        <form onSubmit={verifyEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email cím
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Ellenőrzés...' : 'Tovább'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      {/* Számla státusz */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          Számla #{invoice.number}
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm ${
          invoice.status === 'fizetett' ? 'bg-green-100 text-green-800' :
          invoice.status === 'késedelmes' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {invoice.status}
        </span>
      </div>

      {/* Számla részletek */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Kiállítás dátuma:</p>
            <p className="font-medium">{new Date(invoice.date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Fizetési határidő:</p>
            <p className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600">Végösszeg:</p>
          <p className="text-xl font-bold">{invoice.totalAmount.toLocaleString()} EUR</p>
        </div>
      </div>

      {/* Fizetési lehetőségek */}
      {invoice.status !== 'fizetett' && (
        <div className="space-y-4">
          {/* Banki átutalás */}
          <div>
            <h4 className="font-medium mb-2">Banki átutalás</h4>
            <button
              onClick={() => setShowQR(!showQR)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showQR ? 'QR kód elrejtése' : 'QR kód mutatása'}
            </button>
            
            {showQR && (
              <div className="mt-4">
                <QRCodeSVG
                  value={generateSEPAQR()}
                  size={256}
                  level="M"
                />
                <div className="mt-2 text-sm text-gray-600">
                  Olvassa be a QR kódot a banki alkalmazásával az utalási adatok automatikus kitöltéséhez
                </div>
              </div>
            )}
          </div>

          {/* Online fizetés */}
          {paymentLink && (
            <div>
              <h4 className="font-medium mb-2">Online fizetés</h4>
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 inline-block"
              >
                Fizetés bankkártyával
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceGenerator;