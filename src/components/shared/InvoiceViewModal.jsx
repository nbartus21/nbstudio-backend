import React, { useState, useEffect } from 'react';
import { 
  FileText, X, Download, Printer, Share2, 
  CheckCircle, AlertCircle, Clock, Mail,
  CreditCard, RefreshCw
} from 'lucide-react';
import { formatShortDate, debugLog } from './utils';
import QRCode from 'qrcode.react';
import { downloadInvoicePDF } from '../../services/invoiceService';

const InvoiceViewModal = ({ invoice, project, onClose, onUpdateStatus, onGeneratePDF }) => {
  debugLog('InvoiceViewModal', 'Rendering invoice view', { 
    invoiceNumber: invoice?.number, 
    invoiceStatus: invoice?.status 
  });

  const [showQRCode, setShowQRCode] = useState(false);
  const [stripePaymentUrl, setStripePaymentUrl] = useState(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  
  if (!invoice) {
    debugLog('InvoiceViewModal', 'No invoice provided');
    return null;
  }
  
  // Check for success or canceled payment in URL params when component mounts
  useEffect(() => {
    console.log('🔄 [InvoiceViewModal] useEffect elindult - URL paraméterek ellenőrzése');
    
    const url = new URL(window.location.href);
    const success = url.searchParams.get('success');
    const canceled = url.searchParams.get('canceled');
    const invoiceId = url.searchParams.get('invoice');
    
    console.log('🔄 [InvoiceViewModal] URL paraméterek:', {
      url: window.location.href,
      success,
      canceled,
      invoiceId,
      currentInvoiceId: invoice._id
    });
    
    if (success === 'true' && invoiceId === invoice._id) {
      console.log('✅ [InvoiceViewModal] Sikeres fizetés detektálva', {
        invoiceId,
        timestamp: new Date().toISOString()
      });
      
      debugLog('InvoiceViewModal', 'Payment was successful', { invoiceId });
      
      // Update invoice status locally or refresh data
      if (onUpdateStatus) {
        console.log('🔄 [InvoiceViewModal] onUpdateStatus hívása fizetett státusszal');
        onUpdateStatus(invoice._id, 'fizetett');
        
        // Also update directly on server to ensure database update
        try {
          console.log('🌐 [InvoiceViewModal] Közvetlen szerver frissítés előkészítése');
          
          const projectId = project._id || project.id;
          const API_URL = 'https://admin.nb-studio.net:5001';
          const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';
          
          console.log('🌐 [InvoiceViewModal] API kérés adatok:', {
            method: 'PUT',
            url: `${API_URL}/api/projects/${projectId}/invoices/${invoiceId}`,
            projectId,
            invoiceId,
            body: {
              status: 'fizetett',
              paidDate: new Date().toISOString(),
              paidAmount: invoice.totalAmount
            }
          });
          
          // Asyncronously update on server but don't await
          fetch(`${API_URL}/api/projects/${projectId}/invoices/${invoiceId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': API_KEY,
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              status: 'fizetett',
              paidDate: new Date().toISOString(),
              paidAmount: invoice.totalAmount
            })
          })
            .then(response => {
              console.log('🌐 [InvoiceViewModal] API válasz beérkezett:', {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText
              });
              
              if (response.ok) {
                debugLog('InvoiceViewModal', 'Successfully updated invoice status on server');
                console.log('✅ [InvoiceViewModal] Számla státusz sikeresen frissítve a szerveren');
                
                // Megpróbáljuk a response body-t is kiolvasni
                return response.json().then(data => {
                  console.log('🌐 [InvoiceViewModal] API válasz adatok:', data);
                }).catch(e => {
                  console.log('⚠️ [InvoiceViewModal] Válasz body olvasási hiba (nem kritikus):', e.message);
                });
              } else {
                console.error('❌ [InvoiceViewModal] Hiba a számla státusz szerver frissítésekor:', {
                  status: response.status,
                  statusText: response.statusText
                });
                
                // Próbáljuk meg kiolvasni a hiba részleteket
                return response.text().then(text => {
                  try {
                    const errorJson = JSON.parse(text);
                    console.error('❌ [InvoiceViewModal] API hibaüzenet:', errorJson);
                  } catch (e) {
                    console.error('❌ [InvoiceViewModal] API hibaüzenet (szöveg):', text);
                  }
                }).catch(e => {
                  console.error('❌ [InvoiceViewModal] Nem sikerült a hibaüzenet olvasása:', e.message);
                });
              }
            })
            .catch(error => {
              console.error('❌ [InvoiceViewModal] API hívási kivétel:', {
                message: error.message,
                stack: error.stack
              });
            });
        } catch (error) {
          console.error('❌ [InvoiceViewModal] Kivétel a szerver frissítés előkészítése során:', {
            message: error.message,
            stack: error.stack
          });
        }
      } else {
        console.warn('⚠️ [InvoiceViewModal] onUpdateStatus függvény nincs megadva, a számla helyi frissítése nem történt meg');
      }
    } else if (canceled === 'true' && invoiceId === invoice._id) {
      console.log('❌ [InvoiceViewModal] Megszakított fizetés detektálva', {
        invoiceId,
        timestamp: new Date().toISOString()
      });
      
      debugLog('InvoiceViewModal', 'Payment was canceled', { invoiceId });
      setPaymentError('A fizetés meg lett szakítva vagy elutasításra került.');
    }
    
    // Clean up URL params
    if (success || canceled) {
      const cleanUrl = window.location.pathname;
      console.log('🔄 [InvoiceViewModal] URL paraméterek eltávolítása', {
        from: window.location.href,
        to: cleanUrl
      });
      
      window.history.replaceState({}, document.title, cleanUrl);
    }
    
    console.log('🔄 [InvoiceViewModal] useEffect függvény befejezve');
  }, [invoice._id]);

  const currency = invoice?.currency || project?.financial?.currency || 'EUR';

  // Státusz badge színek
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'fizetett':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'kiállított':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'késedelmes':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'törölt':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // SEPA QR kód adat generálás
  const generateSepaQrData = () => {
    const amount = typeof invoice.totalAmount === 'number' 
      ? invoice.totalAmount.toFixed(2) 
      : '0.00';

    return [
      'BCD',                                    // Service Tag
      '002',                                    // Version
      '1',                                      // Encoding
      'SCT',                                    // SEPA Credit Transfer
      'COBADEFF371',                           // BIC
      'Norbert Bartus',                        // Beneficiary name
      'DE47663400180473463800',               // IBAN
      `EUR${amount}`,                          // Amount in EUR
      '',                                      // Customer ID (empty)
      invoice.number || '',                    // Invoice number
      `RECHNUNG ${invoice.number}`             // Reference
    ].join('\n');
  };

  // Számla állapotának ellenőrzése a színezéshez
  const checkInvoiceStatus = () => {
    if (invoice.status === 'fizetett') {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-600 mr-2" />,
        text: 'Fizetve',
        description: invoice.paidDate ? `Fizetve: ${formatShortDate(invoice.paidDate)}` : 'A számla ki van fizetve',
        color: 'bg-green-50 border-green-200'
      };
    }
    
    if (invoice.status === 'törölt') {
      return {
        icon: <X className="h-5 w-5 text-gray-600 mr-2" />,
        text: 'Törölt',
        description: 'Ez a számla érvénytelenítve lett',
        color: 'bg-gray-50 border-gray-200'
      };
    }

    const now = new Date();
    const dueDate = new Date(invoice.dueDate);
    
    if (dueDate < now) {
      return {
        icon: <AlertCircle className="h-5 w-5 text-red-600 mr-2" />,
        text: 'Lejárt',
        description: `Fizetési határidő lejárt: ${formatShortDate(invoice.dueDate)}`,
        color: 'bg-red-50 border-red-200'
      };
    }
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    
    if (dueDate <= threeDaysFromNow) {
      return {
        icon: <Clock className="h-5 w-5 text-yellow-600 mr-2" />,
        text: 'Hamarosan esedékes',
        description: `Fizetési határidő: ${formatShortDate(invoice.dueDate)}`,
        color: 'bg-yellow-50 border-yellow-200'
      };
    }
    
    return {
      icon: <FileText className="h-5 w-5 text-blue-600 mr-2" />,
      text: 'Kiállítva',
      description: `Fizetési határidő: ${formatShortDate(invoice.dueDate)}`,
      color: 'bg-blue-50 border-blue-200'
    };
  };

  const invoiceStatus = checkInvoiceStatus();

  // Emlékeztető küldése - a backend később implementálhatja
  const handleSendReminder = () => {
    debugLog('InvoiceViewModal-sendReminder', 'Sending reminder for invoice', invoice.number);
    alert('Emlékeztető küldése funkcionalitás hamarosan elérhető lesz!');
  };
  
  // Bankkártyás fizetés Stripe-pal
  const handleCardPayment = async () => {
    console.log('💳 [InvoiceViewModal] Bankkártyás fizetés indítása', {
      invoiceId: invoice._id || invoice.id,
      invoiceNumber: invoice.number,
      timestamp: new Date().toISOString()
    });
    
    debugLog('InvoiceViewModal-cardPayment', 'Creating Stripe payment link', { invoiceId: invoice._id });
    setIsLoadingPayment(true);
    setPaymentError(null);
    
    try {
      // Get project sharing info from localStorage to retrieve PIN
      console.log('🔍 [InvoiceViewModal] localStorage projekt session keresése', {
        key: `project_session_${project.sharing?.token}`,
        sharingToken: project.sharing?.token
      });
      
      const savedSession = localStorage.getItem(`project_session_${project.sharing?.token}`);
      const sessionData = savedSession ? JSON.parse(savedSession) : {};
      const pin = sessionData.pin || '';
      
      console.log('🔍 [InvoiceViewModal] Projekt session adatok:', {
        hasSession: !!savedSession,
        hasPin: !!sessionData.pin,
        pinLength: pin.length,
        sessionData: { ...sessionData, pin: pin ? '***' : '' }
      });
      
      // Create payment link through API - log additional debug information
      const API_URL = 'https://admin.nb-studio.net:5001';
      const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';
      
      // Ellenőrizzük és normalizáljuk az invoice adatait
      const invoiceId = invoice._id?.toString() || invoice.id?.toString();
      const projectId = project._id?.toString() || project.id?.toString();
      
      console.log('🌐 [InvoiceViewModal] Fizetési kérés előkészítése', {
        url: `${API_URL}/api/payments/create-payment-link`,
        invoiceId,
        projectId,
        hasPin: !!pin
      });
      
      console.log('Sending payment request to API');
      console.log('Final API URL:', `${API_URL}/api/payments/create-payment-link`);
      console.log('Invoice ID:', invoiceId, 'Type:', typeof invoiceId);
      console.log('Project ID:', projectId, 'Type:', typeof projectId);
      
      if (!invoiceId || !projectId) {
        const error = new Error('Hiányzó számla vagy projekt azonosító');
        console.error('❌ [InvoiceViewModal] Hiányzó azonosítók:', {
          invoiceId,
          projectId,
          invoice: {
            _id: invoice._id,
            id: invoice.id,
            number: invoice.number
          },
          project: {
            _id: project._id,
            id: project.id,
            name: project.name
          }
        });
        throw error;
      }
      
      // Részletes adatok kiírása a konzolra
      console.log('📋 [InvoiceViewModal] Számla részletek:', {
        _id: invoice._id,
        id: invoice.id,
        number: invoice.number,
        date: invoice.date,
        dueDate: invoice.dueDate,
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency || project?.financial?.currency || 'EUR'
      });
      
      console.log('🌐 [InvoiceViewModal] API kérés küldése...');
      const response = await fetch(`${API_URL}/api/payments/create-payment-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          invoiceId: invoiceId,
          projectId: projectId,
          pin: pin
        }),
        credentials: 'include'
      });
      
      // Részletes válasz feldolgozás
      console.log('🌐 [InvoiceViewModal] API válasz státusz:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      console.log('🌐 [InvoiceViewModal] API válasz fejlécek:', {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        allHeaders: [...response.headers.entries()].reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {})
      });
      
      try {
        const data = await response.json();
        console.log('🌐 [InvoiceViewModal] API válasz adatok:', data);
        
        if (response.ok && data.success) {
          console.log('✅ [InvoiceViewModal] Sikeres fizetési link létrehozás:', {
            url: data.url,
            sessionId: data.sessionId
          });
          
          setStripePaymentUrl(data.url);
          debugLog('InvoiceViewModal-cardPayment', 'Payment link created', { 
            url: data.url,
            sessionId: data.sessionId 
          });
          
          // Sikeres fizetési link - mentjük localStorage-ba is a későbbi ellenőrzéshez
          try {
            console.log('💾 [InvoiceViewModal] Stripe session mentése localStorage-ba');
            localStorage.setItem('stripe_session_' + invoiceId, JSON.stringify({
              sessionId: data.sessionId,
              url: data.url,
              timestamp: new Date().toISOString(),
              invoiceId: invoiceId
            }));
            console.log('✅ [InvoiceViewModal] Stripe session sikeresen mentve localStorage-ba');
          } catch (storageError) {
            console.warn('⚠️ [InvoiceViewModal] Nem sikerült a Stripe session mentése localStorage-ba:', storageError);
          }
          
          // Átirányítás a Stripe oldalára némi késleltetéssel, hogy a hibaüzenetek el tudjanak tűnni
          console.log('🔄 [InvoiceViewModal] Átirányítás a Stripe fizetési oldalra 500ms késleltetéssel:', data.url);
          setTimeout(() => {
            console.log('🔄 [InvoiceViewModal] Átirányítás végrehajtása a Stripe oldalra');
            window.location.href = data.url;
          }, 500);
        } else {
          // Részletes hibaüzenet megjelenítése
          console.error('❌ [InvoiceViewModal] Hiba a fizetési link létrehozásakor:', data);
          
          setPaymentError(
            data.message || 
            (data.error ? `Hiba: ${data.error}` : 'Hiba történt a fizetési link létrehozásakor')
          );
          debugLog('InvoiceViewModal-cardPayment', 'Error creating payment link', { 
            error: data.message,
            details: data
          });
        }
      } catch (jsonError) {
        console.error('❌ [InvoiceViewModal] Nem sikerült a válasz JSON-ként értelmezése:', jsonError);
        console.error('❌ [InvoiceViewModal] Nyers válasz szöveg kérése...');
        
        try {
          const rawText = await response.text();
          console.error('❌ [InvoiceViewModal] Nyers válasz szöveg:', rawText);
        } catch (textError) {
          console.error('❌ [InvoiceViewModal] Nem sikerült a nyers válasz szöveg olvasása:', textError);
        }
        
        setPaymentError(`Hiba: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ [InvoiceViewModal] Stripe fizetési kivétel:', error);
      console.error('❌ [InvoiceViewModal] Hiba részletek:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      setPaymentError(`Kapcsolati hiba: ${error.message}`);
      debugLog('InvoiceViewModal-cardPayment', 'Exception during payment link creation', { 
        error: error.message,
        stack: error.stack
      });
    } finally {
      console.log('🔄 [InvoiceViewModal] Bankkártyás fizetési folyamat befejezve');
      setIsLoadingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-50"></div>
      <div className="bg-white p-8 rounded-lg shadow-lg z-10 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Számla részletei</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Számlaszám</p>
              <p className="text-lg font-semibold">{invoice.number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Kiállítás dátuma</p>
              <p className="text-lg font-semibold">{formatShortDate(invoice.date)}</p>
            </div>
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Esedékesség</p>
              <p className="text-lg font-semibold">{formatShortDate(invoice.dueDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Teljes összeg</p>
              <p className="text-lg font-semibold">{invoice.totalAmount} {currency}</p>
            </div>
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Státusz</p>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(invoice.status)}`}>
                {invoiceStatus.icon}
                {invoiceStatus.text}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fizetési mód</p>
              <p className="text-lg font-semibold">{invoice.paymentMethod || 'Nincs megadva'}</p>
            </div>
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Kiállító</p>
              <p className="text-lg font-semibold">{invoice.issuer || 'Nincs megadva'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Vevő</p>
              <p className="text-lg font-semibold">{invoice.recipient || 'Nincs megadva'}</p>
            </div>
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Megjegyzés</p>
              <p className="text-lg font-semibold">{invoice.note || 'Nincs megadva'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Projekt</p>
              <p className="text-lg font-semibold">{project.name || 'Nincs megadva'}</p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-between">
          <button
            onClick={handleSendReminder}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded flex items-center"
          >
            <Mail className="h-5 w-5 mr-2" />
            Emlékeztető küldése
          </button>
          <button
            onClick={handleCardPayment}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded flex items-center"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Bankkártyás fizetés
          </button>
        </div>
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setShowQRCode(!showQRCode)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded flex items-center"
          >
            <QRCode className="h-5 w-5 mr-2" />
            {showQRCode ? 'QR kód elrejtése' : 'QR kód megjelenítése'}
          </button>
          <button
            onClick={() => onGeneratePDF(invoice, project)}
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded flex items-center"
          >
            <Download className="h-5 w-5 mr-2" />
            PDF letöltése
          </button>
        </div>
        {showQRCode && (
          <div className="mt-6">
            <QRCode value={generateSepaQrData()} size={256} />
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceViewModal;
