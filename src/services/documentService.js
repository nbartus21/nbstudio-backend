import { api } from './auth';

/**
 * Service for document management in frontend
 */
const documentService = {
  /**
   * Get all document templates
   * @param {Object} filters - Optional filters (type, language)
   * @returns {Promise<Array>}
   */
  async getTemplates(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.language) params.append('language', filters.language);
      
      const response = await api.get(`/api/templates?${params}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  },
  
  /**
   * Get template by ID
   * @param {string} id - Template ID
   * @returns {Promise<Object>}
   */
  async getTemplateById(id) {
    try {
      const response = await api.get(`/api/templates/${id}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  },
  
  /**
   * Create new template
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>}
   */
  async createTemplate(templateData) {
    try {
      const response = await api.post('/api/templates', templateData);
      return await response.json();
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  },
  
  /**
   * Update template
   * @param {string} id - Template ID
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>}
   */
  async updateTemplate(id, templateData) {
    try {
      const response = await api.put(`/api/templates/${id}`, templateData);
      return await response.json();
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  },
  
  /**
   * Delete template
   * @param {string} id - Template ID
   * @returns {Promise<Object>}
   */
  async deleteTemplate(id) {
    try {
      const response = await api.delete(`/api/templates/${id}`);
      return await response.json();
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  },
  
  /**
   * Get all documents
   * @param {Object} filters - Optional filters (projectId, status)
   * @returns {Promise<Array>}
   */
  async getDocuments(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.status) params.append('status', filters.status);
      
      const response = await api.get(`/api/documents?${params}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  },
  
  /**
   * Get document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object>}
   */
  async getDocumentById(id) {
    try {
      const response = await api.get(`/api/documents/${id}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  },
  
  /**
   * Create new document
   * @param {Object} documentData - Document data
   * @returns {Promise<Object>}
   */
  async createDocument(documentData) {
    try {
      const response = await api.post('/api/documents', documentData);
      return await response.json();
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  },
  
  /**
   * Update document
   * @param {string} id - Document ID
   * @param {Object} documentData - Document data
   * @returns {Promise<Object>}
   */
  async updateDocument(id, documentData) {
    try {
      const response = await api.put(`/api/documents/${id}`, documentData);
      return await response.json();
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },
  
  /**
   * Delete document
   * @param {string} id - Document ID
   * @returns {Promise<Object>}
   */
  async deleteDocument(id) {
    try {
      const response = await api.delete(`/api/documents/${id}`);
      return await response.json();
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },
  
  /**
   * Share document
   * @param {string} id - Document ID
   * @param {string} email - Email address
   * @param {string} language - Language (hu, de, en)
   * @returns {Promise<Object>}
   */
  async shareDocument(id, email, language = 'hu') {
    try {
      const response = await api.post(`/api/documents/${id}/share`, {
        email,
        language
      });
      return await response.json();
    } catch (error) {
      console.error('Error sharing document:', error);
      throw error;
    }
  },
  
  /**
   * Get document preview URL
   * @param {string} id - Document ID
   * @returns {string}
   */
  getDocumentPreviewUrl(id) {
    return `/api/documents/${id}/pdf`;
  },
  
  /**
   * Get document templates by type
   * @param {string} type - Document type
   * @param {string} language - Language code
   * @returns {Promise<Array>}
   */
  async getTemplatesByType(type, language) {
    try {
      const templates = await this.getTemplates({ type, language });
      
      // Check for default template
      const defaultTemplate = templates.find(t => t.isDefault);
      if (defaultTemplate) {
        return [defaultTemplate, ...templates.filter(t => !t.isDefault)];
      }
      
      return templates;
    } catch (error) {
      console.error('Error fetching templates by type:', error);
      throw error;
    }
  },
  
  /**
   * Get template variables
   * @param {Object} template - Template object
   * @returns {Array} - Array of variable names
   */
  getTemplateVariables(template) {
    if (!template || !template.content) return [];
    
    // Extract variables from template content using regex
    const variableRegex = /{{([^}]+)}}/g;
    const variables = [];
    let match;
    
    while ((match = variableRegex.exec(template.content)) !== null) {
      const variable = match[1];
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }
    
    return variables;
  }
};

export default documentService;