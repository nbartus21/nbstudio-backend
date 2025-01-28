import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  // Alapvető kontakt információk
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },

  // Státusz kezelés
  status: { 
    type: String, 
    enum: ['new', 'in-progress', 'completed'], 
    default: 'new' 
  },

  // AI elemzés eredményei
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  category: { 
    type: String,
    enum: ['support', 'inquiry', 'feedback', 'complaint', 'other'],
    default: 'other'
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },

  // AI által generált tartalom
  summary: String,
  aiSuggestedResponse: String,
  tags: [String],

  // Időbélyegek
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Automatikusan frissítjük az updatedAt mezőt minden módosításnál
contactSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Contact', contactSchema);