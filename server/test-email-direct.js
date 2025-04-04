// Egyszerű teszt script a nodemailer működésének ellenőrzésére
const nodemailer = require('nodemailer');
require('dotenv').config();

// SMTP beállítások
const SMTP_HOST = process.env.SMTP_HOST || 'nb-hosting.hu';
const SMTP_PORT = process.env.SMTP_PORT || 25;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || 'noreply@nb-hosting.hu';
const SMTP_PASS = process.env.SMTP_PASS;

console.log('SMTP beállítások:', {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS ? '******' : 'MISSING' }
});

// Transporter létrehozása
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

// Kapcsolat tesztelése
console.log('SMTP kapcsolat tesztelése...');
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP kapcsolat hiba:', error);
  } else {
    console.log('SMTP szerver kapcsolat OK, kész az emailek küldésére');
    
    // Teszt email küldése
    console.log('Teszt email küldése...');
    const mailOptions = {
      from: `"Norbert Bartus" <${SMTP_USER}>`,
      to: 'nbartus21@gmail.com',
      subject: 'Teszt email a nodemailer működésének ellenőrzésére',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #3B82F6;">Teszt Email</h2>
          <p>Ez egy teszt email a nodemailer működésének ellenőrzésére.</p>
          <p>Időbélyeg: ${new Date().toISOString()}</p>
        </div>
      `
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email küldési hiba:', error);
      } else {
        console.log('Email sikeresen elküldve:', info.messageId);
        console.log('Válasz:', info.response);
      }
      
      process.exit(0);
    });
  }
});
