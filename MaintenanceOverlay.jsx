import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntl } from 'react-intl';
import { MAINTENANCE_MODE } from './maintenanceConfig';

const MaintenanceOverlay = () => {
  const intl = useIntl();

  // Ha nincs karbantartás, nem jelenítünk meg semmit
  if (!MAINTENANCE_MODE) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        <div className="bg-gradient-to-r from-amber-500 to-red-500 text-white p-4 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="flex items-center gap-4">
              <span className="text-2xl">🚧</span>
              <div>
                <h3 className="font-bold text-lg">
                  {intl.formatMessage({ id: 'maintenance.title' })}
                </h3>
                <p className="text-sm opacity-90">
                  {intl.formatMessage({ id: 'maintenance.description' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MaintenanceOverlay;