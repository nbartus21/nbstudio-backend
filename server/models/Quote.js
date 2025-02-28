// árajánlat modell (MongoDB séma)
const quoteSchema = new mongoose.Schema({
    quoteNumber: {
      type: String,
      required: true,
      unique: true
    },
    client: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      address: {
        street: String,
        city: String,
        postalCode: String,
        country: String
      },
      companyName: String,
      taxNumber: String,
      euVatNumber: String
    },
    items: [{
      description: { type: String, required: true },
      quantity: { type: Number, required: true, min: 0.01 },
      unitPrice: { type: Number, required: true, min: 0 },
      discount: { type: Number, default: 0, min: 0, max: 100 },
      total: Number
    }],
    subtotal: { type: Number, required: true },
    vat: { type: Number, default: 27 },  // ÁFA százalék (Magyarországon jellemzően 27%)
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['piszkozat', 'elküldve', 'visszaigazolásra_vár', 'elfogadva', 'elutasítva', 'lejárt'],
      default: 'piszkozat'
    },
    paymentTerms: {
      type: String,
      default: 'Fizetés 8 napon belül banki átutalással'
    },
    notes: String,
    validUntil: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    shareToken: String,
    sharePin: String,
    clientNotes: String,
    acceptedAt: Date,
    rejectedAt: Date,
    rejectionReason: String
  });
  
  // Hook a számítások automatizálására
  quoteSchema.pre('save', function(next) {
    // Tétel összértékek kiszámítása
    this.items.forEach(item => {
      const discountMultiplier = 1 - (item.discount || 0) / 100;
      item.total = item.quantity * item.unitPrice * discountMultiplier;
    });
    
    // Részösszeg kiszámítása
    this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
    
    // Végösszeg kiszámítása (ÁFA-val)
    this.totalAmount = this.subtotal * (1 + this.vat / 100);
    
    // Utolsó módosítás időpontja
    this.updatedAt = Date.now();
    
    next();
  });
  
  // Árajánlat számgenerálás
  quoteSchema.statics.generateQuoteNumber = async function() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const prefix = `AJ-${currentYear}${currentMonth.toString().padStart(2, '0')}`;
    
    const lastQuote = await this.findOne({
      quoteNumber: { $regex: `^${prefix}` }
    }).sort({ quoteNumber: -1 });
    
    let nextNumber = 1;
    if (lastQuote) {
      const lastQuoteNumber = lastQuote.quoteNumber;
      const lastNumber = parseInt(lastQuoteNumber.split('-').pop());
      nextNumber = lastNumber + 1;
    }
    
    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  };
  
  const Quote = mongoose.model('Quote', quoteSchema);
  
  module.exports = Quote;