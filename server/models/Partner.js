import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
  name: {
    de: String,
    en: String,
    hu: String
  },
  description: {
    de: String,
    en: String,
    hu: String
  },
  link: String,
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

partnerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Partner', partnerSchema);