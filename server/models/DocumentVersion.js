/**
 * DocumentVersion Model
 * Represents a version of a document in the document management system
 */

import mongoose from 'mongoose';

const DocumentVersionSchema = new mongoose.Schema({
  // Parent document reference
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  
  // Version metadata
  versionNumber: {
    type: Number,
    required: true,
    min: 1
  },
  
  // File information
  fileInfo: {
    originalName: String,
    fileName: String,
    fileSize: Number,
    filePath: String,
    fileType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    storageProvider: {
      type: String,
      enum: ['local', 's3', 'azure', 'gcp'],
      default: 'local'
    },
    storagePath: String,
    checksum: String
  },
  
  // Audit information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Version notes
  changeDescription: {
    type: String,
    trim: true
  },
  
  // Status flags
  isCurrent: {
    type: Boolean,
    default: false
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for common queries
DocumentVersionSchema.index({ document: 1, versionNumber: 1 }, { unique: true });
DocumentVersionSchema.index({ document: 1, createdAt: -1 });
DocumentVersionSchema.index({ createdBy: 1 });
DocumentVersionSchema.index({ document: 1, isCurrent: 1 });

// Virtuals
DocumentVersionSchema.virtual('downloadUrl').get(function() {
  return `/api/documents/${this.document}/versions/${this.versionNumber}/download`;
});

DocumentVersionSchema.virtual('viewUrl').get(function() {
  return `/api/documents/${this.document}/versions/${this.versionNumber}/view`;
});

DocumentVersionSchema.virtual('isLatest').get(function() {
  return this.isCurrent;
});

// Statics
DocumentVersionSchema.statics.getVersionsForDocument = async function(documentId, options = {}) {
  const { sort = { versionNumber: -1 } } = options;
  
  return this.find({ document: documentId })
    .sort(sort)
    .populate('createdBy', 'name email')
    .exec();
};

DocumentVersionSchema.statics.getLatestVersion = async function(documentId) {
  return this.findOne({ document: documentId, isCurrent: true })
    .populate('createdBy', 'name email')
    .exec();
};

DocumentVersionSchema.statics.createNewVersion = async function(documentData) {
  const {
    documentId,
    fileInfo,
    userId,
    changeDescription = '',
    metadata = {}
  } = documentData;
  
  // Get current highest version number
  const highestVersion = await this.findOne(
    { document: documentId },
    { versionNumber: 1 },
    { sort: { versionNumber: -1 } }
  );
  
  const nextVersionNumber = highestVersion ? highestVersion.versionNumber + 1 : 1;
  
  // Set all previous versions as not current
  await this.updateMany(
    { document: documentId },
    { isCurrent: false }
  );
  
  // Create new version
  const newVersion = await this.create({
    document: documentId,
    versionNumber: nextVersionNumber,
    fileInfo,
    createdBy: userId,
    changeDescription,
    metadata,
    isCurrent: true
  });
  
  // Update document with new current version and increment version count
  const Document = mongoose.model('Document');
  await Document.findByIdAndUpdate(documentId, {
    currentVersion: newVersion._id,
    versionCount: nextVersionNumber,
    updatedAt: new Date()
  });
  
  return newVersion;
};

// Methods
DocumentVersionSchema.methods.setAsCurrent = async function() {
  // Set all versions of this document as not current
  await this.model('DocumentVersion').updateMany(
    { document: this.document },
    { isCurrent: false }
  );
  
  // Set this version as current
  this.isCurrent = true;
  await this.save();
  
  // Update document with this version as current
  const Document = mongoose.model('Document');
  await Document.findByIdAndUpdate(this.document, {
    currentVersion: this._id,
    updatedAt: new Date()
  });
  
  return this;
};

// Create and export the model
const DocumentVersion = mongoose.model('DocumentVersion', DocumentVersionSchema);

export default DocumentVersion; 