/**
 * Document Management API Routes
 * Handles all document operations including CRUD, versioning, and sharing
 */

import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { validateObjectId } from '../middleware/validation.js';
import auth from '../middleware/auth.js';
import Document from '../models/Document.js';
import DocumentVersion from '../models/DocumentVersion.js';
import { 
  createDocumentWithFile, 
  updateDocumentWithNewVersion,
  getDocumentVersions,
  softDeleteDocument,
  hardDeleteDocument
} from '../utils/documentUtils.js';
import config from '../config/index.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { 
    fileSize: config.document.maxUploadSize 
  }
});

/**
 * @route   GET /api/documents
 * @desc    Get all documents with pagination and filtering
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'createdAt', 
      order = 'desc',
      search = '',
      documentType,
      project,
      tags,
      createdBy,
      status,
      includeDeleted = false
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = {};
    
    // Only include deleted if specifically requested
    if (!includeDeleted || includeDeleted === 'false') {
      query.isDeleted = false;
    }
    
    // Add search if provided
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add filters if provided
    if (documentType) query.documentType = documentType;
    if (project && mongoose.Types.ObjectId.isValid(project)) query.project = project;
    if (tags) query.tags = { $in: tags.split(',') };
    if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) query.createdBy = createdBy;
    if (status) query.status = status;
    
    // Get total count
    const total = await Document.countDocuments(query);
    
    // Get documents
    const documents = await Document.find(query)
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'firstName lastName email')
      .populate('project', 'name')
      .lean();
    
    return res.json({
      documents,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting documents:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/documents/:id
 * @desc    Get a single document by ID
 * @access  Private
 */
router.get('/:id', [auth, validateObjectId], async (req, res) => {
  try {
    const document = await Document.findOne({ 
      _id: req.params.id,
      isDeleted: false
    })
      .populate('createdBy', 'firstName lastName email')
      .populate('project', 'name')
      .populate('currentVersion')
      .lean();
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    return res.json(document);
  } catch (error) {
    console.error('Error getting document:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/documents
 * @desc    Create a new document with file
 * @access  Private
 */
router.post('/', [auth, upload.single('file')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }
    
    const { 
      title, 
      description,
      documentType, 
      tags, 
      project, 
      accessLevel,
      sharedWith,
      status = 'active'
    } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    // Process array fields
    const parsedTags = tags ? (typeof tags === 'string' ? tags.split(',') : tags) : [];
    const parsedSharedWith = sharedWith ? (typeof sharedWith === 'string' ? sharedWith.split(',') : sharedWith) : [];
    
    // Create document with file
    const result = await createDocumentWithFile({
      file: req.file,
      title,
      description,
      documentType,
      tags: parsedTags,
      project: project || null,
      accessLevel: accessLevel || 'private',
      sharedWith: parsedSharedWith,
      status,
      createdBy: req.user.id
    });
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error creating document:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/documents/:id
 * @desc    Update a document with optional new file version
 * @access  Private
 */
router.put('/:id', [auth, validateObjectId, upload.single('file')], async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Check if document exists
    const existingDocument = await Document.findOne({ 
      _id: documentId,
      isDeleted: false
    });
    
    if (!existingDocument) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const {
      title,
      description,
      documentType,
      tags,
      project,
      accessLevel,
      sharedWith,
      status,
      versionComment
    } = req.body;
    
    // Process array fields
    const parsedTags = tags ? (typeof tags === 'string' ? tags.split(',') : tags) : undefined;
    const parsedSharedWith = sharedWith ? (typeof sharedWith === 'string' ? sharedWith.split(',') : sharedWith) : undefined;
    
    // Update document with optional new file
    const result = await updateDocumentWithNewVersion({
      documentId,
      file: req.file, // Optional: if provided, create new version
      title,
      description,
      documentType,
      tags: parsedTags,
      project,
      accessLevel,
      sharedWith: parsedSharedWith,
      status,
      versionComment,
      userId: req.user.id
    });
    
    return res.json(result);
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/documents/:id/versions
 * @desc    Get all versions of a document
 * @access  Private
 */
router.get('/:id/versions', [auth, validateObjectId], async (req, res) => {
  try {
    const documentId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    
    // Check if document exists
    const document = await Document.findOne({ 
      _id: documentId,
      isDeleted: false
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Get document versions
    const result = await getDocumentVersions(documentId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    return res.json(result);
  } catch (error) {
    console.error('Error getting document versions:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/documents/:id
 * @desc    Soft delete a document
 * @access  Private
 */
router.delete('/:id', [auth, validateObjectId], async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    
    // Soft delete document
    const result = await softDeleteDocument(documentId, userId);
    
    if (!result.success) {
      return res.status(404).json({ message: result.message || 'Document not found' });
    }
    
    return res.json({ message: 'Document deleted successfully', document: result.document });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/documents/:id/permanent
 * @desc    Hard delete a document (permanent)
 * @access  Private
 */
router.delete('/:id/permanent', [auth, validateObjectId], async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Hard delete document
    const result = await hardDeleteDocument(documentId);
    
    if (!result.success) {
      return res.status(404).json({ message: result.message || 'Document not found' });
    }
    
    return res.json({ message: 'Document permanently deleted', deletedFiles: result.deletedFiles });
  } catch (error) {
    console.error('Error permanently deleting document:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/documents/:id/restore
 * @desc    Restore a soft-deleted document
 * @access  Private
 */
router.post('/:id/restore', [auth, validateObjectId], async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Find and restore the document
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    if (!document.isDeleted) {
      return res.status(400).json({ message: 'Document is not deleted' });
    }
    
    // Restore document
    document.isDeleted = false;
    document.deletedAt = null;
    document.deletedBy = null;
    await document.save();
    
    return res.json({ message: 'Document restored successfully', document });
  } catch (error) {
    console.error('Error restoring document:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router; 