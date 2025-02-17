import mongoose from 'mongoose';

const hostingNotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['new_order', 'status_change', 'expiry_warning', 'payment_received', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'success'],
    default: 'info'
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hosting',
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  link: {
    type: String,
    default: '/hosting'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

hostingNotificationSchema.index({ createdAt: -1 });
hostingNotificationSchema.index({ orderId: 1 });

export default mongoose.model('HostingNotification', hostingNotificationSchema);