import User from '../models/User.js';
import Project from '../models/Project.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Környezeti változók ellenőrzése és alapértékek beállítása
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const JWT_SECRET = process.env.JWT_SECRET || 'nb_studio_default_secret_key';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://admin.nb-studio.net';
const CLIENT_URL = process.env.CLIENT_URL || 'https://project.nb-studio.net';

// Nodemailer transporter létrehozása
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

// JWT Token generálása
export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id,
      email: user.email,
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Felhasználó létrehozása
export const createUser = async (userData) => {
  try {
    const user = new User(userData);
    return await user.save();
  } catch (error) {
    throw error;
  }
};

// Felhasználói adatok lekérése email alapján
export const getUserByEmail = async (email) => {
  return await User.findOne({ email });
};

// Felhasználói adatok lekérése ID alapján
export const getUserById = async (id) => {
  return await User.findById(id);
};

// Felhasználó projekteinek lekérése
export const getUserProjects = async (userId) => {
  const user = await User.findById(userId).populate('projects');
  return user.projects;
};

// Projekt hozzáadása felhasználóhoz
export const addProjectToUser = async (userId, projectId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('Felhasználó nem található');
  
  // Ellenőrizzük, hogy a projekt létezik-e
  const project = await Project.findById(projectId);
  if (!project) throw new Error('Projekt nem található');
  
  // Ellenőrizzük, hogy a projekt már hozzá van-e rendelve
  if (user.projects.includes(projectId)) {
    return user; // Ha már hozzá van rendelve, nincs teendő
  }
  
  user.projects.push(projectId);
  return await user.save();
};

// Projekt eltávolítása felhasználótól
export const removeProjectFromUser = async (userId, projectId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('Felhasználó nem található');
  
  user.projects = user.projects.filter(
    project => project.toString() !== projectId
  );
  
  return await user.save();
};

// Üdvözlő email küldése az új felhasználónak
export const sendWelcomeEmail = async (user, password, language = 'hu') => {
  // Email sablon kiválasztása nyelv alapján
  let subject, html;
  
  if (language === 'en') {
    subject = 'Welcome to NB Studio Project Management';
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Welcome to NB Studio Project Management</h2>
        <p>Hello ${user.name},</p>
        <p>Your account has been successfully created. You can now access your projects.</p>
        <p><strong>Your login details:</strong></p>
        <p>Email: ${user.email}<br>
        Password: ${password}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${CLIENT_URL}" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Go to My Projects
          </a>
        </div>
        <p>For security reasons, please change your password after your first login.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Best regards,<br>NB Studio Team</p>
      </div>
    `;
  } else if (language === 'de') {
    subject = 'Willkommen bei NB Studio Projektmanagement';
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Willkommen bei NB Studio Projektmanagement</h2>
        <p>Hallo ${user.name},</p>
        <p>Ihr Konto wurde erfolgreich erstellt. Sie können jetzt auf Ihre Projekte zugreifen.</p>
        <p><strong>Ihre Anmeldedaten:</strong></p>
        <p>E-Mail: ${user.email}<br>
        Passwort: ${password}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${CLIENT_URL}" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Zu meinen Projekten
          </a>
        </div>
        <p>Aus Sicherheitsgründen ändern Sie bitte Ihr Passwort nach der ersten Anmeldung.</p>
        <p>Bei Fragen wenden Sie sich bitte an unser Support-Team.</p>
        <p>Mit freundlichen Grüßen,<br>NB Studio Team</p>
      </div>
    `;
  } else {
    // Alapértelmezett: magyar
    subject = 'Üdvözöljük az NB Studio Projektmenedzserben';
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Üdvözöljük az NB Studio Projektmenedzserben</h2>
        <p>Tisztelt ${user.name}!</p>
        <p>Felhasználói fiókja sikeresen létrejött. Most már hozzáférhet a projektjeihez.</p>
        <p><strong>Belépési adatai:</strong></p>
        <p>Email: ${user.email}<br>
        Jelszó: ${password}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${CLIENT_URL}" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Projektek megtekintése
          </a>
        </div>
        <p>Biztonsági okokból kérjük, változtassa meg jelszavát az első belépés után.</p>
        <p>Ha kérdése van, forduljon ügyfélszolgálatunkhoz.</p>
        <p>Üdvözlettel,<br>NB Studio Csapata</p>
      </div>
    `;
  }
  
  const mailOptions = {
    from: `"NB Studio" <${SMTP_USER}>`,
    to: user.email,
    subject: subject,
    html: html
  };
  
  return await transporter.sendMail(mailOptions);
};

// Jelszó visszaállító token generálása és email küldése
export const generatePasswordResetToken = async (email, language = 'hu') => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Felhasználó nem található');
  
  const token = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 óra
  await user.save();
  
  // Email sablon kiválasztása nyelv alapján
  let subject, html;
  
  if (language === 'en') {
    subject = 'NB Studio - Password Reset';
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You are receiving this email because you (or someone else) have requested a password reset for your account.</p>
        <p>Please click on the following button to reset your password. The link is valid for 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${CLIENT_URL}/reset-password/${token}" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        <p>Best regards,<br>NB Studio Team</p>
      </div>
    `;
  } else if (language === 'de') {
    subject = 'NB Studio - Passwort zurücksetzen';
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Anfrage zum Zurücksetzen des Passworts</h2>
        <p>Hallo,</p>
        <p>Sie erhalten diese E-Mail, weil Sie (oder jemand anderes) das Zurücksetzen des Passworts für Ihr Konto angefordert haben.</p>
        <p>Bitte klicken Sie auf die folgende Schaltfläche, um Ihr Passwort zurückzusetzen. Der Link ist 1 Stunde gültig.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${CLIENT_URL}/reset-password/${token}" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Passwort zurücksetzen
          </a>
        </div>
        <p>Wenn Sie dies nicht angefordert haben, ignorieren Sie bitte diese E-Mail und Ihr Passwort bleibt unverändert.</p>
        <p>Mit freundlichen Grüßen,<br>NB Studio Team</p>
      </div>
    `;
  } else {
    // Alapértelmezett: magyar
    subject = 'NB Studio - Jelszó visszaállítás';
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Jelszó visszaállítási kérelem</h2>
        <p>Tisztelt Felhasználónk!</p>
        <p>Ezt az emailt azért kapta, mert Ön (vagy valaki más) jelszó visszaállítást kért a fiókjához.</p>
        <p>Kérjük, kattintson az alábbi gombra a jelszava visszaállításához. A link 1 óráig érvényes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${CLIENT_URL}/reset-password/${token}" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Jelszó visszaállítása
          </a>
        </div>
        <p>Ha nem Ön kérte ezt a műveletet, kérjük, hagyja figyelmen kívül ezt az e-mailt, és jelszava változatlan marad.</p>
        <p>Üdvözlettel,<br>NB Studio Csapata</p>
      </div>
    `;
  }
  
  const mailOptions = {
    from: `"NB Studio" <${SMTP_USER}>`,
    to: user.email,
    subject: subject,
    html: html
  };
  
  return await transporter.sendMail(mailOptions);
};

// Jelszó visszaállítása token alapján
export const resetPassword = async (token, newPassword) => {
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  
  if (!user) {
    throw new Error('Érvénytelen vagy lejárt token');
  }
  
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  
  return await user.save();
}; 