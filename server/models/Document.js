/**
 * Document Model
 * Represents a document in the document management system
 */

import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const DocumentSchema = new mongoose.Schema({
  // Basic information
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Classification and organization
  documentType: {
    type: String,
    enum: ['contract', 'invoice', 'report', 'form', 'memo', 'letter', 'policy', 'manual', 'other'],
    default: 'other',
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // File and content information
  fileInfo: {
    originalName: String,
    fileName: String,
    fileSize: Number,
    filePath: String,
    fileType: String,
    uploadDate: Date,
    storageProvider: {
      type: String,
      enum: ['local', 's3', 'azure', 'gcp'],
      default: 'local'
    },
    storagePath: String
  },
  
  // Version control
  currentVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentVersion'
  },
  versionCount: {
    type: Number,
    default: 1
  },
  
  // Status and dates
  status: {
    type: String,
    enum: ['draft', 'active', 'archived', 'under_review', 'expired'],
    default: 'active',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Ownership and permissions
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  accessLevel: {
    type: String,
    enum: ['private', 'shared', 'public', 'restricted'],
    default: 'private',
    index: true
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    accessLevel: {
      type: String,
      enum: ['view', 'edit', 'admin'],
      default: 'view'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date
  }],
  
  // Lifecycle management
  expiresAt: Date,
  retentionPeriod: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'months', 'years'],
      default: 'years'
    }
  },
  
  // Metadata and tracking
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Soft delete functionality
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Language support
  language: {
    type: String,
    default: 'hu',
    enum: ['en', 'hu', 'de', 'fr', 'es'],
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for common queries
DocumentSchema.index({ title: 'text', description: 'text', tags: 'text' });
DocumentSchema.index({ createdAt: -1 });
DocumentSchema.index({ status: 1, isDeleted: 1 });
DocumentSchema.index({ project: 1, isDeleted: 1 });
DocumentSchema.index({ 'sharedWith.user': 1 });

// Plugins
DocumentSchema.plugin(mongoosePaginate);

// Virtuals
DocumentSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

DocumentSchema.virtual('shareCount').get(function() {
  return this.sharedWith ? this.sharedWith.length : 0;
});

// Methods
DocumentSchema.methods.canBeAccessedBy = function(userId) {
  // Owner has full access
  if (this.createdBy.toString() === userId.toString()) {
    return true;
  }
  
  // Check if shared with this user
  const shareEntry = this.sharedWith.find(entry => 
    entry.user.toString() === userId.toString() && 
    (!entry.expiresAt || new Date() < entry.expiresAt)
  );
  
  return !!shareEntry;
};

DocumentSchema.methods.getAccessLevelForUser = function(userId) {
  // Owner has admin access
  if (this.createdBy.toString() === userId.toString()) {
    return 'admin';
  }
  
  // Check if shared with this user
  const shareEntry = this.sharedWith.find(entry => 
    entry.user.toString() === userId.toString() && 
    (!entry.expiresAt || new Date() < entry.expiresAt)
  );
  
  return shareEntry ? shareEntry.accessLevel : null;
};

DocumentSchema.methods.shareWithUser = function(userId, accessLevel = 'view', expiresAt = null) {
  // Check if already shared
  const existingIndex = this.sharedWith.findIndex(s => s.user.toString() === userId.toString());
  
  if (existingIndex >= 0) {
    // Update existing share
    this.sharedWith[existingIndex].accessLevel = accessLevel;
    this.sharedWith[existingIndex].sharedAt = new Date();
    this.sharedWith[existingIndex].expiresAt = expiresAt;
  } else {
    // Add new share
    this.sharedWith.push({
      user: userId,
      accessLevel,
      sharedAt: new Date(),
      expiresAt
    });
  }
  
  return this;
};

DocumentSchema.methods.revokeAccessForUser = function(userId) {
  this.sharedWith = this.sharedWith.filter(s => s.user.toString() !== userId.toString());
  return this;
};

// Statics
DocumentSchema.statics.findAvailableForUser = async function(userId, options = {}) {
  const { page = 1, limit = 10, sort = { createdAt: -1 }, query = {} } = options;
  
  // Base query
  const baseQuery = { 
    ...query,
    isDeleted: false,
    $or: [
      { createdBy: userId },
      { 'sharedWith.user': userId }
    ]
  };
  
  // Find with pagination
  return this.paginate(baseQuery, {
    page,
    limit,
    sort,
    populate: ['createdBy', 'project', 'currentVersion']
  });
};

// Hook: Pre-save update timestamps
DocumentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Hook: Pre-find/findOne to exclude deleted by default
DocumentSchema.pre(/^find/, function(next) {
  // Include deleted if explicitly asked for
  if (this.getQuery().__includeDeleted) {
    delete this.getQuery().__includeDeleted;
  } else {
    // By default, exclude deleted
    this.where({ isDeleted: false });
  }
  next();
});

// Create and export the model
const Document = mongoose.model('Document', DocumentSchema);

export default Document; 