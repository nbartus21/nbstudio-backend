import mongoose from 'mongoose';

const socialMediaAccountSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['facebook', 'instagram'],
    required: true
  },
  accountId: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  profilePicture: String,
  isConnected: {
    type: Boolean,
    default: true
  },
  lastTokenRefresh: Date,
  tokenExpiresAt: Date
});

const scheduledPostSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  media: [{
    type: String, // URL vagy fájl útvonal
    required: false
  }],
  platforms: [{
    type: String,
    enum: ['facebook', 'instagram'],
    required: true
  }],
  scheduledFor: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'published', 'failed'],
    default: 'scheduled'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: Date,
  errorMessage: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const socialMediaSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accounts: [socialMediaAccountSchema],
  defaultPostTime: {
    hour: { type: Number, default: 12 },
    minute: { type: Number, default: 0 }
  },
  autoRepost: {
    enabled: { type: Boolean, default: false },
    platforms: [{
      type: String,
      enum: ['facebook', 'instagram']
    }]
  }
});

export const SocialMediaSettings = mongoose.model('SocialMediaSettings', socialMediaSettingsSchema);
export const ScheduledPost = mongoose.model('ScheduledPost', scheduledPostSchema); 