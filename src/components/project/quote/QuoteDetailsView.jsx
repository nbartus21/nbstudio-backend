import React, { useState, useEffect } from 'react';
import { Download, Copy, CheckCircle, XCircle } from 'lucide-react';
import QuoteStatusBadge from './QuoteStatusBadge.jsx';
import { api } from '../../../services/auth'; // Importáljuk az api objektumot

// API URL beállítása
const API_URL = 'https://admin.nb-studio.net:5001';

const QuoteDetailsView = ({ quote, project, isClient = false, onClose, onStatusUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [clientPin, setClientPin] = useState('');
  const [pinStatus, setPinStatus] = useState(null);
  
  // Reset error and success messages when quote changes
  useEffect(() => {
    setError('');
    setSuccess('');
  }, [quote]);

  // Státusz frissítése (admin funkcionalitás)
  const updateStatus = async (newStatus) => {
    try {
      setIsSubmitting(true);
      setError('');
      setSuccess('');

      let data = { status: newStatus };
      if (newStatus === 'elutasítva' && rejectionReason) {
        data.reason = rejectionReason;
      }

      // Az api objektum használata
      const response = await api.patch(`${API_URL}/api/quotes/${quote._id}/status`, data);
      const responseData = await response.json();
      
      setSuccess(`Az árajánlat állapota sikeresen frissítve: ${newStatus}`);
      if (onStatusUpdate && responseData) {
        onStatusUpdate(responseData);
      }
      
      setIsSubmitting(false);
      setShowRejectForm(false);
    } catch (err) {
      console.error('Hiba a státusz frissítésekor:', err);
      setError(err.message || 'Hiba történt a művelet során');
      setIsSubmitting(false);
    }
  };

  // Árajánlat elfogadása vagy elutasítása (ügyfél funkcionalitás)
  const handleClientAction = async (action) => {
    try {
      setIsSubmitting(true);
      setError('');
      setSuccess('');

      // PIN kód ellenőrzése
      if (!clientPin) {
        setError('A PIN kód megadása kötelező');
        setIsSubmitting(false);
        return;
      }

      let data = { 
        pin: clientPin,
        action
      };

      if (action === 'reject' && rejectionReason) {
        data.reason = rejectionReason;
      }

      if (!quote || !quote.shareToken) {
        throw new Error('Érvénytelen árajánlat azonosító');
      }

      // Itt használjuk az fetch-t közvetlenül, mivel ez egy publikus végpont
      // ami nem igényel autentikációt, csak PIN kódot
      const response = await fetch(`${API_URL}/api/public/quotes/${quote.shareToken}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Hiba a kérés során: ${response.status}`);
      }
      
      const successMessage = action === 'accept' 
        ? 'Az árajánlatot sikeresen elfogadta!' 
        : 'Az árajánlatot sikeresen elutasította.';
      
      setSuccess(successMessage);
      setPinStatus('success');
      
      // Állapot frissítése az UI-n
      if (onStatusUpdate) {
        onStatusUpdate({
          ...quote,
          status: action === 'accept' ? 'elfogadva' : 'elutasítva',
          rejectionReason: action === 'reject' ? rejectionReason : null
        });
      }
      
      setIsSubmitting(false);
      setShowRejectForm(false);
    } catch (err) {
      console.error('Hiba az ügyfél művelet során:', err);
      setError(err.message || 'Hiba történt a művelet során');
      setPinStatus('error');
      setIsSubmitting(false);
    }
  };

  // PIN kód ellenőrzése (ügyfél funkcionalitás)
  const verifyPin = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      
      if (!clientPin) {
        setError('A PIN kód megadása kötelező');
        setIsSubmitting(false);
        return;
      }

      if (!quote || !quote.shareToken) {
        throw new Error('Érvénytelen árajánlat azonosító');
      }

      // Szintén publikus végpont, fetch használata
      const response = await fetch(`${API_URL}/api/public/quotes/${quote.shareToken}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pin: clientPin,
          action: 'verify'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Hiba a kérés során: ${response.status}`);
      }
      
      setPinStatus('success');
      setIsSubmitting(false);
    } catch (err) {
      console.error('Hiba a PIN kód ellenőrzésekor:', err);
      setError(err.message || 'Érvénytelen PIN kód');
      setPinStatus('error');
      setIsSubmitting(false);
    }
  };

  // Árajánlati link másolása a vágólapra
  const copyShareLink = () => {
    if (!quote || !quote.shareToken) {
      setError('Nem található megosztási link');
      return;
    }

    const shareLink = `${window.location.origin}/shared-quote/${quote.shareToken}`;
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        setSuccess('Link másolva a vágólapra!');
        // Időzítő a sikeres üzenet eltávolításához
        setTimeout(() => setSuccess(''), 3000);
      })
      .catch(err => {
        console.error('Hiba a vágólapra másoláskor:', err);
        setError('Nem sikerült másolni a linket');
      });
  };

  // Aktuális dátum ellenőrzése az érvényességhez
  const isExpired = () => {
    if (!quote || !quote.validUntil) return false;
    
    const now = new Date();
    const validUntil = new Date(quote.validUntil);
    return now > validUntil;
  };

  // Ellenőrizzük, hogy érvényes-e a quote objektum
  if (!quote) {
    return (
      <div className="p-6 bg-white rounded-lg">
        <p className="text-center text-gray-500">Az árajánlat nem található vagy betöltés alatt áll.</p>
      </div>
    );
  }

  const currency = project?.financial?.currency || 'EUR';
  const expired = isExpired();
  const quoteStatus = quote.status;
  const canModifyStatus = !isClient && quoteStatus !== 'elfogadva' && quoteStatus !== 'elutasítva' && !expired;
  const canActOnQuote = isClient && quoteStatus !== 'elfogadva' && quoteStatus !== 'elutasítva' && !expired;

  return (
    <div className={`${isClient ? '' : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'}`}>
      <div className={`bg-white rounded-lg ${isClient ? 'w-full' : 'w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto'}`}>
        {!isClient && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              Árajánlat részletei
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Bezárás"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Hibaüzenetek és sikeres műveletek visszajelzése */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
            {success}
          </div>
        )}

        {/* Fejléc */}
        <div className="mb-6 pb-4 border-b">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h3 className="text-xl font-bold">{quote.quoteNumber || 'N/A'}</h3>
                <QuoteStatusBadge status={quoteStatus} />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Létrehozva: {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                Érvényes: {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'N/A'}-ig
                {expired && <span className="text-red-500 ml-2">(Lejárt)</span>}
              </p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold">
                {(quote.totalAmount || 0).toLocaleString()} {currency}
              </p>
              
              {!isClient && quoteStatus === 'elküldve' && (
                <div className="mt-2 text-sm">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={copyShareLink}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center"
                      aria-label="Megosztási link másolása"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Megosztási link
                    </button>
                    <span className="text-gray-600">•</span>
                    <span className="font-medium">PIN: {quote.sharePin || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ügyfél PIN ellenőrzés (csak ügyfél nézet) */}
        {canActOnQuote && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">PIN kód ellenőrzése</h4>
            <p className="text-sm text-gray-600 mb-3">
              Az árajánlat elfogadásához vagy elutasításához adja meg a PIN kódot, amit emailben kapott.
            </p>
            <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={clientPin}
                  onChange={(e) => setClientPin(e.target.value)}
                  placeholder="PIN kód"
                  className={`flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                    pinStatus === 'error' ? 'border-red-500' : 
                    pinStatus === 'success' ? 'border-green-500' : ''
                  }`}
                  maxLength="6"
                  disabled={isSubmitting || pinStatus === 'success'}
                />
                <button
                  onClick={verifyPin}
                  disabled={isSubmitting || !clientPin || pinStatus === 'success'}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  Ellenőrzés
                </button>
              </div>
              
              {pinStatus === 'success' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleClientAction('accept')}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Árajánlat elfogadása
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={isSubmitting || showRejectForm}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Árajánlat elutasítása
                  </button>
                </div>
              )}
              
              {showRejectForm && pinStatus === 'success' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Elutasítás indoklása
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={3}
                    required
                  ></textarea>
                  <div className="mt-2 flex justify-end space-x-2">
                    <button
                      onClick={() => setShowRejectForm(false)}
                      disabled={isSubmitting}
                      className="px-3 py-1 text-gray-600 hover:text-gray-800"
                    >
                      Mégse
                    </button>
                    <button
                      onClick={() => handleClientAction('reject')}
                      disabled={isSubmitting || !rejectionReason.trim()}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Elutasítás küldése
                    </button>
                  </div>
                </div>
              )}
            </div>
        )}

        {/* Admin műveletek (csak admin nézet) */}
        {canModifyStatus && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Árajánlat kezelése</h4>
            <div className="flex flex-wrap gap-2">
              {quoteStatus === 'piszkozat' && (
                <button
                  onClick={() => updateStatus('elküldve')}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  Árajánlat elküldése
                </button>
              )}
              
              <button
                onClick={() => updateStatus('elfogadva')}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Árajánlat elfogadása
              </button>
              
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={isSubmitting || showRejectForm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center disabled:opacity-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Árajánlat elutasítása
              </button>
            </div>
            
            {showRejectForm && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Elutasítás indoklása
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  rows={3}
                  required
                ></textarea>
                <div className="mt-2 flex justify-end space-x-2">
                  <button
                    onClick={() => setShowRejectForm(false)}
                    disabled={isSubmitting}
                    className="px-3 py-1 text-gray-600 hover:text-gray-800"
                  >
                    Mégse
                  </button>
                  <button
                    onClick={() => updateStatus('elutasítva')}
                    disabled={isSubmitting || !rejectionReason.trim()}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Elutasítás küldése
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ügyfél adatok */}
        <div className="mb-6">
          <h4 className="font-medium mb-2">Ügyfél</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm"><span className="font-medium">Név:</span> {quote.client?.name || 'N/A'}</p>
              <p className="text-sm"><span className="font-medium">Email:</span> {quote.client?.email || 'N/A'}</p>
              <p className="text-sm"><span className="font-medium">Telefon:</span> {quote.client?.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm"><span className="font-medium">Cég:</span> {quote.client?.companyName || 'N/A'}</p>
              <p className="text-sm"><span className="font-medium">Adószám:</span> {quote.client?.taxNumber || 'N/A'}</p>
              <p className="text-sm">
                <span className="font-medium">Cím:</span> 
                {quote.client?.address?.street 
                  ? ` ${quote.client.address.street}, ${quote.client.address.city || ''} ${quote.client.address.postalCode || ''}, ${quote.client.address.country || ''}` 
                  : ' N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Árajánlat tételei */}
        <div className="mb-6">
          <h4 className="font-medium mb-2">Tételek</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leírás
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mennyiség
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Egységár
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kedvezmény
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Összeg
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(quote.items) && quote.items.length > 0 ? (
                  quote.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.description || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {item.quantity || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {(item.unitPrice || 0).toLocaleString()} {currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {(item.discount || 0) > 0 ? `${item.discount}%` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {(item.total || 0).toLocaleString()} {currency}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                      Nincsenek tételek
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="4" className="px-6 py-3 text-right text-sm font-medium">
                    Részösszeg:
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium">
                    {(quote.subtotal || 0).toLocaleString()} {currency}
                  </td>
                </tr>
                <tr>
                  <td colSpan="4" className="px-6 py-3 text-right text-sm font-medium">
                    ÁFA ({quote.vat || 0}%):
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium">
                    {(((quote.subtotal || 0) * (quote.vat || 0)) / 100).toLocaleString()} {currency}
                  </td>
                </tr>
                <tr>
                  <td colSpan="4" className="px-6 py-3 text-right text-sm font-medium">
                    Végösszeg:
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold">
                    {(quote.totalAmount || 0).toLocaleString()} {currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Fizetési feltételek és megjegyzések */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-medium mb-2">Fizetési feltételek</h4>
            <p className="text-sm bg-gray-50 p-3 rounded">
              {quote.paymentTerms || 'Nem megadott'}
            </p>
          </div>
          {quote.notes && (
            <div>
              <h4 className="font-medium mb-2">Megjegyzések</h4>
              <p className="text-sm bg-gray-50 p-3 rounded">
                {quote.notes}
              </p>
            </div>
          )}
        </div>

        {/* Elutasítási indok (ha elutasított) */}
        {quoteStatus === 'elutasítva' && quote.rejectionReason && (
          <div className="mb-6">
            <h4 className="font-medium mb-2">Elutasítás indoka</h4>
            <p className="text-sm bg-red-50 p-3 rounded text-red-800">
              {quote.rejectionReason}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Elutasítva: {quote.rejectedAt ? new Date(quote.rejectedAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        )}

        {/* Letöltés/Nyomtatás gomb */}
        <div className="flex justify-end">
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Nyomtatás / Letöltés PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetailsView;