import mongoose from 'mongoose';

const accountingSchema = new mongoose.Schema({
  // Alap adatok
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  category: {
    type: String,
    enum: ['project_invoice', 'server_cost', 'license_cost', 'education', 'software', 'service', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  date: {
    type: Date,
    required: true
  },
  description: String,
  
  // Számlázási adatok
  invoiceNumber: String,
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'overdue', 'cancelled'],
    default: 'pending'
  },
  dueDate: Date,

  // Kapcsolódó elemek
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server'
  },
  licenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'License'
  },

  // Ismétlődő költség beállításai
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringInterval: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  nextRecurringDate: Date,

  // Adózási információk
  taxDeductible: {
    type: Boolean,
    default: false
  },
  taxCategory: String,
  taxPercentage: Number,

  // Metaadatok
  notes: String,
  attachments: [{
    name: String,
    url: String,
    uploadDate: Date
  }],
  createdBy: String,
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Frissítési dátum automatikus beállítása
accountingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual mező a teljes összeghez (adóval)
accountingSchema.virtual('totalAmount').get(function() {
  if (!this.taxPercentage) return this.amount;
  return this.amount * (1 + this.taxPercentage / 100);
});

// Keresési indexek
accountingSchema.index({ type: 1, date: -1 });
accountingSchema.index({ category: 1 });
accountingSchema.index({ paymentStatus: 1 });
accountingSchema.index({ projectId: 1 });
accountingSchema.index({ isRecurring: 1, nextRecurringDate: 1 });

export default mongoose.model('Accounting', accountingSchema);