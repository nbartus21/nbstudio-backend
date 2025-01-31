import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/auth';
import QRCode from 'qrcode.react'; // Ezt telepíteni kell: npm install qrcode.react

const API_URL = 'https://admin.nb-studio.net:5001/api';

const SharedProjectView = () => {
  const { token } = useParams();
  const [project, setProject] = useState(null);
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const verifyPin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/public/projects/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
        },
        body: JSON.stringify({ token, pin })
      });
      
      console.log('API válasz státusz:', response.status);
      
      const data = await response.json();
      console.log('Projekt adatok:', data.project); // Debug log
  
      if (response.ok) {
        console.log('Sikeres PIN ellenőrzés');
        setProject(data.project);
        setIsVerified(true);
        setError(null);
      } else {
        console.error('Sikertelen PIN ellenőrzés:', data.message);
        setError(data.message || 'Érvénytelen PIN kód');
      }
    } catch (error) {
      console.error('Hiba történt:', error);
      setError('Hiba történt az ellenőrzés során: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Számla adatok előkészítése SEPA QR kódhoz
  const generateSepaQrData = (invoice) => {
    const data = {
      name: "Norbert Bartus",
      address: "Saffnerstraße 25",
      city: "Bruchsal 76646",
      country: "Deutschland",
      taxNumber: "St.-Nr.: 68 044/74729",
      vatNumber: "USt-IdNr.: DE354616301",
      iban: "DE47 6634 0014 0743 4638 00",
      bankName: "BANK: Commerzbank AG",
      bic: "SWIFT/BIC: COBADEFFXXX",
      amount: invoice.totalAmount,
      currency: project?.financial?.currency || 'EUR',
      reference: invoice.number,
      info: `Invoice: ${invoice.number}`
    };
  
    // SEPA QR kód formátum
    return `BCD
002
1
SCT
${data.bic}
${data.name}
${data.iban}
EUR${data.amount}

${data.reference}
${data.info}
${data.address}
${data.city}
${data.country}`;
  };

  // Számla PDF generálása
  const generateInvoicePDF = async (invoice) => {
    try {
      const response = await fetch(`${API_URL}/public/invoices/${invoice._id}/pdf`, {
        method: 'GET',
        headers: {
          'X-API-Key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoice.number}.pdf`;
        a.click();
      } else {
        setError('Nem sikerült letölteni a számlát');
      }
    } catch (error) {
      console.error('Hiba a számla letöltésekor:', error);
      setError('Hiba történt a számla letöltése során');
    }
  };

  // Számla Modal komponens
  const InvoiceModal = ({ invoice, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Számla részletek</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6">
          {/* Számlázó adatai */}
          <div>
            <h3 className="font-semibold mb-2">Számlázó:</h3>
            <p className="text-sm">Norbert Bartus</p>
            <p className="text-sm">Saffnerstraße 25</p>
            <p className="text-sm">Bruchsal 76646</p>
            <p className="text-sm">Deutschland</p>
            <p className="text-sm mt-2">St.-Nr.: 68 044/74729</p>
            <p className="text-sm">USt-IdNr.: DE354616301</p>
            <p className="text-sm mt-2">IBAN: DE47 6634 0014 0743 4638 00</p>
            <p className="text-sm">BANK: Commerzbank AG</p>
            <p className="text-sm">SWIFT/BIC: COBADEFFXXX</p>
          </div>

          {/* Vevő adatai */}
          <div>
            <h3 className="font-semibold mb-2">Vevő:</h3>
            {project.client && (
              <>
                <p className="text-sm">{project.client.name}</p>
                <p className="text-sm">{project.client.email}</p>
                {project.client.address && (
                  <>
                    <p className="text-sm">{project.client.address.street}</p>
                    <p className="text-sm">{project.client.address.city}</p>
                    <p className="text-sm">{project.client.address.postalCode}</p>
                    <p className="text-sm">{project.client.address.country}</p>
                  </>
                )}
                {project.client.taxNumber && (
                  <p className="text-sm mt-2">Adószám: {project.client.taxNumber}</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Számla fejléc */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold">Számla adatok</h3>
              <p>Számla szám: {invoice.number}</p>
              <p>Dátum: {new Date(invoice.date).toLocaleDateString()}</p>
              <p>Fizetési határidő: {new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="font-semibold">Állapot</h3>
              <span className={`px-2 py-1 rounded-full text-sm ${
                invoice.status === 'fizetett' ? 'bg-green-100 text-green-800' :
                invoice.status === 'késedelmes' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {invoice.status}
              </span>
            </div>
          </div>

          {/* Tételek táblázat */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tétel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mennyiség
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Egységár
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Összesen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">{item.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.unitPrice} {project.financial?.currency || 'EUR'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.total} {project.financial?.currency || 'EUR'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Összegzés és QR kód */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <h3 className="font-semibold mb-2">Fizetendő összeg</h3>
              <p className="text-2xl font-bold">
                {invoice.totalAmount} {project.financial?.currency || 'EUR'}
              </p>
              <div className="mt-4">
                <button
                  onClick={() => generateInvoicePDF(invoice)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Számla letöltése (PDF)
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <h3 className="font-semibold mb-2">SEPA QR kód</h3>
              {invoice.totalAmount > 0 && (
                <>
                  <QRCode 
                    value={generateSepaQrData(invoice)} 
                    size={200}
                    level="M"
                    renderAs="svg"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Szkennelje be a QR kódot a banki alkalmazásával a gyors fizetéshez
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Számla lista komponens
  const InvoiceList = () => (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Számlák</h3>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {project.invoices.map((invoice) => (
          <div key={invoice._id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-semibold">{invoice.number}</h4>
                <p className="text-sm text-gray-600">
                  {new Date(invoice.date).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-sm ${
                invoice.status === 'fizetett' ? 'bg-green-100 text-green-800' :
                invoice.status === 'késedelmes' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {invoice.status}
              </span>
            </div>
            <p className="text-lg font-bold mb-4">
              {invoice.totalAmount} {project.financial?.currency || 'EUR'}
            </p>
            <button
              onClick={() => {
                setSelectedInvoice(invoice);
                setShowInvoiceModal(true);
              }}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Részletek
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // Loading indikátor
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Projekt megtekintése
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Kérjük, adja meg a PIN kódot a hozzáféréshez
            </p>
          </div>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <form className="mt-8 space-y-6" onSubmit={verifyPin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <input
                type="text"
                maxLength="6"
                placeholder="PIN kód (6 számjegy)"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length <= 6) {
                    setPin(value);
                  }
                }}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={loading || pin.length !== 6}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Ellenőrzés...' : 'Belépés'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Projekt megjelenítése
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">{project.name}</h2>
          <p className="text-gray-600 mb-4">{project.description}</p>
          <div className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
            {project.status}
          </div>
        </div>

        {project.invoices && project.invoices.length > 0 && <InvoiceList />}

        {showInvoiceModal && selectedInvoice && (
          <InvoiceModal
            invoice={selectedInvoice}
            onClose={() => {
              setShowInvoiceModal(false);
              setSelectedInvoice(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SharedProjectView;