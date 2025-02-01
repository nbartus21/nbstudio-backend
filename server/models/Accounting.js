import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['purchase', 'rental', 'subscription', 'license'],
    required: true
  },
  amount: { type: Number, required: true },
  purchaseDate: { type: Date, required: true },
  description: String,
  depreciationYears: { type: Number, default: 3 }, // Alapértelmezett értékcsökkenési időszak
  category: {
    type: String,
    enum: ['software', 'hardware', 'office', 'education', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'deprecated'],
    default: 'active'
  },
  recurring: { type: Boolean, default: false }, // Ismétlődő költség-e (pl. előfizetések)
  recurringPeriod: { // Ismétlődési periódus
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', 'none'],
    default: 'none'
  },
  nextPaymentDate: Date,
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  taxDeductible: { type: Boolean, default: true }, // Leírható-e az adóból
  taxCategory: String, // Adózási kategória
  notes: String
});

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  category: {
    type: String,
    enum: ['office', 'travel', 'education', 'marketing', 'utilities', 'other'],
    required: true
  },
  taxDeductible: { type: Boolean, default: true },
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  notes: String
});

const accountingSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  assets: [assetSchema],
  expenses: [expenseSchema],
  summary: {
    totalIncome: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    taxableIncome: { type: Number, default: 0 },
    taxDeductions: { type: Number, default: 0 },
    estimatedTax: { type: Number, default: 0 }
  },
  taxSettings: {
    taxRate: { type: Number, default: 0.27 }, // 27% alapértelmezett adókulcs
    vatRate: { type: Number, default: 0.27 }, // 27% ÁFA
    currency: { type: String, default: 'EUR' }
  },
  lastCalculated: { type: Date, default: Date.now },
  notes: String
}, {
  timestamps: true
});

// Automatikus számítások mentés előtt
accountingSchema.pre('save', function(next) {
  // Összegzések frissítése
  this.summary.totalExpenses = this.expenses.reduce((sum, exp) => sum + exp.amount, 0) +
    this.assets.reduce((sum, asset) => {
      if (asset.recurring) {
        // Ismétlődő költségek éves összege
        const annualCost = asset.amount * (asset.recurringPeriod === 'monthly' ? 12 : 
                                         asset.recurringPeriod === 'quarterly' ? 4 : 1);
        return sum + annualCost;
      }
      // Egyszeri költségek esetén az értékcsökkenést számoljuk
      const depreciation = asset.amount / (asset.depreciationYears || 3);
      return sum + depreciation;
    }, 0);

  // Adóalap számítása
  this.summary.taxableIncome = this.summary.totalIncome - this.summary.totalExpenses;
  
  // Becsült adó számítása
  this.summary.estimatedTax = Math.max(0, this.summary.taxableIncome * this.taxSettings.taxRate);
  
  this.lastCalculated = new Date();
  next();
});

export default mongoose.model('Accounting', accountingSchema);