import express from 'express';
import SharedWebhosting from '../models/SharedWebhosting.js';
import authMiddleware from '../middleware/auth.js';
import nodemailer from 'nodemailer';
import { checkApiKey } from '../middleware/checkApiKey.js';

const router = express.Router();

// Email küldő konfiguráció
const smtpConfig = {
  host: process.env.SMTP_HOST || 'nb-hosting.hu',
  port: parseInt(process.env.SMTP_PORT || '25'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'noreply@nb-hosting.hu',
    pass: process.env.SMTP_PASS || 'Atom.1993*'
  }
};

// Email küldő létrehozása
const transporter = nodemailer.createTransport(smtpConfig);

// Email sablon fordítások
const emailTemplates = {
  orderConfirmation: {
    en: {
      subject: 'Your hosting order has been approved',
      greeting: 'Dear',
      message: 'Your hosting package order has been approved and the service is now active.',
      packageLabel: 'Package',
      domainLabel: 'Domain',
      periodLabel: 'Period',
      loginInfoLabel: 'Login information',
      pinCodeLabel: 'Your PIN code',
      loginLinkLabel: 'You can access your hosting account using the following link',
      footer: 'If you have any questions, please contact our support team.',
      regards: 'Best regards,',
      team: 'The NB-Studio Team'
    },
    de: {
      subject: 'Ihre Hosting-Bestellung wurde genehmigt',
      greeting: 'Sehr geehrte(r)',
      message: 'Ihre Hosting-Paket-Bestellung wurde genehmigt und der Service ist jetzt aktiv.',
      packageLabel: 'Paket',
      domainLabel: 'Domain',
      periodLabel: 'Zeitraum',
      loginInfoLabel: 'Anmeldeinformationen',
      pinCodeLabel: 'Ihr PIN-Code',
      loginLinkLabel: 'Sie können auf Ihr Hosting-Konto über den folgenden Link zugreifen',
      footer: 'Bei Fragen wenden Sie sich bitte an unser Support-Team.',
      regards: 'Mit freundlichen Grüßen,',
      team: 'Das NB-Studio Team'
    },
    hu: {
      subject: 'A hosting rendelése jóváhagyásra került',
      greeting: 'Tisztelt',
      message: 'Az Ön hosting csomag rendelését jóváhagytuk, a szolgáltatás most már aktív.',
      packageLabel: 'Csomag',
      domainLabel: 'Domain',
      periodLabel: 'Időszak',
      loginInfoLabel: 'Bejelentkezési információk',
      pinCodeLabel: 'Az Ön PIN kódja',
      loginLinkLabel: 'A hosting fiókjához a következő linken férhet hozzá',
      footer: 'Ha kérdése van, kérjük, vegye fel a kapcsolatot ügyfélszolgálatunkkal.',
      regards: 'Üdvözlettel,',
      team: 'Az NB-Studio Csapata'
    }
  }
};

// Hosting megosztott link ellenőrzése (PIN kód validálással)
router.post('/verify-pin', async (req, res) => {
  try {
    const { token, pin, updateWebhosting } = req.body;

    if (!token) {
      console.log('Missing token in the request');
      return res.status(400).json({ message: 'Missing token in the request' });
    }

    console.log('Token in verify-pin:', token);
    
    // Token alapján keresés
    const webhosting = await SharedWebhosting.findOne({ 'sharing.token': token });

    if (!webhosting) {
      console.log('Webhosting account not found with token:', token);
      return res.status(404).json({ message: 'Webhosting account not found' });
    }

    console.log('Webhosting found:', webhosting.hosting.domainName);

    // PIN ellenőrzése - csak akkor, ha nincs updateWebhosting objektum
    if (!updateWebhosting) {
      console.log('Performing PIN check (no updateWebhosting)');
      
      if (!pin || pin.trim() === '') {
        console.log('No PIN provided or empty');
        
        // Ha a webhostinghoz tartozik PIN, de a kérésben nincs megadva, akkor hiba
        if (webhosting.sharing.pin && webhosting.sharing.pin.trim() !== '') {
          console.log('PIN required for this webhosting but not provided');
          return res.status(403).json({ message: 'PIN code required to access this account' });
        }
      } else if (webhosting.sharing.pin && webhosting.sharing.pin !== pin) {
        console.log('Provided PIN does not match webhosting PIN');
        console.log('Provided PIN:', pin);
        console.log('Webhosting PIN:', webhosting.sharing.pin);
        return res.status(403).json({ message: 'Invalid PIN code' });
      }
      
      console.log('PIN verification successful');
    } else {
      // Itt kezeljük a webhosting frissítését, ha van updateWebhosting objektum
      console.log('Updating webhosting data');
      
      // Frissítjük az adatokat a megadott frissítési objektum alapján
      Object.assign(webhosting, updateWebhosting);
      await webhosting.save();
      
      console.log('Webhosting data updated successfully');
    }

    // Sikeres ellenőrzés esetén visszaküldjük a webhosting adatokat
    res.json({ 
      success: true,
      webhosting: webhosting
    });
  } catch (error) {
    console.error('Error in verify-pin:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Védett végpontok - auth middleware használata
router.use(authMiddleware);

// Hosting rendelések lekérése (admin felület számára)
router.get('/sharedwebhosting', async (req, res) => {
  try {
    const webhostings = await SharedWebhosting.find().sort({ createdAt: -1 });
    res.json(webhostings);
  } catch (error) {
    console.error('Error fetching shared webhostings:', error);
    res.status(500).json({ message: error.message });
  }
});

// Egy hosting részleteinek lekérése
router.get('/sharedwebhosting/:id', async (req, res) => {
  try {
    const webhosting = await SharedWebhosting.findById(req.params.id);
    
    if (!webhosting) {
      return res.status(404).json({ message: 'Shared webhosting not found' });
    }
    
    res.json(webhosting);
  } catch (error) {
    console.error('Error fetching shared webhosting details:', error);
    res.status(500).json({ message: error.message });
  }
});

// Új hosting létrehozása (admin által)
router.post('/sharedwebhosting', async (req, res) => {
  try {
    const newWebhosting = new SharedWebhosting(req.body);
    const savedWebhosting = await newWebhosting.save();
    
    res.status(201).json(savedWebhosting);
  } catch (error) {
    console.error('Error creating shared webhosting:', error);
    res.status(500).json({ message: error.message });
  }
});

// Hosting adatainak frissítése
router.put('/sharedwebhosting/:id', async (req, res) => {
  try {
    const updatedWebhosting = await SharedWebhosting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!updatedWebhosting) {
      return res.status(404).json({ message: 'Shared webhosting not found' });
    }
    
    res.json(updatedWebhosting);
  } catch (error) {
    console.error('Error updating shared webhosting:', error);
    res.status(500).json({ message: error.message });
  }
});

// Email értesítés küldése az ügyfélnek
router.post('/notify-client', async (req, res) => {
  try {
    const { webHostingId, language = 'hu' } = req.body;
    
    // Webhosting adatok lekérése
    const webhosting = await SharedWebhosting.findById(webHostingId);
    
    if (!webhosting) {
      return res.status(404).json({ message: 'Shared webhosting not found' });
    }
    
    // A megfelelő nyelvi sablon kiválasztása - ha nincs ilyen, akkor a magyar az alapértelmezett
    const clientLanguage = language || webhosting.client.language || 'hu';
    const template = emailTemplates.orderConfirmation[clientLanguage] || emailTemplates.orderConfirmation.hu;
    
    // Időszak formázása
    const period = webhosting.hosting.billing === 'monthly' ? 
      (clientLanguage === 'hu' ? 'Havi' : clientLanguage === 'de' ? 'Monatlich' : 'Monthly') : 
      (clientLanguage === 'hu' ? 'Éves' : clientLanguage === 'de' ? 'Jährlich' : 'Annual');
    
    // Kliens URL generálása
    const clientUrl = `https://project.nb-studio.net/shared-webhosting/${webhosting.sharing.token}`;
    
    // Email tartalom összeállítása
    const mailOptions = {
      from: `"NB-Studio" <${smtpConfig.auth.user}>`,
      to: webhosting.client.email,
      subject: template.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">${template.subject}</h2>
          <p>${template.greeting} ${webhosting.client.name},</p>
          <p>${template.message}</p>
          
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>${template.packageLabel}:</strong> ${webhosting.hosting.packageName}</p>
            <p><strong>${template.domainLabel}:</strong> ${webhosting.hosting.domainName}</p>
            <p><strong>${template.periodLabel}:</strong> ${period}</p>
          </div>
          
          <div style="background-color: #e6f7ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>${template.loginInfoLabel}</h3>
            <p><strong>${template.pinCodeLabel}:</strong> ${webhosting.sharing.pin}</p>
            <p>${template.loginLinkLabel}:</p>
            <p><a href="${clientUrl}" style="color: #3182ce;">${clientUrl}</a></p>
          </div>
          
          <p>${template.footer}</p>
          <p>
            ${template.regards}<br>
            ${template.team}
          </p>
        </div>
      `
    };
    
    // Email küldése
    await transporter.sendMail(mailOptions);
    
    res.json({ success: true, message: 'Notification email sent successfully' });
  } catch (error) {
    console.error('Error sending notification email:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error sending notification email',
      error: error.message
    });
  }
});

export default router; 