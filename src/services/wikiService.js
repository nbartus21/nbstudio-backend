// src/services/wikiService.js
import axios from 'axios';
import { API_URL } from '../config';

// Get API key from local storage
const getApiKey = () => {
  return localStorage.getItem('apiKey') || '';
};

// Get token from local storage
const getToken = () => {
  return localStorage.getItem('token') || '';
};

// Headers with API key (for public endpoints)
const publicHeaders = () => ({
  'Content-Type': 'application/json',
  'X-API-Key': getApiKey()
});

// Headers with token (for authenticated endpoints)
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
});

// Search knowledge base (public)
export const searchWiki = async (query, language = 'en', limit = 5) => {
  try {
    const response = await axios.get(`${API_URL}/public/wiki/search`, {
      params: { query, language, limit },
      headers: publicHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error searching wiki:', error);
    throw error;
  }
};

// Get all categories (public)
export const getWikiCategories = async () => {
  try {
    const response = await axios.get(`${API_URL}/public/wiki/categories`, {
      headers: publicHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching wiki categories:', error);
    throw error;
  }
};

// Get entries by category (public)
export const getWikiByCategory = async (category, language = 'en') => {
  try {
    const response = await axios.get(`${API_URL}/public/wiki/category/${category}`, {
      params: { language },
      headers: publicHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching wiki by category:', error);
    throw error;
  }
};

// AI query with knowledge base context (public)
export const aiQueryWithKnowledge = async (query, language = 'en') => {
  try {
    const response = await axios.post(`${API_URL}/public/wiki/ai-query`, {
      query,
      language
    }, {
      headers: publicHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error with AI knowledge query:', error);
    throw error;
  }
};

// Admin Operations (authenticated)

// Get all wiki entries (admin)
export const getAllWikiEntries = async () => {
  try {
    const response = await axios.get(`${API_URL}/wiki`, {
      headers: authHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching all wiki entries:', error);
    throw error;
  }
};

// Get wiki entry by ID (admin)
export const getWikiEntryById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/wiki/${id}`, {
      headers: authHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching wiki entry:', error);
    throw error;
  }
};

// Create new wiki entry (admin)
export const createWikiEntry = async (entryData) => {
  try {
    const response = await axios.post(`${API_URL}/wiki`, entryData, {
      headers: authHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error creating wiki entry:', error);
    throw error;
  }
};

// Update wiki entry (admin)
export const updateWikiEntry = async (id, entryData) => {
  try {
    const response = await axios.put(`${API_URL}/wiki/${id}`, entryData, {
      headers: authHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error updating wiki entry:', error);
    throw error;
  }
};

// Delete wiki entry (admin)
export const deleteWikiEntry = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/wiki/${id}`, {
      headers: authHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting wiki entry:', error);
    throw error;
  }
};

export default {
  searchWiki,
  getWikiCategories,
  getWikiByCategory,
  aiQueryWithKnowledge,
  getAllWikiEntries,
  getWikiEntryById,
  createWikiEntry,
  updateWikiEntry,
  deleteWikiEntry
};