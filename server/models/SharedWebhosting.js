import mongoose from 'mongoose';

const sharedWebhostingSchema = new mongoose.Schema({
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
    },
    language: { type: String, enum: ['en', 'de', 'hu'], default: 'hu' }
  },
  
  hosting: {
    type: { type: String, enum: ['regular', 'reseller'], required: true },
    packageName: { type: String, required: true },
    billing: { type: String, enum: ['monthly', 'annual'], required: true },
    price: { type: Number, required: true },
    domainName: { type: String, required: true },
    startDate: Date,
    endDate: Date,
    cpanelUsername: String,
    cpanelPassword: String
  },
  
  invoices: [{
    number: String,
    date: Date,
    dueDate: Date,
    totalAmount: Number,
    status: { 
      type: String, 
      enum: ['pending', 'paid', 'cancelled', 'refunded'],
      default: 'pending'
    },
    paidDate: Date,
    paidAmount: Number,
    items: [{
      description: String,
      quantity: Number,
      unitPrice: Number,
      total: Number
    }],
    notes: String
  }],
  
  domains: [{
    name: String,
    registrationDate: Date,
    expiryDate: Date,
    autoRenew: { type: Boolean, default: true },
    status: { 
      type: String, 
      enum: ['active', 'pending', 'expired', 'transferred'],
      default: 'active'
    }
  }],
  
  sharing: {
    token: { type: String, required: true, unique: true },
    pin: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  
  notifications: [{
    title: String,
    message: String,
    date: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    type: { 
      type: String, 
      enum: ['system', 'invoice', 'domain', 'hosting'],
      default: 'system'
    }
  }],
  
  status: {
    type: String,
    enum: ['active', 'suspended', 'cancelled'],
    default: 'active'
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Token és PIN generálás új dokumentum létrehozásakor
sharedWebhostingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Ha új dokumentum és nincs még token vagy pin
  if (this.isNew) {
    if (!this.sharing.token) {
      this.sharing.token = generateToken();
    }
    
    if (!this.sharing.pin) {
      this.sharing.pin = generatePin();
    }
  }
  
  next();
});

// Token generáló funkció
function generateToken() {
  const tokenLength = 24;
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  for (let i = 0; i < tokenLength; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return token;
}

// 6 jegyű PIN kód generáló funkció
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default mongoose.model('SharedWebhosting', sharedWebhostingSchema); 