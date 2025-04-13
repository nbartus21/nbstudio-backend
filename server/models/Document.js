import mongoose from 'mongoose';
import crypto from 'crypto'; // PIN és token generáláshoz

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'A dokumentum címe kötelező.'],
    trim: true,
  },
  content: {
    type: String, // HTML vagy Markdown tartalom tárolására
    required: [true, 'A dokumentum tartalma kötelező.'],
  },
  client: { // Ügyfél adatok közvetlenül tárolva
    name: String,
    email: String,
    companyName: String,
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: String,
    },
    taxNumber: String,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'expired', 'cancelled'],
    default: 'draft',
  },
  pin: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  sharingToken: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    default: null, // Alapértelmezetten nincs lejárat
    index: true,
  },
  sharedWith: [{
    email: { type: String, required: true },
    language: { type: String, enum: ['hu', 'en', 'de'], default: 'hu' },
    sharedAt: { type: Date, default: Date.now },
    _id: false // Ne generáljon külön ID-t a tömb elemeinek
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Feltételezve, hogy van User modell
    required: true,
  },
  pdfTemplate: { // Későbbi bővíthetőséghez, pl. különböző sablonok
    type: String,
    default: 'default_invoice_style',
  },
  isDeleted: { // Logikai törléshez
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  }
}, { timestamps: true }); // Automatikusan kezeli a createdAt és updatedAt mezőket

// Middleware a PIN és token generálásához mentés előtt
documentSchema.pre('validate', function(next) {
  if (this.isNew) {
    // Generálunk egy 6 jegyű PIN kódot
    this.pin = Math.floor(100000 + Math.random() * 900000).toString();
    // Generálunk egy biztonságos, egyedi megosztási token-t
    this.sharingToken = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Metódus a lejárat ellenőrzésére
documentSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < new Date();
};

// Statikus metódus az aktív, nem lejárt dokumentumok kereséséhez token alapján
documentSchema.statics.findActiveByToken = async function(token) {
  const document = await this.findOne({ sharingToken: token, status: 'active', isDeleted: false });
  if (document && document.isExpired()) {
    // Ha lejárt, frissítjük a státuszt és nullát adunk vissza
    document.status = 'expired';
    await document.save();
    return null;
  }
  return document;
};


const Document = mongoose.model('Document', documentSchema);

export default Document; 