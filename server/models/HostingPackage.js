import mongoose from 'mongoose';

const hostingPackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['regular', 'reseller'],
    required: true
  },
  description: {
    type: Object,
    required: true,
    default: {
      en: '',
      de: '',
      hu: ''
    }
  },
  features: {
    type: Object,
    required: true,
    default: {
      en: [],
      de: [],
      hu: []
    }
  },
  pricing: {
    monthly: {
      type: Number,
      required: true
    },
    annual: {
      type: Number,
      required: true
    }
  },
  resources: {
    storage: {
      type: Number,
      required: true
    },
    bandwidth: {
      type: Number,
      required: true
    },
    domains: {
      type: Number,
      required: true
    },
    databases: {
      type: Number,
      required: true
    },
    accounts: {
      type: Number,
      default: 1
    }
  },
  whmcsProductId: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

hostingPackageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('HostingPackage', hostingPackageSchema);