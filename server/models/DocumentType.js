/**
 * DocumentType Model
 * 
 * Schema for defining different document types in the Document Management System.
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const DocumentTypeSchema = new Schema({
  // Document type name
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  // Description of this document type
  description: {
    type: String,
    trim: true
  },
  // Icon identifier for UI display
  icon: {
    type: String,
    default: 'document'
  },
  // Document category for grouping
  category: {
    type: String,
    trim: true,
    default: 'General'
  },
  // Metadata fields specific to this document type
  metadataSchema: [{
    fieldName: { type: String, required: true },
    fieldType: { 
      type: String, 
      enum: ['string', 'number', 'date', 'boolean', 'select'], 
      required: true 
    },
    required: { type: Boolean, default: false },
    options: [String], // For select field type
    defaultValue: Schema.Types.Mixed
  }],
  // Workflow configuration
  workflow: {
    type: Schema.Types.ObjectId,
    ref: 'Workflow'
  },
  // Retention policy (in days, 0 = indefinite)
  retentionPeriod: {
    type: Number,
    default: 0
  },
  // Audit fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  // Active status
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

// Pre-save hook to normalize category
DocumentTypeSchema.pre('save', function(next) {
  if (this.category) {
    this.category = this.category.charAt(0).toUpperCase() + this.category.slice(1).toLowerCase();
  }
  next();
});

// Indexes for better query performance
DocumentTypeSchema.index({ name: 1 }, { unique: true });
DocumentTypeSchema.index({ category: 1 });
DocumentTypeSchema.index({ isActive: 1 });

export default mongoose.model('DocumentType', DocumentTypeSchema); 