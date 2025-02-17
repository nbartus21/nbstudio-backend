import mongoose from 'mongoose';

const hostingSchema = new mongoose.Schema({
  // Ügyfél adatok
  client: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    company: String,
    vatNumber: String
  },
  
  // Csomag adatok
  plan: {
    type: { type: String, enum: ['regular', 'reseller'], required: true },
    name: { type: String, required: true },
    billing: { type: String, enum: ['monthly', 'annual'], required: true },
    price: { type: Number, required: true },
    storage: Number,
    bandwidth: Number,
    domains: Number,
    databases: Number,
    accounts: Number  // reseller csomagoknál
  },
  
  // Fizetési adatok
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
  
  // Szolgáltatás adatok
  service: {
    status: { 
      type: String, 
      enum: ['pending', 'active', 'suspended', 'cancelled'],
      default: 'pending'
    },
    startDate: Date,
    endDate: Date,
    domainName: String,
    serverIp: String,
    cpanelUsername: String
  },
  
  // Rendszer adatok
  status: {  // A teljes rendelés státusza
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

// Automatikus updatedAt frissítés
hostingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Hosting', hostingSchema);