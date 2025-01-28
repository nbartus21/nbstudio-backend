import React, { useState, useEffect } from 'react';

const API_URL = 'https://nbstudio-backend.onrender.com/api';

// Modal komponens
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl p-6 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
};

const ContactAdmin = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/contacts`);
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // View message details
  const handleViewMessage = (contact) => {
    setSelectedContact(contact);
    setIsModalOpen(true);
  };

  // Update contact status
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/contacts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      fetchContacts();
    } catch (error) {
      setError(error.message);
    }
  };

  // Delete contact
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      const response = await fetch(`${API_URL}/contacts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete contact');
      fetchContacts();
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">Error: {error}</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Contact Messages</h1>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 shadow-sm rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contacts.map((contact) => (
                <tr key={contact._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{contact.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{contact.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleViewMessage(contact)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Message
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={contact.status}
                      onChange={(e) => handleStatusUpdate(contact._id, e.target.value)}
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="new">New</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(contact._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message Detail Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {selectedContact && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Message Details</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">From</h3>
                <p className="mt-1 text-gray-900 dark:text-white">{selectedContact.name} ({selectedContact.email})</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</h3>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {new Date(selectedContact.createdAt).toLocaleString()}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                <p className="mt-1 text-gray-900 dark:text-white capitalize">{selectedContact.status}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Message</h3>
                <p className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">
                  {selectedContact.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ContactAdmin;
