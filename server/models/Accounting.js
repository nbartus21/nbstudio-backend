import mongoose from 'mongoose';

const accountingSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['servers', 'licenses', 'equipment', 'subscriptions', 'education', 'software', 'rent', 'other'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
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
  recurring: {
    type: Boolean,
    default: false
  },
  interval: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: function() { return this.recurring; }
  },
  // For equipment and assets
  asset: {
    purchasePrice: Number,
    depreciationYears: Number,
    depreciationStart: Date,
    residualValue: Number
  },
  // For tax purposes
  taxDeductible: {
    type: Boolean,
    default: false
  },
  taxCategory: String,
  invoiceNumber: String,
  attachments: [{
    filename: String,
    url: String,
    uploadDate: Date
  }],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp middleware
accountingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to calculate current depreciation value
accountingSchema.methods.getCurrentValue = function() {
  if (!this.asset || !this.asset.purchasePrice) return null;

  const now = new Date();
  const start = new Date(this.asset.depreciationStart);
  const yearsPassed = (now - start) / (1000 * 60 * 60 * 24 * 365);
  
  if (yearsPassed >= this.asset.depreciationYears) {
    return this.asset.residualValue;
  }

  const totalDepreciation = this.asset.purchasePrice - this.asset.residualValue;
  const yearlyDepreciation = totalDepreciation / this.asset.depreciationYears;
  const currentValue = this.asset.purchasePrice - (yearlyDepreciation * yearsPassed);

  return Math.max(currentValue, this.asset.residualValue);
};

export default mongoose.model('Accounting', accountingSchema);