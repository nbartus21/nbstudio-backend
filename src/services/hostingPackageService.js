import { api } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'https://admin.nb-studio.net:5001/api';

// Fetch all hosting packages
export const fetchHostingPackages = async () => {
  try {
    const response = await api.get(`${API_URL}/hosting-packages`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch packages: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching hosting packages:', error);
    throw error;
  }
};

// Fetch active (public) hosting packages
export const fetchPublicHostingPackages = async () => {
  try {
    const response = await api.get(`${API_URL}/public/hosting-packages`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch public packages: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching public hosting packages:', error);
    throw error;
  }
};

// Get a single hosting package by ID
export const getHostingPackage = async (id) => {
  try {
    const response = await api.get(`${API_URL}/hosting-packages/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch package: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching hosting package ${id}:`, error);
    throw error;
  }
};

// Create a new hosting package
export const createHostingPackage = async (packageData) => {
  try {
    const response = await api.post(`${API_URL}/hosting-packages`, packageData);
    
    if (!response.ok) {
      throw new Error(`Failed to create package: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating hosting package:', error);
    throw error;
  }
};

// Update an existing hosting package
export const updateHostingPackage = async (id, packageData) => {
  try {
    const response = await api.put(`${API_URL}/hosting-packages/${id}`, packageData);
    
    if (!response.ok) {
      throw new Error(`Failed to update package: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating hosting package ${id}:`, error);
    throw error;
  }
};

// Delete a hosting package
export const deleteHostingPackage = async (id) => {
  try {
    const response = await api.delete(`${API_URL}/hosting-packages/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to delete package: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting hosting package ${id}:`, error);
    throw error;
  }
};

// Update the display order of packages
export const reorderHostingPackages = async (packageOrders) => {
  try {
    const response = await api.put(`${API_URL}/hosting-packages/reorder`, { packageOrders });
    
    if (!response.ok) {
      throw new Error('Failed to update package order');
    }
    
    return true;
  } catch (error) {
    console.error('Error updating package order:', error);
    throw error;
  }
};