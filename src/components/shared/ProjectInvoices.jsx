import React from 'react';
import { Eye, Download, FileText } from 'lucide-react';
import { formatShortDate, generateSepaQrData, debugLog } from './utils';
import QRCode from 'qrcode.react';

const ProjectInvoices = ({ project, onViewInvoice }) => {
  debugLog('ProjectInvoices', 'Rendering invoices view', {
    projectId: project?._id,
    invoicesCount: project?.invoices?.length || 0
  });

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium">Számlák</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {project.invoices?.length > 0 ? (
          project.invoices.map((invoice) => (
            <div key={invoice._id || invoice.number} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium">{invoice.number}</h3>
                  <p className="text-sm text-gray-500">
                    Kiállítva: {formatShortDate(invoice.date)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Fizetési határidő: {formatShortDate(invoice.dueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{invoice.totalAmount} €</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    invoice.status === 'fizetett' 
                      ? 'bg-green-100 text-green-800'
                      : invoice.status === 'késedelmes' 
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>

              {/* Actions Buttons */}
              <div className="flex justify-end space-x-3 my-3">
                <button
                  onClick={() => {
                    debugLog('ProjectInvoices-viewInvoice', 'Viewing invoice', { invoiceNumber: invoice.number });
                    onViewInvoice(invoice);
                  }}
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Számla megtekintése
                </button>
                <button
                  onClick={() => {
                    debugLog('ProjectInvoices-downloadPDF', 'PDF download clicked');
                    window.alert('A letöltés funkció fejlesztés alatt áll.');
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF letöltése
                </button>
              </div>

              {/* SEPA QR code and payment details */}
              {invoice.status !== 'fizetett' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Banki átutalás</h4>
                      <p className="text-sm">IBAN: DE47 6634 0014 0743 4638 00</p>
                      <p className="text-sm">SWIFT/BIC: COBADEFFXXX</p>
                      <p className="text-sm">Bank: Commerzbank AG</p>
                      <p className="text-sm mt-2">Közlemény: {invoice.number}</p>
                    </div>
                    <div className="flex justify-center">
                      <div>
                        <QRCode 
                          value={generateSepaQrData(invoice)}
                          size={150}
                          level="M"
                        />
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Szkennelje be a QR kódot a banki alkalmazással
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice Items */}
              <div className="mt-4">
                <h4 className="font-medium mb-2">Tételek</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leírás</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mennyiség</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Egységár</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Összesen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {invoice.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm whitespace-nowrap">{item.description}</td>
                          <td className="px-3 py-2 text-sm text-right whitespace-nowrap">{item.quantity}</td>
                          <td className="px-3 py-2 text-sm text-right whitespace-nowrap">{item.unitPrice} €</td>
                          <td className="px-3 py-2 text-sm text-right whitespace-nowrap font-medium">{item.total} €</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td colSpan="3" className="px-3 py-2 text-right font-medium">Összesen:</td>
                        <td className="px-3 py-2 text-right font-bold">{invoice.totalAmount} €</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium text-gray-600">Nincsenek még számlák a projekthez</p>
            <p className="text-sm mt-1">A számlákat a projekthez kapcsolódóan a rendszergazda állítja ki.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectInvoices;