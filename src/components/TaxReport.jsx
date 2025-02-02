import React from 'react';
import { Download, FileText, Calculator } from 'lucide-react';

const TaxReport = ({ taxData, onExport, selectedYear }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Adókategóriák magyarítása
  const taxCategories = {
    infrastructure: 'Infrastruktúra',
    software: 'Szoftver',
    education: 'Oktatás',
    office: 'Iroda',
    travel: 'Utazás',
    service_income: 'Szolgáltatási bevétel',
    other: 'Egyéb'
  };

  return (
    <div className="space-y-6">
      {/* Fejléc */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{selectedYear}. évi Adójelentés</h2>
        <button
          onClick={onExport}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          <span>Exportálás</span>
        </button>
      </div>

      {/* Összesítő kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Adóköteles bevétel</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(taxData.summary?.totalTaxableIncome || 0)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Leírható költségek</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(taxData.summary?.totalDeductibles || 0)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Adóalap</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  (taxData.summary?.totalTaxableIncome || 0) - 
                  (taxData.summary?.totalDeductibles || 0)
                )}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Calculator className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Részletes bontás */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bevételek kategóriánként */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium">Bevételek kategóriánként</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {taxData.taxableIncomes?.map((income, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{taxCategories[income._id] || income._id}</p>
                    <p className="text-sm text-gray-500">{income.items?.length || 0} tétel</p>
                  </div>
                  <p className="text-green-600 font-medium">{formatCurrency(income.total)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leírható költségek kategóriánként */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium">Leírható költségek kategóriánként</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {taxData.taxDeductibles?.map((deductible, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{taxCategories[deductible._id] || deductible._id}</p>
                    <p className="text-sm text-gray-500">{deductible.items?.length || 0} tétel</p>
                  </div>
                  <p className="text-blue-600 font-medium">{formatCurrency(deductible.total)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Figyelmeztetések és tippek */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h4 className="font-medium text-yellow-800 mb-2">Figyelmeztetések és tippek</h4>
        <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
          <li>Ez csak egy előzetes kalkuláció, kérjük egyeztess könyvelővel!</li>
          <li>Ellenőrizd, hogy minden leírható költség megfelelően van-e kategorizálva.</li>
          <li>Győződj meg róla, hogy minden szükséges számla és bizonylat rendelkezésre áll.</li>
          <li>Az adóbevallás leadási határideje {selectedYear + 1}.05.20.</li>
        </ul>
      </div>

      {/* Extra dokumentumok és megjegyzések */}
      {taxData.notes && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Megjegyzések</h3>
          <div className="prose max-w-none">
            {taxData.notes}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxReport;