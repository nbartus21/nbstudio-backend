import mongoose from 'mongoose';

const websiteContentSchema = new mongoose.Schema({
  page: {
    type: String,
    required: true,
    enum: ['cookies', 'privacy', 'terms', 'imprint'],
    unique: true
  },
  content: {
    de: {
      type: Object,
      default: {}
    },
    en: {
      type: Object,
      default: {}
    },
    hu: {
      type: Object,
      default: {}
    }
  },
  active: {
    type: Boolean,
    default: true
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

websiteContentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('WebsiteContent', websiteContentSchema);