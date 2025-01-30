import mongoose from 'mongoose';

const serverSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  type: {
    type: String,
    enum: ['primary', 'secondary', 'development', 'backup'],
    required: true
  },
  provider: {
    name: String,
    accountId: String,
    controlPanelUrl: String
  },
  specifications: {
    cpu: String,
    ram: String,
    storage: {
      total: Number,  // in GB
      used: Number,
      type: {
        type: String,
        enum: ['SSD', 'HDD', 'NVMe']
      }
    },
    bandwidth: String,
    ipAddresses: [{
      ip: String,
      type: { type: String, enum: ['IPv4', 'IPv6'] }
    }]
  },
  costs: {
    monthly: Number,
    currency: { type: String, default: 'EUR' },
    nextBillingDate: Date,
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly']
    }
  },
  connections: [{
    connectedServer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Server'
    },
    connectionType: String,
    description: String
  }],
  services: [{
    name: String,
    type: String,
    port: Number,
    status: {
      type: String,
      enum: ['running', 'stopped', 'error']
    }
  }],
  monitoring: {
    lastChecked: Date,
    uptime: Number,
    alerts: [{
      type: String,
      message: String,
      date: Date,
      resolved: Boolean
    }]
  },
  maintenance: {
    lastMaintenance: Date,
    nextScheduled: Date,
    notes: String
  },
  backups: {
    enabled: Boolean,
    frequency: String,
    lastBackup: Date,
    retention: Number // days
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'offline', 'decommissioned'],
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