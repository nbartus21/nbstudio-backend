import mongoose from 'mongoose';

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
  sections: [{
    title: String,
    content: String,
    isOptional: Boolean,
    defaultIncluded: { type: Boolean, default: true }
  }],
  styling: {
    fontFamily: { type: String, default: 'Arial' },
    fontSize: { type: Number, default: 11 },
    primaryColor: { type: String, default: '#3B82F6' },
    secondaryColor: { type: String, default: '#F3F4F6' },
    includeLogo: { type: Boolean, default: true }
  },
  letterhead: {
    enabled: { type: Boolean, default: true },
    content: String
  },
  footer: {
    enabled: { type: Boolean, default: true },
    content: String
  },
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
  usageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: String,
    required: true
  },
  lastUsedAt: Date,
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

// Automatikus updatedAt frissítés
documentTemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generált dokumentumok model
const generatedDocumentSchema = new mongoose.Schema({
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
  htmlVersion: {
    type: String
  },
  pdfUrl: {
    type: String
  },
  generatedBy: {
    type: String,
    required: true
  },
  approvalStatus: {
    type: String,
    enum: ['draft', 'pendingApproval', 'approved', 'rejected', 'sent', 'clientApproved', 'clientRejected'],
    default: 'draft'
  },
  approvedBy: {
    type: String
  },
  approvedAt: {
    type: Date
  },
  sentTo: {
    type: String
  },
  sentAt: {
    type: Date
  },
  comments: [{
    user: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
  }],
  version: {
    type: Number,
    default: 1
  },
  // Ügyfél jóváhagyási link mezők
  publicToken: {
    type: String,
    unique: true,
    sparse: true
  },
  publicViewExpires: {
    type: Date
  },
  clientApprovedAt: {
    type: Date
  },
  clientRejectedAt: {
    type: Date
  },
  clientApprovalComment: {
    type: String
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

generatedDocumentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const DocumentTemplate = mongoose.model('DocumentTemplate', documentTemplateSchema);
export const GeneratedDocument = mongoose.model('GeneratedDocument', generatedDocumentSchema);