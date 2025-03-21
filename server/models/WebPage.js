import mongoose from 'mongoose';

const webPageSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    de: { type: String, required: true },
    en: { type: String, required: true },
    hu: { type: String, required: true }
  },
  content: {
    de: { type: String, required: true },
    en: { type: String, required: true },
    hu: { type: String, required: true }
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

webPageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('WebPage', webPageSchema);