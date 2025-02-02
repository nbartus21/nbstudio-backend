import React, { useState } from 'react';
import { FileText, Upload, X, Check } from 'lucide-react';

const TransactionDetailModal = ({ isOpen, onClose, transaction, onSave }) => {
  const [paymentDetails, setPaymentDetails] = useState({
    paymentDate: '',
    paymentMethod: 'bank_transfer',
    attachmentDescription: '',
    notes: '',
    files: []
  });

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setPaymentDetails(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles]
    }));
  };

  const removeFile = (indexToRemove) => {
    setPaymentDetails(prev => ({
      ...prev,
      files: prev.files.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('paymentDate', paymentDetails.paymentDate);
    formData.append('paymentMethod', paymentDetails.paymentMethod);
    formData.append('notes', paymentDetails.notes);
    formData.append('attachmentDescription', paymentDetails.attachmentDescription);
    paymentDetails.files.forEach(file => {
      formData.append('files', file);
    });

    await onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Tranzakció részletek</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fizetés dátuma */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fizetés dátuma
            </label>
            <input
              type="date"
              value={paymentDetails.paymentDate}
              onChange={(e) => setPaymentDetails(prev => ({ ...prev, paymentDate: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Fizetési mód */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fizetési mód
            </label>
            <select
              value={paymentDetails.paymentMethod}
              onChange={(e) => setPaymentDetails(prev => ({ ...prev, paymentMethod: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="bank_transfer">Banki átutalás</option>
              <option value="cash">Készpénz</option>
              <option value="credit_card">Bankkártya</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>

          {/* Jegyzetek */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jegyzetek
            </label>
            <textarea
              value={paymentDetails.notes}
              onChange={(e) => setPaymentDetails(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="További információk a tranzakcióról..."
            />
          </div>

          {/* Fájl feltöltés */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dokumentumok csatolása
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                    <span>Fájl feltöltése</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">vagy húzza ide</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, PDF, DOC tot 10MB
                </p>
              </div>
            </div>
          </div>

          {/* Feltöltött fájlok listája */}
          {paymentDetails.files.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Feltöltött fájlok:</h4>
              <ul className="space-y-2">
                {paymentDetails.files.map((file, index) => (
                  <li key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Csatolmány leírása */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Csatolmány leírása
            </label>
            <textarea
              value={paymentDetails.attachmentDescription}
              onChange={(e) => setPaymentDetails(prev => ({ ...prev, attachmentDescription: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="A csatolt dokumentumok rövid leírása..."
            />
          </div>

          {/* Műveleti gombok */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Mégsem
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 flex items-center"
            >
              <Check className="h-4 w-4 mr-2" />
              Mentés
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionDetailModal;