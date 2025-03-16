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
    notes: String,
    // Ismétlődő számlához tartozó referencia
    isRecurring: { type: Boolean, default: false },
    recurringInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'recurringInvoice' }
  }],
  // Ismétlődő számlázás beállításai
  recurringInvoices: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    description: String,
    isActive: { type: Boolean, default: true },
    frequency: {
      type: String,
      enum: ['havi', 'negyedéves', 'féléves', 'éves', 'egyedi'],
      default: 'havi'
    },
    interval: { type: Number, default: 1 }, // Pl. 2 havi = 2 havonta
    startDate: { type: Date, required: true },
    endDate: Date, // Opcionális végdátum
    nextInvoiceDate: Date, // Következő számlázási dátum
    lastInvoiceDate: Date, // Utolsó számlázás dátuma
    totalOccurrences: Number, // Maximális ismétlésszám (opcionális)
    currentOccurrence: { type: Number, default: 0 }, // Eddigi ismétlések száma
    paymentTerms: { type: Number, default: 14 }, // Fizetési határidő napokban
    items: [{
      description: String,
      quantity: Number,
      unitPrice: Number,
      total: Number
    }],
    totalAmount: Number,
    notes: String,
    emailNotification: { type: Boolean, default: true },
    emailTemplate: String,
    reminderDays: { type: Number, default: 3 }, // Emlékeztető küldése ennyi nappal a számlázás előtt
    autoSend: { type: Boolean, default: false }, // Automatikus küldés emailben
    generatePDF: { type: Boolean, default: true }, // PDF generálás
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
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
  name: String,
  size: Number,
  type: String,
  uploadedAt: { type: Date, default: Date.now },
  content: String, // Base64 vagy URL
  uploadedBy: String
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
    createdAt: Date
  }
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