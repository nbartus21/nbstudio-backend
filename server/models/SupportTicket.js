// models/SupportTicket.js
import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  subject: { 
    type: String,
    required: true
  },
  content: { 
    type: String,
    required: true
  },
  status: { 
    type: String,
    enum: ['new', 'open', 'pending', 'resolved', 'closed'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  client: {
    name: String,
    email: {
      type: String,
      required: true
    },
    phone: String
  },
  emailData: {
    messageId: String,
    inReplyTo: String,
    references: [String], 
    threadId: String,
    fromAddress: String,
    toAddress: [String],
    ccAddress: [String],
    bccAddress: [String],
    originalHeaders: Object
  },
  source: {
    type: String,
    enum: ['email', 'form', 'phone', 'chat', 'other'],
    default: 'email'
  },
  attachments: [{
    filename: String,
    contentType: String,
    size: Number,
    content: Buffer,
    url: String
  }],
  assignedTo: String,
  responses: [{
    content: String,
    from: String,
    timestamp: { type: Date, default: Date.now },
    isInternal: { type: Boolean, default: false },
    attachments: [{
      filename: String,
      contentType: String,
      size: Number,
      content: Buffer,
      url: String
    }]
  }],
  tags: [String],
  dueDate: Date,
  timeSpent: Number, // minutes
  isRead: { 
    type: Boolean, 
    default: false 
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

// Automatikus updatedAt frissítés
supportTicketSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexek a gyorsabb kereséshez
supportTicketSchema.index({ 'client.email': 1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ assignedTo: 1 });
supportTicketSchema.index({ tags: 1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ 'emailData.messageId': 1 }, { unique: true, sparse: true });
supportTicketSchema.index({ 'emailData.threadId': 1 });

export default mongoose.model('SupportTicket', supportTicketSchema);