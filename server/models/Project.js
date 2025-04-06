import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  // Projekt alapadatok
  name: { type: String, required: true },
  description: String,
  status: {
    type: String,
    enum: ['aktív', 'befejezett', 'felfüggesztett', 'törölt'],
    default: 'aktív'
  },
  priority: {
    type: String,
    enum: ['alacsony', 'közepes', 'magas'],
    default: 'közepes'
  },
  // Kalkulátor kapcsolat
  calculatorEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Calculator'
  },
  // Ügyfél adatok
  client: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    companyName: String,
    taxNumber: String,
    euVatNumber: String,
    registrationNumber: String,
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: String
    }
  },
  // Pénzügyi adatok
  financial: {
    budget: {
      min: Number,
      max: Number
    },
    totalBilled: { type: Number, default: 0 },
    currency: { type: String, default: 'EUR' }
  },
  // Számlák
  invoices: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // Automatikus ObjectId generálás
    number: String,
    date: { type: Date, default: Date.now },
    amount: Number,
    status: {
      type: String,
      enum: ['kiállított', 'fizetett', 'késedelmes', 'törölt'],
      default: 'kiállított'
    },
    dueDate: Date,
    items: [{
      description: String,
      quantity: Number,
      unitPrice: Number,
      total: Number
    }],
    totalAmount: Number,
    paidAmount: { type: Number, default: 0 },
    paymentMethod: String, // Fizetési mód (card, transfer, cash, stb.)
    paymentReference: String, // Fizetési referencia (pl. Stripe payment_intent)
    paidDate: Date, // Fizetés dátuma
    notes: String,
    // Tranzakció adatok (Stripe vagy más fizetés esetén)
    transactions: [{
      transactionId: String, // Stripe tranzakció azonosító
      paymentIntentId: String, // Stripe payment intent ID
      amount: Number, // Tranzakció összege
      currency: String, // Tranzakció pénzneme
      status: String, // Tranzakció státusza
      paymentMethod: {
        type: String, // Fizetési mód típusa (card, sepa, stb.)
        brand: String, // Kártya típusa (visa, mastercard, stb.)
        last4: String, // Kártya utolsó 4 számjegye
        country: String // Kibocsátó ország
      },
      processingFee: Number, // Feldolgozási díj
      netAmount: Number, // Nettó összeg (feldolgozási díj levonása után)
      created: Date, // Tranzakció létrehozásának ideje
      updated: Date, // Tranzakció utolsó frissítésének ideje
      metadata: Object // Egyéb metaadatok a tranzakcióról
    }],
    // Ismétlődő számla beállítások
    recurring: {
      isRecurring: { type: Boolean, default: false },
      interval: { type: String, enum: ['havonta', 'negyedévente', 'félévente', 'évente'], default: 'havonta' },
      nextDate: Date, // Következő számlázási dátum
      endDate: Date, // Ha üres, akkor végtelen
      remainingOccurrences: Number // Ha 0 vagy üres, akkor végtelen
    }
  }],
  // AI elemzések és javaslatok
  aiAnalysis: {
    riskLevel: String,
    nextSteps: [String],
    recommendations: String,
    lastUpdated: Date
  },
  // Projekt mérföldkövek
  milestones: [{
    title: String,
    description: String,
    dueDate: Date,
    completedDate: Date,
    status: {
      type: String,
      enum: ['tervezett', 'folyamatban', 'befejezett', 'késedelmes'],
      default: 'tervezett'
    }
  }],
  // Jegyzetek
  notes: [{
    content: String,
    createdBy: String,
    createdAt: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['általános', 'pénzügyi', 'technikai', 'ügyfél'],
      default: 'általános'
    }
  }],
  // Fájlok feltöltése
  files: [{
    id: {
      type: String,
      required: true
    },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    s3url: { type: String },
    s3key: { type: String },
    uploadedBy: { type: String, required: true },
    content: String,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date
  }],

  // Hozzászólások
  comments: [{
    text: String,
    author: String,
    timestamp: { type: Date, default: Date.now },
    isAdminComment: { type: Boolean, default: false },
    replyTo: { type: String } // Válasz esetén a másik komment azonosítója
  }],

  // Aktivitás számlálók
  activityCounters: {
    commentsCount: { type: Number, default: 0 },
    filesCount: { type: Number, default: 0 },
    hasNewComments: { type: Boolean, default: false },
    hasNewFiles: { type: Boolean, default: false },
    lastCommentAt: Date,
    lastFileAt: Date,
    lastAdminCommentAt: Date, // Adminisztrátori válasz időpontja
    adminResponseRequired: { type: Boolean, default: false } // Jelzi, ha adminisztrátori választ igényel
  },

  // Időbélyegek
  startDate: { type: Date, default: Date.now },
  expectedEndDate: Date,
  actualEndDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Megosztási adatok
  sharing: {
    token: {
      type: String,
      unique: true,
      sparse: true
    },
    pin: {
      type: String,
      sparse: true
    },
    link: String,
    expiresAt: Date,
    createdAt: Date,
    hideFiles: { type: Boolean, default: false },
    hideDocuments: { type: Boolean, default: false }
  },

  // Changelog - fejlesztési napló
  changelog: [{
    title: { type: String, required: true },
    description: String,
    date: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['feature', 'bugfix', 'improvement', 'other'],
      default: 'feature'
    },
    createdBy: String
  }],

  // Kapcsolódó domainek
  domains: [{
    domainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain' },
    name: String,
    expiryDate: Date,
    addedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Update timestamp middleware
projectSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // Frissítjük a számlálókat
  if (this.isModified('comments')) {
    this.activityCounters.commentsCount = this.comments.length;

    // Ellenőrizzük, hogy van-e új (nem admin) hozzászólás, amire még nem válaszoltak
    const nonAdminComments = this.comments.filter(c => !c.isAdminComment);
    const adminComments = this.comments.filter(c => c.isAdminComment);

    if (nonAdminComments.length > 0) {
      const lastNonAdminComment = nonAdminComments.sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      )[0];

      if (adminComments.length > 0) {
        const lastAdminComment = adminComments.sort((a, b) =>
          new Date(b.timestamp) - new Date(a.timestamp)
        )[0];

        // Ellenőrizzük, hogy az utolsó nem-admin hozzászólás után volt-e admin válasz
        this.activityCounters.adminResponseRequired = new Date(lastNonAdminComment.timestamp) > new Date(lastAdminComment.timestamp);
        this.activityCounters.lastAdminCommentAt = lastAdminComment.timestamp;
      } else {
        // Ha nincs admin hozzászólás, akkor válasz szükséges
        this.activityCounters.adminResponseRequired = true;
      }

      this.activityCounters.lastCommentAt = lastNonAdminComment.timestamp;
      this.activityCounters.hasNewComments = true;
    }
  }

  if (this.isModified('files')) {
    this.activityCounters.filesCount = this.files.length;

    if (this.files.length > 0) {
      // Frissítjük az utolsó fájl dátumát
      const lastFile = this.files.sort((a, b) =>
        new Date(b.uploadedAt) - new Date(a.uploadedAt)
      )[0];

      this.activityCounters.lastFileAt = lastFile.uploadedAt;
      this.activityCounters.hasNewFiles = true;
    }
  }

  next();
});

export default mongoose.model('Project', projectSchema);