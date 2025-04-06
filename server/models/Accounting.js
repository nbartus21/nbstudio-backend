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

// Indexek a gyakran használt lekérdezési mezőkhöz
accountingSchema.index({ date: -1 }); // Dátum szerinti rendezés
accountingSchema.index({ type: 1, date: -1 }); // Típus és dátum szerinti szűrés
accountingSchema.index({ category: 1, date: -1 }); // Kategória és dátum szerinti szűrés
accountingSchema.index({ paymentStatus: 1 }); // Fizetési státusz szerinti szűrés
accountingSchema.index({ projectId: 1 }); // Projekt szerinti szűrés
accountingSchema.index({ serverId: 1 }); // Szerver szerinti szűrés
accountingSchema.index({ licenseId: 1 }); // Licensz szerinti szűrés
accountingSchema.index({ isRecurring: 1, nextRecurringDate: 1 }); // Ismétlődő tranzakciók szűrése
accountingSchema.index({ category: 1 }); // Kategória szerinti szűrés

export default mongoose.model('Accounting', accountingSchema);