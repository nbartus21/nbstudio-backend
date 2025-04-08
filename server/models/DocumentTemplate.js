import mongoose from 'mongoose';

// Schema for document templates
const documentTemplateSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  type: {
    type: String,
    enum: ['contract', 'proposal', 'invoice', 'projectDoc', 'report', 'other'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  variables: [{
    name: String,
    description: String,
    defaultValue: String
  }],
  language: { 
    type: String,
    enum: ['hu', 'de', 'en'],
    default: 'hu'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  tags: [String],
  createdBy: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Auto-update timestamps
documentTemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Schema for generated documents
const documentSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentTemplate',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  name: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'final', 'archived'],
    default: 'draft'
  },
  createdBy: {
    type: String,
    required: true
  },
  // Sharing information
  sharing: {
    isShared: {
      type: Boolean,
      default: false
    },
    token: String,
    pin: String,
    expiresAt: Date,
    email: String,
    language: {
      type: String,
      enum: ['hu', 'de', 'en'],
      default: 'hu'
    },
    views: {
      type: Number,
      default: 0
    },
    lastViewed: Date
  },
  downloads: {
    type: Number,
    default: 0
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

documentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const DocumentTemplate = mongoose.model('DocumentTemplate', documentTemplateSchema);
export const Document = mongoose.model('Document', documentSchema);