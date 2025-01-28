import mongoose from 'mongoose';

const calculatorSchema = new mongoose.Schema({
  email: { type: String, required: true },
  projectDescription: String,
  projectType: { 
    type: String, 
    enum: ['wordpress', 'fullstack'], 
    required: true 
  },
  complexity: { 
    type: String, 
    enum: ['simple', 'medium', 'complex'], 
    required: true 
  },
  features: [String],
  urgentDelivery: { type: Boolean, default: false },
  maintenance: { type: Boolean, default: false },
  estimatedCost: {
    minCost: Number,
    maxCost: Number,
    hourlyMin: Number,
    hourlyMax: Number,
    hours: Number
  },
  breakdown: {
    development: {
      hours: Number,
      cost: {
        min: Number,
        max: Number
      }
    },
    features: {
      hours: Number,
      cost: {
        min: Number,
        max: Number
      }
    },
    urgency: {
      cost: {
        min: Number,
        max: Number
      }
    },
    maintenance: {
      monthly: {
        min: Number,
        max: Number
      }
    }
  },
  status: {
    type: String,
    enum: ['new', 'in-progress', 'completed', 'cancelled'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  notes: [{
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Calculator', calculatorSchema);