import { API_BASE_URL } from '../../config';

const API_URL = API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

/**
 * Nyilvános API szolgáltatás megosztott projektek és dokumentumok kezeléséhez
 */
export const publicApiService = {
  /**
   * Projekt adatok lekérése token alapján
   * @param {string} token - A projekt megosztási token
   * @param {string} pin - PIN kód a projekt eléréséhez
   * @returns {Promise<Object>} - Projekt adatok
   */
  async getSharedProject(token, pin) {
    try {
      const response = await fetch(`${API_URL}/public/projects/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'Authorization': `Bearer ${pin}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch shared project');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching shared project data:', error);
      throw error;
    }
  },

  /**
   * Projekt dokumentumok lekérése
   * @param {string} projectId - Projekt azonosító
   * @param {string} pin - PIN kód a projekt eléréséhez
   * @returns {Promise<Object>} - Projekt dokumentumok listája
   */
  async getProjectDocuments(projectId, pin) {
    try {
      const response = await fetch(`${API_URL}/public/projects/${projectId}/documents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'Authorization': `Bearer ${pin}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch project documents');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching project documents:', error);
      throw error;
    }
  },

  /**
   * Dokumentum állapotának frissítése ügyfél által
   * @param {string} documentId - Dokumentum azonosító
   * @param {string} status - Új állapot ('approved' vagy 'rejected')
   * @param {string} comment - Opcionális megjegyzés
   * @param {string} projectId - Projekt azonosító
   * @param {string} clientId - Ügyfél azonosító
   * @param {string} pin - PIN kód a projekt eléréséhez
   * @returns {Promise<Object>} - Frissített dokumentum
   */
  async updateDocumentStatus(documentId, status, comment, projectId, clientId, pin) {
    try {
      const response = await fetch(`${API_URL}/public/documents/${documentId}/client-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'Authorization': `Bearer ${pin}`
        },
        body: JSON.stringify({
          status,
          comment,
          projectId,
          clientId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update document status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating document status:', error);
      throw error;
    }
  },

  /**
   * Dokumentum letöltése PDF formátumban
   * @param {string} documentId - Dokumentum azonosító
   * @param {string} pin - PIN kód a projekt eléréséhez
   * @returns {Promise<Blob>} - PDF dokumentum blob
   */
  async downloadDocumentPdf(documentId, pin) {
    try {
      const response = await fetch(`${API_URL}/public/documents/${documentId}/pdf`, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY,
          'Authorization': `Bearer ${pin}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download document PDF');
      }

      return await response.blob();
    } catch (error) {
      console.error('Error downloading document PDF:', error);
      throw error;
    }
  },

  /**
   * Dokumentum megtekintése
   * @param {string} documentId - Dokumentum azonosító
   * @param {string} pin - PIN kód a projekt eléréséhez
   * @returns {Promise<Object>} - Dokumentum adatok
   */
  async getDocumentDetails(documentId, pin) {
    try {
      const response = await fetch(`${API_URL}/public/documents/${documentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'Authorization': `Bearer ${pin}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document details');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching document details:', error);
      throw error;
    }
  }
}; 