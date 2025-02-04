import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

const NotificationsManager = () => {
  const [notifications, setNotifications] = useState({
    contacts: 0,
    calculator: 0,
    domains: 0,
    servers: 0,
    licenses: 0,
    projects: 0,
    invoices: 0,
    accounting: 0
  });

  const [showDropdown, setShowDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      // Fetch new contacts
      const contactsResponse = await fetch('http://38.242.208.190:5001/api/contacts');
      const contactsData = await contactsResponse.json();
      const newContacts = contactsData.filter(contact => contact.status === 'new').length;

      // Fetch new calculator entries
      const calculatorsResponse = await fetch('http://38.242.208.190:5001/api/calculators');
      const calculatorsData = await calculatorsResponse.json();
      const newCalculators = calculatorsData.filter(calc => calc.status === 'new').length;

      // Fetch expiring domains
      const domainsResponse = await fetch('http://38.242.208.190:5001/api/domains');
      const domainsData = await domainsResponse.json();
      const expiringDomains = domainsData.filter(domain => {
        const daysUntilExpiry = Math.ceil(
          (new Date(domain.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      }).length;

      // Fetch server issues
      const serversResponse = await fetch('http://38.242.208.190:5001/api/servers');
      const serversData = await serversResponse.json();
      const serverIssues = serversData.filter(server => 
        server.status === 'maintenance' || 
        server.status === 'offline' ||
        (server.monitoring?.alerts || []).some(alert => !alert.resolved)
      ).length;

      // Fetch expiring licenses
      const licensesResponse = await fetch('http://38.242.208.190:5001/api/licenses');
      const licensesData = await licensesResponse.json();
      const expiringLicenses = licensesData.filter(license => {
        if (!license.renewal?.nextRenewalDate) return false;
        const daysUntilRenewal = Math.ceil(
          (new Date(license.renewal.nextRenewalDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilRenewal <= 30 && daysUntilRenewal > 0;
      }).length;

      // Fetch urgent projects
      const projectsResponse = await fetch('http://38.242.208.190:5001/api/projects');
      const projectsData = await projectsResponse.json();
      const urgentProjects = projectsData.filter(project => {
        const hasDelayedMilestones = (project.milestones || []).some(milestone => 
          milestone.status === 'késedelmes'
        );
        return project.priority === 'magas' || hasDelayedMilestones;
      }).length;

      // Fetch unpaid invoices
      const projectsWithInvoices = projectsData.filter(project => 
        (project.invoices || []).some(invoice => 
          invoice.status === 'késedelmes'
        )
      ).length;

      setNotifications({
        contacts: newContacts,
        calculator: newCalculators,
        domains: expiringDomains,
        servers: serverIssues,
        licenses: expiringLicenses,
        projects: urgentProjects,
        invoices: projectsWithInvoices,
        accounting: 0 // Placeholder for future accounting notifications
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const totalNotifications = Object.values(notifications).reduce((a, b) => a + b, 0);

  const NotificationItem = ({ count, label, color = "red" }) => {
    if (count === 0) return null;
    return (
      <div className="flex justify-between items-center px-4 py-2 hover:bg-gray-50">
        <span className="text-sm text-gray-700">{label}</span>
        <span className={`px-2 py-1 text-xs font-bold text-white bg-${color}-500 rounded-full`}>
          {count}
        </span>
      </div>
    );
  };

  return (
    <div className="relative">
      <button 
        className="text-gray-300 hover:text-white relative"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <Bell size={20} />
        {totalNotifications > 0 && (
          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {totalNotifications}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-50">
          <NotificationItem 
            count={notifications.contacts} 
            label="Új kapcsolatfelvétel" 
          />
          <NotificationItem 
            count={notifications.calculator} 
            label="Új kalkulátor jelentkezés" 
          />
          <NotificationItem 
            count={notifications.domains} 
            label="Lejáró domain" 
            color="yellow"
          />
          <NotificationItem 
            count={notifications.servers} 
            label="Szerver probléma" 
            color="orange"
          />
          <NotificationItem 
            count={notifications.licenses} 
            label="Lejáró licensz" 
            color="purple"
          />
          <NotificationItem 
            count={notifications.projects} 
            label="Sürgős projekt" 
            color="blue"
          />
          <NotificationItem 
            count={notifications.invoices} 
            label="Késedelmes számla" 
            color="red"
          />
          <NotificationItem 
            count={notifications.accounting} 
            label="Könyvelési feladat" 
            color="green"
          />
          
          {totalNotifications === 0 && (
            <div className="px-4 py-2 text-sm text-gray-500">
              Nincsenek új értesítések
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsManager;