import express from 'express';
import ContentPage from '../models/ContentPage.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Default content for pages if they don't exist
const defaultContent = {
  terms: {
    'title': 'Általános Szerződési Feltételek',
    'seo.title': 'ÁSZF - NB Studio',
    'seo.description': 'NB Studio Általános Szerződési Feltételek',
    'general.title': 'Általános információk',
    'general.content': 'Az alábbi feltételek szabályozzák az NB Studio szolgáltatásainak használatát.',
    'usage.title': 'Használati feltételek',
    'usage.content': 'A szolgáltatás használatával elfogadod ezen feltételeket.',
    'liability.title': 'Felelősség korlátozása',
    'liability.content': 'Az NB Studio nem vállal felelősséget a nem rendeltetésszerű használatból eredő károkért.',
    'changes.title': 'Változtatások',
    'changes.content': 'Fenntartjuk a jogot a feltételek változtatására.',
    'contact.title': 'Kapcsolat',
    'contact.name': 'Név',
    'contact.email': 'Email'
  },
  privacy: {
    'title': 'Adatvédelmi Szabályzat',
    'seo.title': 'Adatvédelem - NB Studio',
    'seo.description': 'NB Studio adatvédelmi irányelvek',
    'general.title': 'Általános információk',
    'general.content': 'Az NB Studio elkötelezett a személyes adatok védelme iránt.',
    'data.title': 'Kezelt adatok',
    'data.item1': 'Név és elérhetőségi adatok',
    'data.item2': 'Böngészéssel kapcsolatos információk',
    'data.item3': 'Fizetéssel kapcsolatos adatok',
    'data.item4': 'Weboldal használatával kapcsolatos statisztikák',
    'cookies.title': 'Cookie-k használata',
    'cookies.content': 'Weboldalunk cookie-kat használ a jobb felhasználói élmény érdekében.',
    'rights.title': 'Jogaid',
    'rights.item1': 'Hozzáférési jog',
    'rights.item2': 'Helyesbítési jog',
    'rights.item3': 'Törlési jog',
    'rights.item4': 'Adatkezelés korlátozásának joga',
    'rights.item5': 'Adathordozhatósághoz való jog',
    'contact.title': 'Kapcsolat',
    'contact.name': 'Név',
    'contact.email': 'Email'
  },
  cookies: {
    'title': 'Cookie Szabályzat',
    'seo.title': 'Cookie szabályzat - NB Studio',
    'seo.description': 'NB Studio cookie használati szabályzat',
    'general.title': 'Általános információk',
    'general.content': 'Ez a szabályzat leírja, hogyan használunk cookie-kat a weboldalunkon.',
    'types.title': 'Cookie típusok',
    'types.item1': 'Szükséges cookie-k: a weboldal működéséhez elengedhetetlenek',
    'types.item2': 'Preferencia cookie-k: beállításaid megjegyzéséhez',
    'types.item3': 'Statisztikai cookie-k: a weboldal használatának elemzéséhez',
    'management.title': 'Cookie-k kezelése',
    'management.content': 'A böngésződ beállításaiban bármikor letilthatod a cookie-k használatát.',
    'contact.title': 'Kapcsolat',
    'contact.name': 'Név',
    'contact.email': 'Email'
  },
  imprint: {
    'title': 'Impresszum',
    'seo.title': 'Impresszum - NB Studio',
    'seo.description': 'NB Studio impresszum és jogi információk',
    'company.title': 'Cég információk',
    'contact.title': 'Kapcsolat',
    'contact.phone': 'Telefon',
    'contact.email': 'Email',
    'registration.title': 'Nyilvántartási adatok',
    'registration.vatId': 'Adószám',
    'responsibility.title': 'Felelősség a tartalomért',
    'responsibility.content': 'Az oldalon található tartalmakért az NB Studio vállalja a felelősséget.',
    'disclaimer.title': 'Jogi nyilatkozat',
    'disclaimer.content': 'A weboldal tartalma szerzői jogi védelem alatt áll.'
  }
};

// Get all content pages
router.get('/', authMiddleware, async (req, res) => {
  try {
    const contentPages = await ContentPage.find().sort({ slug: 1 });
    res.status(200).json(contentPages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific content page by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!['terms', 'privacy', 'cookies', 'imprint'].includes(slug)) {
      return res.status(400).json({ message: 'Invalid content page slug' });
    }
    
    let contentPage = await ContentPage.findOne({ slug });
    
    // If the page doesn't exist, create it with default content
    if (!contentPage && defaultContent[slug]) {
      contentPage = new ContentPage({
        slug,
        content: new Map(Object.entries(defaultContent[slug]))
      });
      await contentPage.save();
    } else if (!contentPage) {
      return res.status(404).json({ message: 'Content page not found' });
    }
    
    res.status(200).json(contentPage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update a content page
router.put('/:slug', authMiddleware, async (req, res) => {
  try {
    const { slug } = req.params;
    const { content } = req.body;
    
    if (!['terms', 'privacy', 'cookies', 'imprint'].includes(slug)) {
      return res.status(400).json({ message: 'Invalid content page slug' });
    }
    
    if (!content || typeof content !== 'object') {
      return res.status(400).json({ message: 'Content is required and must be an object' });
    }
    
    // Convert the content object to a Map if it's not already
    const contentMap = new Map(Object.entries(content));
    
    // Use findOneAndUpdate with upsert:true to create if not exists
    const contentPage = await ContentPage.findOneAndUpdate(
      { slug },
      { content: contentMap },
      { new: true, upsert: true, runValidators: true }
    );
    
    res.status(200).json(contentPage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Public API endpoint to get a content page
router.get('/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!['terms', 'privacy', 'cookies', 'imprint'].includes(slug)) {
      return res.status(400).json({ message: 'Invalid content page slug' });
    }
    
    let contentPage = await ContentPage.findOne({ slug });
    
    // If the page doesn't exist, create it with default content
    if (!contentPage && defaultContent[slug]) {
      contentPage = new ContentPage({
        slug,
        content: new Map(Object.entries(defaultContent[slug]))
      });
      await contentPage.save();
    } else if (!contentPage) {
      return res.status(404).json({ message: 'Content page not found' });
    }
    
    res.status(200).json(contentPage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;