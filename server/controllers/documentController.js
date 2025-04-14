/**
 * Document Controller
 * Handles document-related operations in the document management system
 */

import Document from '../models/Document.js';
import DocumentVersion from '../models/DocumentVersion.js';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import multer from 'multer';
import config from '../config/index.js';
import mongoose from 'mongoose';
import createError from 'http-errors';

const unlinkAsync = promisify(fs.unlink);

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = config.documents.uploadPath;
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueFilename = `${Date.now()}-${mongoose.Types.ObjectId()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueFilename);
  }
});

// Filter allowed files based on MIME type
const fileFilter = (req, file, cb) => {
  const allowedTypes = config.documents.allowedMimeTypes;
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Supported types: ${allowedTypes.join(', ')}`), false);
  }
};

// Set up multer with configured options
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.documents.maxFileSize
  }
});

// Helper functions
const handleError = (res, error) => {
  console.error('Document controller error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation error', details: error.message });
  }
  
  if (error.code === 11000) {
    return res.status(409).json({ error: 'Duplicate document' });
  }
  
  return res.status(500).json({ error: 'Server error', message: error.message });
};

const checkDocumentAccess = async (userId, documentId, requiredLevel = 'read') => {
  const document = await Document.findById(documentId);
  
  if (!document) {
    throw createError(404, 'Document not found');
  }
  
  // Check if user has the required access level
  const hasAccess = document.hasAccess(userId, requiredLevel);
  
  if (!hasAccess) {
    throw createError(403, `You don't have ${requiredLevel} access to this document`);
  }
  
  return document;
};

/**
 * @desc    Create a new document with file upload
 * @route   POST /api/documents
 * @access  Authenticated users
 */
export const createDocument = [
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const { title, description, documentType, tags, project, accessLevel, language } = req.body;
      
      // Create document
      const document = new Document({
        title,
        description,
        documentType,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        project: project || null,
        accessLevel: accessLevel || 'private',
        createdBy: req.user._id,
        language: language || config.app.defaultLanguage
      });
      
      // Save document to get an ID for the version
      await document.save();
      
      // Create file info object
      const fileInfo = {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        fileSize: req.file.size,
        filePath: req.file.path,
        fileType: req.file.mimetype,
        uploadDate: new Date(),
        storageProvider: 'local',
        storagePath: req.file.path,
        checksum: req.file.checksum || ''
      };
      
      // Create first version
      const version = await DocumentVersion.createNewVersion({
        documentId: document._id,
        fileInfo,
        userId: req.user._id,
        changeDescription: 'Initial version',
        metadata: {}
      });
      
      // Return created document with version info
      const result = await Document.findById(document._id)
        .populate('currentVersion')
        .populate('createdBy', 'name email');
      
      res.status(201).json(result);
    } catch (error) {
      // Delete uploaded file if an error occurs
      if (req.file && req.file.path) {
        try {
          await unlinkAsync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting file after failed upload:', unlinkError);
        }
      }
      
      handleError(res, error);
    }
  }
];

/**
 * @desc    Get all documents (with filtering)
 * @route   GET /api/documents
 * @access  Authenticated users
 */
export const getDocuments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      title,
      documentType,
      tag,
      project,
      createdBy,
      startDate,
      endDate,
      accessLevel,
      language
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Text search on title
    if (title) {
      filter.title = { $regex: title, $options: 'i' };
    }
    
    // Filter by document type
    if (documentType) {
      filter.documentType = documentType;
    }
    
    // Filter by tag
    if (tag) {
      filter.tags = tag;
    }
    
    // Filter by project
    if (project) {
      filter.project = project;
    }
    
    // Filter by creator
    if (createdBy) {
      filter.createdBy = createdBy;
    }
    
    // Date range filtering
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Filter by access level if not admin
    if (!req.user.isAdmin) {
      // Only get documents user has access to
      const documents = await Document.findAvailableToUser(
        req.user._id,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          sort,
          filter
        }
      );
      
      return res.json(documents);
    }
    
    // Admin gets all documents matching filters
    if (accessLevel) {
      filter.accessLevel = accessLevel;
    }
    
    if (language) {
      filter.language = language;
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: [
        { path: 'createdBy', select: 'name email' },
        { path: 'currentVersion' },
        { path: 'project', select: 'name' }
      ]
    };
    
    const documents = await Document.paginate(filter, options);
    
    res.json(documents);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * @desc    Get a document by ID
 * @route   GET /api/documents/:id
 * @access  Users with access to the document
 */
export const getDocumentById = async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Check access and get document
    const document = await checkDocumentAccess(req.user._id, documentId);
    
    // Populate related fields
    const populatedDocument = await Document.findById(documentId)
      .populate('createdBy', 'name email')
      .populate('currentVersion')
      .populate('project', 'name')
      .populate('sharedWith.user', 'name email');
    
    res.json(populatedDocument);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * @desc    Update a document's metadata
 * @route   PUT /api/documents/:id
 * @access  Document owners and editors
 */
export const updateDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Check write access and get document
    const document = await checkDocumentAccess(req.user._id, documentId, 'write');
    
    const allowedUpdates = [
      'title', 
      'description', 
      'documentType', 
      'tags',
      'project', 
      'accessLevel',
      'expiresAt',
      'retentionPeriod',
      'metadata',
      'language'
    ];
    
    // Filter out fields that shouldn't be updated
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    // Handle tags separately if it's a string
    if (typeof req.body.tags === 'string') {
      updates.tags = req.body.tags.split(',').map(tag => tag.trim());
    }
    
    // Update document
    const updatedDocument = await Document.findByIdAndUpdate(
      documentId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('currentVersion')
      .populate('project', 'name');
    
    res.json(updatedDocument);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * @desc    Delete a document (soft delete)
 * @route   DELETE /api/documents/:id
 * @access  Document owners and admins
 */
export const deleteDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Only owners and admins can delete
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const isOwner = document.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.isAdmin;
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this document' });
    }
    
    // Soft delete
    document.isDeleted = true;
    document.deletedAt = new Date();
    document.deletedBy = req.user._id;
    await document.save();
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * @desc    Permanently delete a document and its versions
 * @route   DELETE /api/documents/:id/permanent
 * @access  Admins only
 */
export const permanentlyDeleteDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Only admins can permanently delete
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Get all versions to delete physical files
    const versions = await DocumentVersion.find({ document: documentId });
    
    // Delete physical files
    for (const version of versions) {
      if (version.fileInfo && version.fileInfo.filePath) {
        try {
          await unlinkAsync(version.fileInfo.filePath);
        } catch (unlinkError) {
          console.error(`Failed to delete file for version ${version.versionNumber}:`, unlinkError);
        }
      }
    }
    
    // Delete all document versions
    await DocumentVersion.deleteMany({ document: documentId });
    
    // Delete the document
    await Document.findByIdAndDelete(documentId);
    
    res.json({ message: 'Document permanently deleted' });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * @desc    Restore a soft-deleted document
 * @route   PUT /api/documents/:id/restore
 * @access  Document owners and admins
 */
export const restoreDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    
    const document = await Document.findOne({ 
      _id: documentId,
      isDeleted: true
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Deleted document not found' });
    }
    
    const isOwner = document.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.isAdmin;
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to restore this document' });
    }
    
    // Restore document
    document.isDeleted = false;
    document.deletedAt = null;
    document.deletedBy = null;
    await document.save();
    
    res.json({ message: 'Document restored successfully', document });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * @desc    Upload a new version of a document
 * @route   POST /api/documents/:id/versions
 * @access  Document owners and editors
 */
export const uploadNewVersion = [
  upload.single('file'),
  async (req, res) => {
    try {
      const documentId = req.params.id;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Check write access
      await checkDocumentAccess(req.user._id, documentId, 'write');
      
      // Create file info object
      const fileInfo = {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        fileSize: req.file.size,
        filePath: req.file.path,
        fileType: req.file.mimetype,
        uploadDate: new Date(),
        storageProvider: 'local',
        storagePath: req.file.path,
        checksum: req.file.checksum || ''
      };
      
      // Create new version
      const version = await DocumentVersion.createNewVersion({
        documentId,
        fileInfo,
        userId: req.user._id,
        changeDescription: req.body.changeDescription || '',
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
      });
      
      // Return version with populated fields
      const populatedVersion = await DocumentVersion.findById(version._id)
        .populate('createdBy', 'name email');
      
      res.status(201).json(populatedVersion);
    } catch (error) {
      // Delete uploaded file if an error occurs
      if (req.file && req.file.path) {
        try {
          await unlinkAsync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting file after failed upload:', unlinkError);
        }
      }
      
      handleError(res, error);
    }
  }
];

/**
 * @desc    Get all versions of a document
 * @route   GET /api/documents/:id/versions
 * @access  Users with access to the document
 */
export const getDocumentVersions = async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Check read access
    await checkDocumentAccess(req.user._id, documentId);
    
    // Get all versions
    const versions = await DocumentVersion.getVersionsForDocument(documentId);
    
    res.json(versions);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * @desc    Get a specific version of a document
 * @route   GET /api/documents/:id/versions/:versionNumber
 * @access  Users with access to the document
 */
export const getDocumentVersion = async (req, res) => {
  try {
    const { id: documentId, versionNumber } = req.params;
    
    // Check read access
    await checkDocumentAccess(req.user._id, documentId);
    
    // Get version
    const version = await DocumentVersion.findOne({
      document: documentId,
      versionNumber: versionNumber
    }).populate('createdBy', 'name email');
    
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    res.json(version);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * @desc    Set a specific version as the current version
 * @route   PUT /api/documents/:id/versions/:versionNumber/current
 * @access  Document owners and editors
 */
export const setVersionAsCurrent = async (req, res) => {
  try {
    const { id: documentId, versionNumber } = req.params;
    
    // Check write access
    await checkDocumentAccess(req.user._id, documentId, 'write');
    
    // Find the version
    const version = await DocumentVersion.findOne({
      document: documentId,
      versionNumber: parseInt(versionNumber)
    });
    
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    // Set as current
    await version.setAsCurrent();
    
    res.json({ message: 'Version set as current', version });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * @desc    Download a document version
 * @route   GET /api/documents/:id/versions/:versionNumber/download
 * @access  Users with access to the document
 */
export const downloadDocumentVersion = async (req, res) => {
  try {
    const { id: documentId, versionNumber } = req.params;
    
    // Check read access
    await checkDocumentAccess(req.user._id, documentId);
    
    // Find the version
    const version = await DocumentVersion.findOne({
      document: documentId,
      versionNumber: parseInt(versionNumber)
    });
    
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    // Verify the file exists
    if (!version.fileInfo || !version.fileInfo.filePath) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const filePath = version.fileInfo.filePath;
    
    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Physical file not found' });
    }
    
    // Set filename for download
    const originalName = version.fileInfo.originalName || `document-${documentId}-v${versionNumber}`;
    
    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.setHeader('Content-Type', version.fileInfo.fileType || 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * @desc    Share a document with other users
 * @route   POST /api/documents/:id/share
 * @access  Document owners
 */
export const shareDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Check if document exists and user is the owner
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const isOwner = document.createdBy.toString() === req.user._id.toString();
    
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only document owners can share' });
    }
    
    const { users, accessLevel = 'read', expiresAt = null } = req.body;
    
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ error: 'Users array is required' });
    }
    
    // Share with each user
    for (const userId of users) {
      await document.shareWith(userId, accessLevel, expiresAt);
    }
    
    // Get updated document
    const updatedDocument = await Document.findById(documentId)
      .populate('sharedWith.user', 'name email');
    
    res.json({
      message: 'Document shared successfully',
      sharedWith: updatedDocument.sharedWith
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * @desc    Revoke access to a document
 * @route   DELETE /api/documents/:id/share/:userId
 * @access  Document owners
 */
export const revokeAccess = async (req, res) => {
  try {
    const { id: documentId, userId } = req.params;
    
    // Check if document exists and user is the owner
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const isOwner = document.createdBy.toString() === req.user._id.toString();
    
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only document owners can revoke access' });
    }
    
    // Revoke access
    await document.revokeAccess(userId);
    
    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * @desc    Get document statistics
 * @route   GET /api/documents/stats
 * @access  Admin
 */
export const getDocumentStats = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const stats = {
      total: await Document.countDocuments({}),
      active: await Document.countDocuments({ isDeleted: false }),
      deleted: await Document.countDocuments({ isDeleted: true }),
      byType: await Document.aggregate([
        { $group: { _id: '$documentType', count: { $sum: 1 } } }
      ]),
      byAccessLevel: await Document.aggregate([
        { $group: { _id: '$accessLevel', count: { $sum: 1 } } }
      ]),
      byLanguage: await Document.aggregate([
        { $group: { _id: '$language', count: { $sum: 1 } } }
      ]),
      storage: {
        total: 0,
        byType: {}
      }
    };
    
    // Calculate storage usage
    const versions = await DocumentVersion.aggregate([
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$fileInfo.fileSize' }
        }
      }
    ]);
    
    if (versions.length > 0) {
      stats.storage.total = versions[0].totalSize;
    }
    
    // Storage by file type
    const storageByType = await DocumentVersion.aggregate([
      {
        $group: {
          _id: '$fileInfo.fileType',
          totalSize: { $sum: '$fileInfo.fileSize' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    storageByType.forEach(type => {
      stats.storage.byType[type._id] = {
        size: type.totalSize,
        count: type.count
      };
    });
    
    res.json(stats);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * @desc    Search documents
 * @route   GET /api/documents/search
 * @access  Authenticated users
 */
export const searchDocuments = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Build search criteria
    const searchQuery = {
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ],
      isDeleted: false
    };
    
    // If not admin, restrict to documents user has access to
    if (!req.user.isAdmin) {
      const documents = await Document.findAvailableToUser(
        req.user._id,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          filter: searchQuery
        }
      );
      
      return res.json(documents);
    }
    
    // Admin search
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'createdBy', select: 'name email' },
        { path: 'currentVersion' },
        { path: 'project', select: 'name' }
      ]
    };
    
    const documents = await Document.paginate(searchQuery, options);
    
    res.json(documents);
  } catch (error) {
    handleError(res, error);
  }
};

export default {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  permanentlyDeleteDocument,
  restoreDocument,
  uploadNewVersion,
  getDocumentVersions,
  getDocumentVersion,
  setVersionAsCurrent,
  downloadDocumentVersion,
  shareDocument,
  revokeAccess,
  getDocumentStats,
  searchDocuments
}; 