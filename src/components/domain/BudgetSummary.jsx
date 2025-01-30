import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const BudgetSummary = ({ domains }) => {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  // Éves összes költség
  const yearlyTotal = domains.reduce((sum, domain) => sum + (domain.cost || 0), 0);

  // Következő évi lejáratok és költségek
  const nextYearDomains = domains.filter(domain => 
    new Date(domain.expiryDate).getFullYear() === nextYear
  );
  const nextYearTotal = nextYearDomains.reduce((sum, domain) => 
    sum + (domain.cost || 0), 0
  );

  // Havi átlagos költség
  const monthlyAverage = yearlyTotal / 12;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Költségvetési Összesítő</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">Éves Összes Költség</p>
            <p className="text-2xl font-bold">{yearlyTotal.toLocaleString()} Ft</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Havi Átlagos Költség</p>
            <p className="text-2xl font-bold">{monthlyAverage.toLocaleString()} Ft</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Következő Évi Várható Költség</p>
            <p className="text-2xl font-bold">{nextYearTotal.toLocaleString()} Ft</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-medium mb-3">Következő Évi Megújítások</h3>
          <div className="space-y-2">
            {nextYearDomains.map(domain => (
              <div key={domain._id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{domain.name}</p>
                  <p className="text-sm text-gray-500">
                    Lejárat: {new Date(domain.expiryDate).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-medium">{domain.cost.toLocaleString()} Ft</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetSummary;