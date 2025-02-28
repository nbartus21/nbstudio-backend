import Quote from '../models/Quote.js';
import Project from '../models/Project.js';
import { generateRandomPin, generateRandomToken } from '../utils/helpers.js';

// Árajánlatok lekérdezése
export const getQuotes = async (req, res) => {
  try {
    // Szűrési paraméterek kezelése (státusz, dátum, ügyfél, stb.)
    const filters = {};
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    if (req.query.client) {
      filters['client.name'] = { $regex: req.query.client, $options: 'i' };
    }
    
    if (req.query.projectId) {
      filters.projectId = req.query.projectId;
    }
    
    // Dátum szűrés
    if (req.query.from) {
      filters.createdAt = { ...filters.createdAt, $gte: new Date(req.query.from) };
    }
    
    if (req.query.to) {
      filters.createdAt = { ...filters.createdAt, $lte: new Date(req.query.to) };
    }
    
    // Rendezés és lapozás
    const sort = {};
    if (req.query.sortBy) {
      sort[req.query.sortBy] = req.query.sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Alapértelmezett: legújabb elöl
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Árajánlatok lekérdezése
    const quotes = await Quote.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Összes találat számának lekérdezése a lapozáshoz
    const total = await Quote.countDocuments(filters);
    
    res.status(200).json({
      quotes,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Hiba az árajánlatok lekérdezésekor:', error);
    res.status(500).json({ message: 'Szerver hiba az árajánlatok lekérdezésekor' });
  }
};

// Árajánlat lekérdezése ID alapján
export const getQuoteById = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    
    if (!quote) {
      return res.status(404).json({ message: 'Árajánlat nem található' });
    }
    
    res.status(200).json(quote);
  } catch (error) {
    console.error('Hiba az árajánlat lekérdezésekor:', error);
    res.status(500).json({ message: 'Szerver hiba az árajánlat lekérdezésekor' });
  }
};

// Új árajánlat létrehozása
export const createQuote = async (req, res) => {
  try {
    // Árajánlat számának generálása
    const quoteNumber = await Quote.generateQuoteNumber();
    
    // Árajánlat létrehozása
    const quoteData = {
      ...req.body,
      quoteNumber,
      createdBy: req.userId, // A bejelentkezett felhasználó azonosítója
      shareToken: generateRandomToken(),
      sharePin: generateRandomPin(6) // 6 számjegyű PIN kód
    };
    
    // Árajánlat mentése
    const quote = new Quote(quoteData);
    await quote.save();
    
    // Ha projekthez van rendelve, akkor hozzáadjuk a projekt-árajánlat kapcsolatot
    if (quote.projectId) {
      await Project.findByIdAndUpdate(quote.projectId, {
        $addToSet: { quotes: quote._id }
      });
    }
    
    res.status(201).json(quote);
  } catch (error) {
    console.error('Hiba az árajánlat létrehozásakor:', error);
    res.status(500).json({ message: 'Szerver hiba az árajánlat létrehozásakor', error: error.message });
  }
};

// Árajánlat létrehozása projekthez
export const createQuoteForProject = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    
    // Ellenőrizzük, hogy a projekt létezik-e
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }
    
    // Árajánlat létrehozása a projekthez
    const quoteNumber = await Quote.generateQuoteNumber();
    
    const quoteData = {
      ...req.body,
      quoteNumber,
      projectId,
      createdBy: req.userId,
      shareToken: generateRandomToken(),
      sharePin: generateRandomPin(6)
    };
    
    const quote = new Quote(quoteData);
    await quote.save();
    
    // Projekt frissítése az árajánlat hivatkozással
    await Project.findByIdAndUpdate(projectId, {
      $addToSet: { quotes: quote._id }
    });
    
    res.status(201).json(quote);
  } catch (error) {
    console.error('Hiba a projekthez tartozó árajánlat létrehozásakor:', error);
    res.status(500).json({ message: 'Szerver hiba az árajánlat létrehozásakor', error: error.message });
  }
};

// Árajánlat módosítása
export const updateQuote = async (req, res) => {
  try {
    const quoteId = req.params.id;
    
    // Ellenőrizzük, hogy az árajánlat létezik-e
    const quote = await Quote.findById(quoteId);
    if (!quote) {
      return res.status(404).json({ message: 'Árajánlat nem található' });
    }
    
    // Csak akkor lehet módosítani, ha még piszkozat vagy elküldve státuszban van
    if (quote.status !== 'piszkozat' && quote.status !== 'elküldve') {
      return res.status(400).json({ 
        message: 'Az árajánlat nem módosítható, mert már elfogadták, elutasították vagy lejárt' 
      });
    }
    
    // Árajánlat frissítése
    const updatedQuote = await Quote.findByIdAndUpdate(
      quoteId,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedQuote);
  } catch (error) {
    console.error('Hiba az árajánlat módosításakor:', error);
    res.status(500).json({ message: 'Szerver hiba az árajánlat módosításakor', error: error.message });
  }
};

// Árajánlat státuszának módosítása
export const updateQuoteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    // Ellenőrizzük, hogy az árajánlat létezik-e
    const quote = await Quote.findById(id);
    if (!quote) {
      return res.status(404).json({ message: 'Árajánlat nem található' });
    }
    
    // Státusz változtatás kezelése
    const updateData = { status };
    
    // Elfogadás vagy elutasítás dátumának rögzítése
    if (status === 'elfogadva') {
      updateData.acceptedAt = Date.now();
    } else if (status === 'elutasítva') {
      updateData.rejectedAt = Date.now();
      updateData.rejectionReason = reason;
    }
    
    // Árajánlat frissítése
    const updatedQuote = await Quote.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now() },
      { new: true }
    );
    
    // Ha elfogadták az árajánlatot és van projekthez rendelve, akkor frissítjük a projekt státuszt
    if (status === 'elfogadva' && updatedQuote.projectId) {
      await Project.findByIdAndUpdate(
        updatedQuote.projectId,
        { $set: { quoteAccepted: true } }
      );
    }
    
    res.status(200).json(updatedQuote);
  } catch (error) {
    console.error('Hiba az árajánlat státuszának módosításakor:', error);
    res.status(500).json({ message: 'Szerver hiba az árajánlat státuszának módosításakor' });
  }
};

// Árajánlat törlése
export const deleteQuote = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Ellenőrizzük, hogy az árajánlat létezik-e
    const quote = await Quote.findById(id);
    if (!quote) {
      return res.status(404).json({ message: 'Árajánlat nem található' });
    }
    
    // Csak piszkozat státuszú árajánlat törölhető
    if (quote.status !== 'piszkozat') {
      return res.status(400).json({ 
        message: 'Csak piszkozat státuszú árajánlat törölhető' 
      });
    }
    
    // Árajánlat törlése
    await Quote.findByIdAndDelete(id);
    
    // Ha projekthez van rendelve, akkor eltávolítjuk a kapcsolatot
    if (quote.projectId) {
      await Project.findByIdAndUpdate(
        quote.projectId,
        { $pull: { quotes: id } }
      );
    }
    
    res.status(200).json({ message: 'Árajánlat sikeresen törölve' });
  } catch (error) {
    console.error('Hiba az árajánlat törlésekor:', error);
    res.status(500).json({ message: 'Szerver hiba az árajánlat törlésekor' });
  }
};

// Árajánlat megtekintése token alapján (ügyfél számára)
export const getQuoteByToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Árajánlat keresése token alapján
    const quote = await Quote.findOne({ shareToken: token });
    
    if (!quote) {
      return res.status(404).json({ message: 'Árajánlat nem található' });
    }
    
    // Ellenőrizzük, hogy az árajánlat nem járt-e le
    const now = new Date();
    const validUntil = new Date(quote.validUntil);
    
    if (now > validUntil) {
      // Frissítsük a státuszt lejártra, ha még nem tettük meg
      if (quote.status !== 'lejárt') {
        quote.status = 'lejárt';
        await quote.save();
      }
      
      return res.status(400).json({ message: 'Az árajánlat érvényessége lejárt' });
    }
    
    // Ha az árajánlat elfogadva vagy elutasítva státuszban van, akkor is megtekinthető
    
    // Csak publikus adatokat küldünk vissza
    const publicQuoteData = {
      quoteNumber: quote.quoteNumber,
      client: quote.client,
      items: quote.items,
      subtotal: quote.subtotal,
      vat: quote.vat,
      totalAmount: quote.totalAmount,
      status: quote.status,
      paymentTerms: quote.paymentTerms,
      notes: quote.notes,
      validUntil: quote.validUntil,
      createdAt: quote.createdAt,
      acceptedAt: quote.acceptedAt,
      rejectedAt: quote.rejectedAt,
      requiresPin: true // Jelezzük, hogy PIN kódot kell bekérni a további műveletekhez
    };
    
    res.status(200).json(publicQuoteData);
  } catch (error) {
    console.error('Hiba az árajánlat lekérdezésekor token alapján:', error);
    res.status(500).json({ message: 'Szerver hiba az árajánlat lekérdezésekor' });
  }
};

// Árajánlat elfogadása vagy elutasítása az ügyfél által
export const clientQuoteAction = async (req, res) => {
  try {
    const { token } = req.params;
    const { pin, action, reason, notes } = req.body;
    
    // Árajánlat keresése token alapján
    const quote = await Quote.findOne({ shareToken: token });
    
    if (!quote) {
      return res.status(404).json({ message: 'Árajánlat nem található' });
    }
    
    // PIN kód ellenőrzése
    if (quote.sharePin !== pin) {
      return res.status(401).json({ message: 'Érvénytelen PIN kód' });
    }
    
    // Ellenőrizzük, hogy az árajánlat nem járt-e le
    const now = new Date();
    const validUntil = new Date(quote.validUntil);
    
    if (now > validUntil) {
      // Frissítsük a státuszt lejártra, ha még nem tettük meg
      if (quote.status !== 'lejárt') {
        quote.status = 'lejárt';
        await quote.save();
      }
      
      return res.status(400).json({ message: 'Az árajánlat érvényessége lejárt' });
    }
    
    // Ellenőrizzük, hogy az árajánlat megfelelő státuszban van-e
    if (quote.status !== 'elküldve' && quote.status !== 'visszaigazolásra_vár') {
      return res.status(400).json({ 
        message: 'Az árajánlat állapota nem teszi lehetővé ezt a műveletet' 
      });
    }
    
    // Művelet végrehajtása
    let updateData = {};
    let message = '';
    
    if (action === 'accept') {
      updateData = {
        status: 'elfogadva',
        acceptedAt: now,
        clientNotes: notes || '',
        updatedAt: now
      };
      message = 'Árajánlat sikeresen elfogadva';
      
      // Ha projekthez van rendelve, akkor frissítjük a projekt státuszt
      if (quote.projectId) {
        await Project.findByIdAndUpdate(
          quote.projectId,
          { $set: { quoteAccepted: true } }
        );
      }
    } else if (action === 'reject') {
      if (!reason) {
        return res.status(400).json({ message: 'Elutasítás esetén az indoklás megadása kötelező' });
      }
      
      updateData = {
        status: 'elutasítva',
        rejectedAt: now,
        rejectionReason: reason,
        clientNotes: notes || '',
        updatedAt: now
      };
      message = 'Árajánlat elutasítva';
    } else {
      return res.status(400).json({ message: 'Érvénytelen művelet' });
    }
    
    // Árajánlat frissítése
    const updatedQuote = await Quote.findByIdAndUpdate(
      quote._id,
      { $set: updateData },
      { new: true }
    );
    
    res.status(200).json({ message, quote: updatedQuote });
  } catch (error) {
    console.error('Hiba az árajánlat ügyfél általi kezelésekor:', error);
    res.status(500).json({ message: 'Szerver hiba az árajánlat kezelésekor' });
  }
};

// Számla generálása elfogadott árajánlatból
export const generateInvoiceFromQuote = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Árajánlat keresése
    const quote = await Quote.findById(id);
    
    if (!quote) {
      return res.status(404).json({ message: 'Árajánlat nem található' });
    }
    
    // Ellenőrizzük, hogy az árajánlat elfogadott státuszban van-e
    if (quote.status !== 'elfogadva') {
      return res.status(400).json({
        message: 'Csak elfogadott árajánlatból lehet számlát generálni'
      });
    }
    
    // Számlakészítéshez szükséges adatok
    const invoiceData = {
      client: quote.client,
      items: quote.items,
      subtotal: quote.subtotal,
      vat: quote.vat,
      totalAmount: quote.totalAmount,
      paymentTerms: quote.paymentTerms,
      projectId: quote.projectId,
      quoteId: quote._id,
      status: 'kiállított',
      date: new Date(),
      dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 napos fizetési határidő
      paidAmount: 0
    };
    
    // Itt történne a számla létrehozása - ez a részlet a számlakészítő modelltől függ
    // const invoice = new Invoice(invoiceData);
    // await invoice.save();
    
    // Ezt most csak szimulációként kezeljük:
    const mockInvoice = {
      ...invoiceData,
      _id: 'mock_invoice_id',
      invoiceNumber: `INV-${Date.now()}`
    };
    
    // Frissítjük az árajánlatot, hogy tartalmazza a számla azonosítóját
    await Quote.findByIdAndUpdate(id, {
      $set: { invoiceId: mockInvoice._id }
    });
    
    res.status(201).json({
      message: 'Számla sikeresen létrehozva az árajánlatból',
      invoice: mockInvoice
    });
  } catch (error) {
    console.error('Hiba a számla generálásakor árajánlatból:', error);
    res.status(500).json({ message: 'Szerver hiba a számla generálásakor' });
  }
};