import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  sourceText: { 
    type: String, 
    required: true 
  },
  targetText: { 
    type: String, 
    required: true 
  },
  sourceLanguage: { 
    type: String, 
    required: true,
    enum: ['hu', 'de', 'en'],
    default: 'hu'
  },
  targetLanguage: { 
    type: String, 
    required: true,
    enum: ['hu', 'de', 'en'],
    default: 'de'
  },
  category: { 
    type: String, 
    enum: ['email', 'invoice', 'project', 'legal', 'marketing', 'other'],
    default: 'email'
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
templateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexek a gyorsabb kereséshez
templateSchema.index({ name: 'text', description: 'text', sourceText: 'text', targetText: 'text' });
templateSchema.index({ sourceLanguage: 1, targetLanguage: 1 });
templateSchema.index({ category: 1 });
templateSchema.index({ createdAt: -1 });
templateSchema.index({ usageCount: -1 });

export default mongoose.model('Template', templateSchema);