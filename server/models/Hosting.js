import mongoose from 'mongoose';

const hostingSchema = new mongoose.Schema({
  client: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    company: String,
    vatNumber: String,
    address: {
      street: String,
      city: String,
      postcode: String,
      country: { type: String, default: 'DE' }
    }
  },
  
  plan: {
    type: { type: String, enum: ['regular', 'reseller'], required: true },
    name: { type: String, required: true },
    billing: { type: String, enum: ['monthly', 'annual'], required: true },
    price: { type: Number, required: true },
    storage: Number,
    bandwidth: Number,
    domains: Number,
    databases: Number,
    accounts: Number
  },
  
  payment: {
    status: { 
      type: String, 
      enum: ['pending', 'paid', 'cancelled', 'refunded'],
      default: 'pending'
    },
    method: String,
    transactionId: String,
    paidAt: Date
  },
  
  service: {
    status: { 
      type: String, 
      enum: ['pending', 'active', 'suspended', 'cancelled'],
      default: 'pending'
    },
    startDate: Date,
    endDate: Date,
    domainName: { type: String, required: true },
    domainType: { type: String, enum: ['new', 'transfer'], default: 'new' },
    serverIp: String,
    cpanelUsername: String
  },
  
  status: {
    type: String,
    enum: ['new', 'processing', 'active', 'suspended', 'cancelled'],
    default: 'new'
  },
  notes: [{
    content: String,
    addedBy: String,
    addedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

hostingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Hosting', hostingSchema);