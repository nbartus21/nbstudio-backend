/**
 * Document Share Model
 * 
 * Schema definition for document sharing in the Document Management System.
 */

import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const documentShareSchema = new mongoose.Schema({
  // Reference to the shared document
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  
  // Unique token for the share link
  token: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  // Share creator
  createdBy: {
    type: String,
    required: true
  },
  
  // Share recipient (optional)
  recipient: {
    email: String,
    name: String,
    organization: String,
    sentAt: Date
  },
  
  // Share settings
  settings: {
    // Validity
    expiresAt: Date,
    
    // Access count limit
    maxAccesses: {
      type: Number,
      default: null // null means unlimited
    },
    
    // Permissions
    permissions: {
      type: String,
      enum: ['view', 'comment', 'edit'],
      default: 'view'
    },
    
    // Watermarking
    enableWatermark: {
      type: Boolean,
      default: true
    },
    watermarkText: {
      type: String,
      default: 'Confidential'
    },
    
    // Download permissions
    allowDownload: {
      type: Boolean,
      default: false
    },
    
    // Print permissions
    allowPrint: {
      type: Boolean,
      default: false
    }
  },
  
  // PIN protection
  requirePin: {
    type: Boolean,
    default: false
  },
  pin: {
    type: String, // Hashed PIN
    select: false // Not included in query results by default
  },
  
  // Share statistics
  stats: {
    accessCount: {
      type: Number,
      default: 0
    },
    lastAccessedAt: Date,
    lastAccessedBy: String,
    accessLog: [{
      timestamp: { type: Date, default: Date.now },
      ipAddress: String,
      userAgent: String
    }]
  },
  
  // Share status
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active'
  },
  
  // Revocation details
  revocation: {
    revokedAt: Date,
    revokedBy: String,
    reason: String
  }
}, {
  timestamps: true
});

// Indexes for performance
documentShareSchema.index({ documentId: 1 });
documentShareSchema.index({ token: 1 }, { unique: true });
documentShareSchema.index({ 'settings.expiresAt': 1 });
documentShareSchema.index({ status: 1 });

// Check if the share link is still valid
documentShareSchema.methods.isValid = function() {
  // Check if status is active
  if (this.status !== 'active') {
    return false;
  }
  
  // Check expiration
  if (this.settings.expiresAt && new Date() > this.settings.expiresAt) {
    // Auto-update status to expired
    this.status = 'expired';
    this.save();
    return false;
  }
  
  // Check access count limit
  if (this.settings.maxAccesses && this.stats.accessCount >= this.settings.maxAccesses) {
    // Auto-update status to expired
    this.status = 'expired';
    this.save();
    return false;
  }
  
  return true;
};

// Record an access to the shared document
documentShareSchema.methods.recordAccess = async function(accessInfo = {}) {
  // Update stats
  this.stats.accessCount += 1;
  this.stats.lastAccessedAt = new Date();
  this.stats.lastAccessedBy = accessInfo.userIdentifier || 'anonymous';
  
  // Add to access log
  this.stats.accessLog.push({
    timestamp: new Date(),
    ipAddress: accessInfo.ipAddress,
    userAgent: accessInfo.userAgent
  });
  
  // Save and return the updated document
  return this.save();
};

// Revoke share link
documentShareSchema.methods.revoke = async function(revokedBy, reason = 'Manually revoked') {
  this.status = 'revoked';
  this.revocation = {
    revokedAt: new Date(),
    revokedBy,
    reason
  };
  
  return this.save();
};

const DocumentShare = mongoose.model('DocumentShare', documentShareSchema);

export default DocumentShare; 