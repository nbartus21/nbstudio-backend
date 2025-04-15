import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  role: {
    type: String,
    enum: ['client', 'admin'],
    default: 'client'
  },
  companyName: String,
  phone: String,
  language: {
    type: String,
    enum: ['hu', 'en', 'de'],
    default: 'hu'
  },
  address: {
    street: String,
    city: String,
    postalCode: String,
    country: String
  },
  active: {
    type: Boolean,
    default: true
  },
  // Referencia a projektekre, amelyekhez a felhasználó hozzáfér
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Jelszó hash-elés mentés előtt
userSchema.pre('save', async function(next) {
  // Ha a jelszó nem változott, továbblépünk
  if (!this.isModified('password')) return next();
  
  try {
    // Jelszó hash-elése
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Metódus a jelszó ellenőrzésére
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export default mongoose.model('User', userSchema); 