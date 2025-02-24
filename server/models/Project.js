import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  // Projekt alapadatok
  name: { type: String, required: true },
  description: String,
  status: {
    type: String,
    enum: ['aktív', 'befejezett', 'felfüggesztett', 'törölt'],
    default: 'aktív'
  },
  priority: {
    type: String,
    enum: ['alacsony', 'közepes', 'magas'],
    default: 'közepes'
  },
  // Kalkulátor kapcsolat
  calculatorEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Calculator'
  },
  // Ügyfél adatok
  client: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    companyName: String,
    taxNumber: String,
    euVatNumber: String,
    registrationNumber: String,
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: String
    }
  },
  // Pénzügyi adatok
  financial: {
    budget: {
      min: Number,
      max: Number
    },
    totalBilled: { type: Number, default: 0 },
    currency: { type: String, default: 'EUR' }
  },
  // Számlák
  invoices: [{
    number: String,
    date: { type: Date, default: Date.now },
    amount: Number,
    status: {
      type: String,
      enum: ['kiállított', 'fizetett', 'késedelmes', 'törölt'],
      default: 'kiállított'
    },
    dueDate: Date,
    items: [{
      description: String,
      quantity: Number,
      unitPrice: Number,
      total: Number
    }],
    totalAmount: Number,
    paidAmount: { type: Number, default: 0 },
    notes: String
  }],
  // AI elemzések és javaslatok
  aiAnalysis: {
    riskLevel: String,
    nextSteps: [String],
    recommendations: String,
    lastUpdated: Date
  },
  // Projekt mérföldkövek
  milestones: [{
    title: String,
    description: String,
    dueDate: Date,
    completedDate: Date,
    status: {
      type: String,
      enum: ['tervezett', 'folyamatban', 'befejezett', 'késedelmes'],
      default: 'tervezett'
    }
  }],
  // Jegyzetek
  notes: [{
    content: String,
    createdBy: String,
    createdAt: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['általános', 'pénzügyi', 'technikai', 'ügyfél'],
      default: 'általános'
    }
  }],
  // Időbélyegek
  startDate: { type: Date, default: Date.now },
  expectedEndDate: Date,
  actualEndDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Megosztási adatok
  sharing: {
    token: {
      type: String,
      unique: true,
      sparse: true
    },
    pin: {
      type: String,
      sparse: true
    },
    link: String,
    expiresAt: Date,
    createdAt: Date
  }
}, {
  timestamps: true
});

// Update timestamp middleware
projectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Project', projectSchema);