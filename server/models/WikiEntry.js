// server/models/WikiEntry.js
import mongoose from 'mongoose';

// Define Wiki Entry Schema with multi-language support
const wikiEntrySchema = new mongoose.Schema({
  title: {
    en: { type: String, required: true },
    hu: { type: String, required: true },
    de: { type: String, required: true }
  },
  content: {
    en: { type: String, required: true },
    hu: { type: String, required: true },
    de: { type: String, required: true }
  },
  keywords: {
    en: [{ type: String }],
    hu: [{ type: String }],
    de: [{ type: String }]
  },
  category: {
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
  },
  createdBy: {
    type: String,
    required: true
  }
});

// Add text indexes for searching
wikiEntrySchema.index({ 'title.en': 'text', 'content.en': 'text', 'keywords.en': 'text' });
wikiEntrySchema.index({ 'title.hu': 'text', 'content.hu': 'text', 'keywords.hu': 'text' });
wikiEntrySchema.index({ 'title.de': 'text', 'content.de': 'text', 'keywords.de': 'text' });

// Create model if not exists
let WikiEntry;
try {
  WikiEntry = mongoose.model('WikiEntry');
} catch (error) {
  WikiEntry = mongoose.model('WikiEntry', wikiEntrySchema);
}

export default WikiEntry;