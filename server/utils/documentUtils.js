/**
 * Document Utility Functions
 * 
 * Helper functions for document processing in the Document Management System.
 */

import { PDFDocument } from 'pdf-lib';
import config from '../config/index.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Document from '../models/Document.js';
import DocumentVersion from '../models/DocumentVersion.js';
import fileUtils from './fileUtils.js';

/**
 * Validates a document file type based on the allowed types in config
 * @param {string} filename - Name of the file to validate
 * @returns {boolean} - True if the file type is allowed
 */
const isAllowedFileType = (filename) => {
  if (!filename) return false;
  
  const extension = path.extname(filename).toLowerCase().substring(1);
  return config.documents.allowedTypes.includes(extension);
};

/**
 * Creates a shareable link for a document
 * @param {string} documentId - ID of the document
 * @param {string} shareId - ID of the share record
 * @returns {string} - Shareable link
 */
const createShareableLink = (documentId, shareId) => {
  return `${process.env.FRONTEND_URL}/shared-documents/${documentId}/${shareId}`;
};

/**
 * Generates a watermark text for PDF documents
 * @param {string} text - Text to use for the watermark
 * @param {Object} options - Watermark options
 * @returns {string} - Watermark text with formatting
 */
const generateWatermarkText = (text, options = {}) => {
  const defaultOptions = {
    opacity: 0.3,
    fontSize: 24,
    rotation: -45,
    color: 'gray'
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  return `
    .watermark {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: ${mergedOptions.opacity};
      font-size: ${mergedOptions.fontSize}px;
      transform: rotate(${mergedOptions.rotation}deg);
      color: ${mergedOptions.color};
      pointer-events: none;
      z-index: 1000;
    }
  `;
};

/**
 * Adds a watermark to a PDF document
 * @param {Buffer} pdfBuffer - Original PDF buffer
 * @param {string} watermarkText - Text to use as watermark
 * @returns {Promise<Buffer>} - New PDF buffer with watermark
 */
const addWatermarkToPdf = async (pdfBuffer, watermarkText) => {
  try {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    
    // Add watermark to each page
    for (const page of pages) {
      const { width, height } = page.getSize();
      const fontSize = Math.min(width, height) / 20;
      
      page.drawText(watermarkText, {
        x: width / 2 - (watermarkText.length * fontSize) / 4,
        y: height / 2,
        size: fontSize,
        opacity: 0.3,
        rotate: Math.PI / -4
      });
    }
    
    // Save the modified document
    const modifiedPdfBytes = await pdfDoc.save();
    return Buffer.from(modifiedPdfBytes);
  } catch (error) {
    console.error('Error adding watermark to PDF:', error);
    return pdfBuffer; // Return original if watermarking fails
  }
};

/**
 * Checks if a file is a PDF
 * @param {string} filename - Name of the file
 * @returns {boolean} - True if the file is a PDF
 */
const isPdfFile = (filename) => {
  return path.extname(filename).toLowerCase() === '.pdf';
};

/**
 * Create a new document version
 * @param {Object} documentId - Document ID
 * @param {Object} fileInfo - File information
 * @param {Object} userData - User data
 * @param {string} description - Version description
 * @returns {Promise<Object>} Created version
 */
const createDocumentVersion = async (documentId, fileInfo, userData, description = '') => {
  try {
    // Create a new document version
    const newVersion = new DocumentVersion({
      document: documentId,
      versionNumber: 1, // Will be incremented in pre-save hook
      fileInfo,
      createdBy: userData.userId,
      description
    });
    
    await newVersion.save();
    
    // Update the document's current version
    await Document.findByIdAndUpdate(documentId, {
      $set: {
        currentVersion: newVersion._id,
        lastUpdatedBy: userData.userId
      },
      $inc: { versionCount: 1 }
    });
    
    return newVersion;
  } catch (error) {
    console.error('Error creating document version:', error);
    throw error;
  }
};

/**
 * Get list of versions for a document
 * @param {string} documentId - Document ID
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Versions and pagination info
 */
const getDocumentVersions = async (documentId, options = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;
  
  try {
    // Query for versions
    const versions = await DocumentVersion.find({ document: documentId })
      .sort({ versionNumber: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');
    
    // Get total count
    const total = await DocumentVersion.countDocuments({ document: documentId });
    
    return {
      versions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting document versions:', error);
    throw error;
  }
};

/**
 * Create a document with file
 * @param {Object} documentData - Document data
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created document
 */
const createDocumentWithFile = async (documentData, fileBuffer, fileName, userData) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Save file to storage
    const fileInfo = await fileUtils.saveFile(
      fileBuffer,
      fileName,
      documentData.project ? `project_${documentData.project}` : 'general'
    );
    
    // Create document
    const document = new Document({
      ...documentData,
      fileInfo: {
        originalName: fileInfo.originalName,
        fileName: fileInfo.fileName,
        relativePath: fileInfo.relativePath,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        extension: fileInfo.extension
      },
      createdBy: userData.userId,
      lastUpdatedBy: userData.userId
    });
    
    await document.save({ session });
    
    // Create initial version
    const version = new DocumentVersion({
      document: document._id,
      versionNumber: 1,
      fileInfo: document.fileInfo,
      createdBy: userData.userId,
      description: 'Initial version'
    });
    
    await version.save({ session });
    
    // Set the current version reference
    document.currentVersion = version._id;
    document.versionCount = 1;
    await document.save({ session });
    
    await session.commitTransaction();
    
    return document;
  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating document with file:', error);
    
    // Clean up any saved file if the transaction failed
    if (fileInfo && fileInfo.relativePath) {
      await fileUtils.deleteFile(fileInfo.relativePath).catch(e => 
        console.error('Failed to delete file during rollback:', e)
      );
    }
    
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Update a document with a new file version
 * @param {string} documentId - Document ID
 * @param {Object} updateData - Update data
 * @param {Buffer} fileBuffer - File buffer (optional)
 * @param {string} fileName - Original file name (optional)
 * @param {Object} userData - User data
 * @param {string} versionDescription - Version description
 * @returns {Promise<Object>} Updated document
 */
const updateDocumentWithNewVersion = async (
  documentId, 
  updateData, 
  fileBuffer, 
  fileName, 
  userData, 
  versionDescription = ''
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  let fileInfo = null;
  
  try {
    // Get the document
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Handle file update if provided
    if (fileBuffer && fileName) {
      // Save new file
      fileInfo = await fileUtils.saveFile(
        fileBuffer,
        fileName,
        document.project ? `project_${document.project}` : 'general'
      );
      
      // Create new version
      const newVersion = new DocumentVersion({
        document: document._id,
        versionNumber: document.versionCount + 1,
        fileInfo: {
          originalName: fileInfo.originalName,
          fileName: fileInfo.fileName,
          relativePath: fileInfo.relativePath,
          mimeType: fileInfo.mimeType,
          size: fileInfo.size,
          extension: fileInfo.extension
        },
        createdBy: userData.userId,
        description: versionDescription
      });
      
      await newVersion.save({ session });
      
      // Update document with new version info
      updateData.fileInfo = newVersion.fileInfo;
      updateData.currentVersion = newVersion._id;
      updateData.versionCount = document.versionCount + 1;
    }
    
    // Update the document
    updateData.lastUpdatedBy = userData.userId;
    updateData.updatedAt = new Date();
    
    const updatedDocument = await Document.findByIdAndUpdate(
      documentId,
      { $set: updateData },
      { new: true, session }
    );
    
    await session.commitTransaction();
    
    return updatedDocument;
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating document with new version:', error);
    
    // Clean up any saved file if the transaction failed
    if (fileInfo && fileInfo.relativePath) {
      await fileUtils.deleteFile(fileInfo.relativePath).catch(e => 
        console.error('Failed to delete file during rollback:', e)
      );
    }
    
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Soft delete a document
 * @param {string} documentId - Document ID
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Deleted document
 */
const softDeleteDocument = async (documentId, userData) => {
  try {
    const document = await Document.findByIdAndUpdate(
      documentId,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userData.userId
        }
      },
      { new: true }
    );
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    return document;
  } catch (error) {
    console.error('Error soft deleting document:', error);
    throw error;
  }
};

/**
 * Hard delete a document and all its versions
 * @param {string} documentId - Document ID
 * @returns {Promise<boolean>} Success flag
 */
const hardDeleteDocument = async (documentId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Get document and all versions
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    
    const versions = await DocumentVersion.find({ document: documentId });
    
    // Delete all version files
    for (const version of versions) {
      if (version.fileInfo && version.fileInfo.relativePath) {
        await fileUtils.deleteFile(version.fileInfo.relativePath);
      }
    }
    
    // Delete document file if not included in versions
    if (document.fileInfo && document.fileInfo.relativePath) {
      const versionHasSameFile = versions.some(
        v => v.fileInfo && v.fileInfo.relativePath === document.fileInfo.relativePath
      );
      
      if (!versionHasSameFile) {
        await fileUtils.deleteFile(document.fileInfo.relativePath);
      }
    }
    
    // Delete all versions from DB
    await DocumentVersion.deleteMany({ document: documentId }, { session });
    
    // Delete the document from DB
    await Document.findByIdAndDelete(documentId, { session });
    
    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    console.error('Error hard deleting document:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

// Export the document utility functions
export {
  isAllowedFileType,
  createShareableLink,
  generateWatermarkText,
  addWatermarkToPdf,
  isPdfFile,
  createDocumentVersion,
  getDocumentVersions,
  createDocumentWithFile,
  updateDocumentWithNewVersion,
  softDeleteDocument,
  hardDeleteDocument
}; 