import mongoose from 'mongoose';

const biometricCredentialSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  credentialId: {
    type: String,
    required: true,
    unique: true
  },
  publicKey: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('BiometricCredential', biometricCredentialSchema);