import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  clientName: String,
  clientEmail: String,
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number
  }],
  subtotal: Number,
  tax: Number,
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  status: {
    type: String,
    enum: ['kiállított', 'fizetett', 'késedelmes', 'törölt', 'issued', 'paid', 'overdue', 'canceled', 'bezahlt', 'ausgestellt', 'überfällig', 'storniert'],
    default: 'kiállított'
  },
  notes: String,
  paidDate: Date,
  paidAmount: Number,
  paymentMethod: String,
  paymentReference: String,
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('Invoice', InvoiceSchema);