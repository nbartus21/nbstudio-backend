/**
 * File Utilities
 * 
 * Helper functions for file operations in the Document Management System.
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import config from '../config/index.js';

// Promisify fs functions
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dir - Directory path to check/create
 * @returns {Promise<void>}
 */
const ensureDirectoryExists = async (dir) => {
  try {
    await access(dir, fs.constants.F_OK);
  } catch (error) {
    await mkdir(dir, { recursive: true });
  }
};

/**
 * Generate a unique filename
 * @param {string} originalFilename - Original filename
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalFilename) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const ext = path.extname(originalFilename);
  const basename = path.basename(originalFilename, ext)
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
  
  return `${basename}_${timestamp}_${random}${ext}`;
};

/**
 * Save a file to the filesystem
 * @param {Buffer} buffer - File buffer
 * @param {string} originalFilename - Original filename
 * @param {string} subDirectory - Subdirectory within the storage path
 * @returns {Promise<Object>} File information object
 */
const saveFile = async (buffer, originalFilename, subDirectory = '') => {
  try {
    // Get storage path from config
    const storagePath = config.documents.storagePath;
    
    // Create full path with subdirectory
    const fullPath = path.join(storagePath, subDirectory);
    
    // Ensure directory exists
    await ensureDirectoryExists(fullPath);
    
    // Generate unique filename
    const filename = generateUniqueFilename(originalFilename);
    
    // Create full file path
    const filePath = path.join(fullPath, filename);
    
    // Write file
    await writeFile(filePath, buffer);
    
    // Calculate relative path (for storage in db)
    const relativePath = path.join(subDirectory, filename);
    
    // Return file information
    return {
      originalName: originalFilename,
      fileName: filename,
      path: filePath,
      relativePath,
      mimeType: getMimeType(originalFilename),
      size: buffer.length,
      extension: path.extname(originalFilename).substring(1)
    };
  } catch (error) {
    console.error('Error in saveFile:', error);
    throw error;
  }
};

/**
 * Read a file from the filesystem
 * @param {string} relativePath - Relative path of the file
 * @returns {Promise<Buffer>} File buffer
 */
const readFileFromStorage = async (relativePath) => {
  try {
    // Get storage path from config
    const storagePath = config.documents.storagePath;
    
    // Create full file path
    const filePath = path.join(storagePath, relativePath);
    
    // Read file
    return await readFile(filePath);
  } catch (error) {
    console.error('Error in readFileFromStorage:', error);
    throw error;
  }
};

/**
 * Delete a file from the filesystem
 * @param {string} relativePath - Relative path of the file
 * @returns {Promise<boolean>} Success or failure
 */
const deleteFile = async (relativePath) => {
  try {
    // Get storage path from config
    const storagePath = config.documents.storagePath;
    
    // Create full file path
    const filePath = path.join(storagePath, relativePath);
    
    // Try to delete the file
    await unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error in deleteFile:', error);
    return false;
  }
};

/**
 * Get MIME type based on file extension
 * @param {string} filename - Filename
 * @returns {string} MIME type
 */
const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
};

export default {
  saveFile,
  readFile: readFileFromStorage,
  deleteFile,
  ensureDirectoryExists,
  generateUniqueFilename,
  getMimeType
}; 