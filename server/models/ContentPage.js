import mongoose from 'mongoose';

const contentPageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    enum: ['terms', 'privacy', 'cookies', 'imprint']
  },
  content: {
    type: Map,
    of: String,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add a pre-save hook to update lastUpdated timestamp
contentPageSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

const ContentPage = mongoose.model('ContentPage', contentPageSchema);

export default ContentPage;
