import mongoose from 'mongoose';

const calculatorSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  projectDescription: String,
  projectType: String,
  complexity: String,
  features: [String],
  urgentDelivery: Boolean,
  maintenance: Boolean,
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
  }
}, {
  timestamps: true
});

export default mongoose.model('Calculator', calculatorSchema);