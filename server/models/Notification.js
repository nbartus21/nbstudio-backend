import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { 
    type: String,
    required: true 
  },
  type: {
    type: String,
    enum: ['domain', 'server', 'license', 'invoice', 'project'],
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
    enum: ['info', 'warning', 'error'],
    default: 'info'
  },
  read: {
    type: Boolean,
    default: false
  },
  link: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Notification', notificationSchema);