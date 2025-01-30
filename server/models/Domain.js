import mongoose from 'mongoose';

const domainSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true 
  },
  registrar: { 
    type: String, 
    required: true 
  },
  expiryDate: { 
    type: Date, 
    required: true 
  },
  cost: { 
    type: Number, 
    required: true 
  },
  autoRenewal: { 
    type: Boolean, 
    default: false 
  },
  notes: String,
  status: {
    type: String,
    enum: ['active', 'expired', 'pending'],
    default: 'active'
  },
  lastChecked: { 
    type: Date, 
    default: Date.now 
  },
  notifications: [{
    type: {
      type: String,
      enum: ['expiry', 'payment', 'status'],
    },
    message: String,
    date: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }],
  history: [{
    action: String,
    date: { type: Date, default: Date.now },
    details: String
  }],
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
domainSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Domain', domainSchema);