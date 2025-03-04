import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  tags: [String],
  category: { 
    type: String, 
    enum: ['general', 'fordítás', 'nyelvi', 'szakszótár', 'projekt', 'ügyfél', 'other'],
    default: 'general'
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
noteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexek a gyorsabb kereséshez
noteSchema.index({ title: 'text', content: 'text' });
noteSchema.index({ tags: 1 });
noteSchema.index({ category: 1 });
noteSchema.index({ createdAt: -1 });
noteSchema.index({ createdBy: 1 });

export default mongoose.model('Note', noteSchema);