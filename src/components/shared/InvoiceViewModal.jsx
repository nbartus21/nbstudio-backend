import React from 'react';
import { FileText, X, Download } from 'lucide-react';
import { formatShortDate, debugLog } from './utils';

const InvoiceViewModal = ({ invoice, project, onClose }) => {
  debugLog('InvoiceViewModal', 'Rendering invoice view', { 
    invoiceNumber: invoice?.number, 
    invoiceStatus: invoice?.status 
  });

  if (!invoice || !project) {
    debugLog('InvoiceViewModal', 'No invoice or project provided');
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-500" />
            Számla: {invoice.number}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-auto">
          <div className="w-full max-w-2xl mx-auto bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold">SZÁMLA</h2>
                <p className="text-gray-600">Számlaszám: {invoice.number}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">Kelt: {formatShortDate(invoice.date)}</p>
                <p className="text-gray-600">Fizetési határidő: {formatShortDate(invoice.dueDate)}</p>
              </div>
            </div>
            
            {/* Company Information */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-bold mb-2 text-gray-700">Szolgáltató:</h3>
                <p className="font-medium">Norbert Bartus</p>
                <p>NB Studio</p>
                <p>Adószám: 12345678-1-42</p>
                <p>1234 Budapest, Példa utca 1.</p>
                <p>Email: info@nb-studio.net</p>
              </div>
              <div>
                <h3 className="font-bold mb-2 text-gray-700">Vevő:</h3>
                <p className="font-medium">{project.client?.name || 'N/A'}</p>
                {project.client?.companyName && <p>{project.client.companyName}</p>}
                {project.client?.taxNumber && <p>Adószám: {project.client.taxNumber}</p>}
                <p>Email: {project.client?.email || 'N/A'}</p>
                {project.client?.address && (
                  <p>
                    {project.client.address.postalCode} {project.client.address.city}, {project.client.address.street}
                  </p>
                )}
              </div>
            </div>
            
            {/* Items Table */}
            <div className="mb-8">
              <h3 className="font-bold mb-2 text-gray-700">Tételek:</h3>
              <table className="min-w-full border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-2 px-3 text-left border-b border-gray-200 text-gray-700">Leírás</th>
                    <th className="py-2 px-3 text-right border-b border-gray-200 text-gray-700">Mennyiség</th>
                    <th className="py-2 px-3 text-right border-b border-gray-200 text-gray-700">Egységár</th>
                    <th className="py-2 px-3 text-right border-b border-gray-200 text-gray-700">Összesen</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-2 px-3">{item.description}</td>
                      <td className="py-2 px-3 text-right">{item.quantity}</td>
                      <td className="py-2 px-3 text-right">{item.unitPrice} €</td>
                      <td className="py-2 px-3 text-right">{item.total} €</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan="3" className="py-2 px-3 text-right">Végösszeg:</td>
                    <td className="py-2 px-3 text-right">{invoice.totalAmount} €</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* Payment Information */}
            <div className="mb-8">
              <h3 className="font-bold mb-2 text-gray-700">Fizetési információk:</h3>
              <div className="bg-gray-50 p-3 border border-gray-200 rounded">
                <p>IBAN: DE47 6634 0014 0743 4638 00</p>
                <p>SWIFT/BIC: COBADEFFXXX</p>
                <p>Bank: Commerzbank AG</p>
                <p>Közlemény: {invoice.number}</p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="text-center text-gray-600 text-sm mt-12">
              <p>Köszönjük, hogy minket választott!</p>
              <p className="mt-1">Ez a számla elektronikusan készült és érvényes aláírás nélkül is.</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end items-center p-4 border-t bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={() => {
                debugLog('InvoiceViewModal-downloadPDF', 'PDF download clicked');
                window.alert('A PDF letöltés funkció fejlesztés alatt áll.');
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center text-sm"
            >
              <Download className="h-4 w-4 mr-1" />
              Letöltés PDF-ként
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm"
            >
              Bezárás
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewModal;