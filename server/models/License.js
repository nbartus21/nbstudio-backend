import mongoose from 'mongoose';

const licenseSchema = new mongoose.Schema({
    name: { 
      type: String, 
      required: true 
    },
    type: {
      type: String,
      enum: ['wordpress-plugin', 'wordpress-theme', 'software', 'service'],
      required: true
    },
    key: {
      value: String,
      issuedTo: String
    },
    vendor: {
      name: String,
      website: String,
      supportEmail: String
    },
    purchase: {
      date: Date,
      cost: Number,
      currency: { type: String, default: 'EUR' },
      receiptUrl: String
    },
    renewal: {
      type: {
        type: String,
        enum: ['one-time', 'subscription']
      },
      nextRenewalDate: Date,
      cost: Number,
      autoRenewal: Boolean
    },
    usage: [{
      server: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Server'
      },
      project: String,
      installDate: Date
    }],
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active'
    },
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

// Add middleware to update timestamps
licenseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const License = mongoose.model('License', licenseSchema);

export default License;