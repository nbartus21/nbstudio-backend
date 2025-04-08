import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DocumentTemplate, Document } from '../models/DocumentTemplate.js';
import { join } from 'path';
import fs from 'fs';

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'nb-hosting.hu',
  port: process.env.SMTP_PORT || 25,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'noreply@nb-hosting.hu',
    pass: process.env.SMTP_PASS || 'Atom.1993*'
  }
});

const documentService = {
  /**
   * Process a document template by replacing variables with values
   * @param {string} templateContent 
   * @param {Object} variables 
   * @returns {string}
   */
  processTemplate(templateContent, variables) {
    let processedContent = templateContent;
    
    // Replace each variable
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedContent = processedContent.replace(regex, value || '');
    }
    
    // Remove any remaining variables
    processedContent = processedContent.replace(/{{[^}]+}}/g, '');
    
    return processedContent;
  },
  
  /**
   * Generate a PDF from HTML content
   * @param {Document} document
   * @param {string} language
   * @returns {Buffer}
   */
  async generatePDF(document, language = 'hu') {
    return new Promise((resolve, reject) => {
      try {
        // Create a PDF document
        const pdf = new PDFDocument({
          size: 'A4',
          margin: 40,
          bufferPages: true,
          autoFirstPage: true,
          layout: 'portrait',
          info: {
            Title: document.name,
            Author: 'NB Studio',
            Subject: 'Document',
            Keywords: 'document, nb studio'
          }
        });
        
        // Buffer to store PDF data
        let buffers = [];
        pdf.on('data', buffers.push.bind(buffers));
        pdf.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
        
        // Define colors (modern color scheme)
        const colors = {
          primary: '#2563EB',     // Fő kék szín
          secondary: '#1E293B',   // Sötét szürke
          accent: '#3B82F6',      // Világos kék
          text: '#1E293B',        // Sötét szöveg
          light: '#F8FAFC',       // Világos háttér
          border: '#E2E8F0',      // Szegély szín
          background: '#FFFFFF',  // Fehér háttér
          lightBlue: '#EFF6FF',   // Világos kék háttér
          darkBlue: '#1E40AF',    // Sötét kék kiemelésekhez
        };
        
        // Translations for different languages
        const translations = {
          hu: {
            documentTitle: 'DOKUMENTUM',
            createdOn: 'Készült:',
            documentContent: 'Dokumentum tartalma',
            page: 'oldal',
            company: 'NB Studio',
            footer: 'A dokumentum elektronikusan készült és érvényes aláírás nélkül is.'
          },
          de: {
            documentTitle: 'DOKUMENT',
            createdOn: 'Erstellt am:',
            documentContent: 'Dokumentinhalt',
            page: 'Seite',
            company: 'NB Studio',
            footer: 'Dieses Dokument wurde elektronisch erstellt und ist ohne Unterschrift gültig.'
          },
          en: {
            documentTitle: 'DOCUMENT',
            createdOn: 'Created on:',
            documentContent: 'Document content',
            page: 'page',
            company: 'NB Studio',
            footer: 'This document was created electronically and is valid without signature.'
          }
        };
        
        // Get translations for specified language
        const t = translations[language] || translations.en;
        
        // Thin color bar at the top of the page
        pdf.rect(0, 0, pdf.page.width, 8)
           .fill(colors.primary);
        
        // Header area
        pdf.rect(0, 8, pdf.page.width, 120)
           .fill(colors.background);
        
        // Try to add logo if it exists
        try {
          const logoPath = join(__dirname, '..', '..', 'public', 'logo.png');
          if (fs.existsSync(logoPath)) {
            pdf.image(logoPath, 50, 20, { width: 100 });
          }
        } catch (logoError) {
          console.warn('Logo loading error:', logoError.message);
        }
        
        // Document title and name
        pdf.font('Helvetica-Bold')
           .fontSize(28)
           .fillColor(colors.primary)
           .text(t.documentTitle, 50, 30)
           .fontSize(14)
           .fillColor(colors.secondary)
           .text(document.name, 50, 65);
        
        // Right column date information
        const rightColumnX = 400;
        pdf.fontSize(10)
           .fillColor(colors.secondary)
           .text(`${t.createdOn}`, rightColumnX, 30, { align: 'right' })
           .fontSize(12)
           .fillColor(colors.primary)
           .text(new Date().toLocaleDateString(
             language === 'hu' ? 'hu-HU' :
             language === 'de' ? 'de-DE' : 'en-US'
           ), rightColumnX, 45, { align: 'right' });
        
        // Thin divider line after header
        pdf.rect(50, 140, pdf.page.width - 100, 1)
           .fill(colors.border);
        
        // Company info section
        const infoStartY = 160;
        
        // Provider data
        pdf.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor(colors.primary)
           .text(t.company, 50, infoStartY);
        
        pdf.rect(50, infoStartY + 18, 220, 1)
           .fill(colors.primary);
        
        pdf.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor(colors.secondary)
           .text('Norbert Bartus', 50, infoStartY + 25)
           .font('Helvetica')
           .fontSize(9)
           .fillColor(colors.text)
           .text('Salinenstraße 25', 50, infoStartY + 40)
           .text('76646 Bruchsal, Baden-Württemberg', 50, infoStartY + 52)
           .text('Deutschland', 50, infoStartY + 64)
           .text('St.-Nr.: 68194547329', 50, infoStartY + 76)
           .text('USt-IdNr.: DE346419031', 50, infoStartY + 88);
        
        // Document content section
        const contentStartY = infoStartY + 120;
        
        // Document content title
        pdf.font('Helvetica-Bold')
           .fontSize(14)
           .fillColor(colors.primary)
           .text(t.documentContent, 50, contentStartY);
        
        pdf.rect(50, contentStartY + 18, pdf.page.width - 100, 1)
           .fill(colors.primary);
        
        // Convert HTML to plain text (basic conversion)
        const plainText = document.content
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Add document content
        pdf.font('Helvetica')
           .fontSize(11)
           .fillColor(colors.text)
           .text(plainText, 50, contentStartY + 30, {
             align: 'left',
             width: pdf.page.width - 100,
             lineGap: 5
           });
        
        // Footer with page numbers
        const pageCount = pdf.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          pdf.switchToPage(i);
          
          // Footer position
          const footerTop = pdf.page.height - 50;
          
          // Thin footer separator line
          pdf.rect(50, footerTop - 15, pdf.page.width - 100, 0.5)
             .fill(colors.border);
          
          // Footer text with page number
          pdf.font('Helvetica')
             .fontSize(8)
             .fillColor('#6B7280');
          
          // Left footer
          pdf.text(t.footer, 50, footerTop, {
            width: pdf.page.width - 200
          });
          
          // Right footer (page numbers)
          pdf.text(`${i+1}. ${t.page} / ${pageCount}`, pdf.page.width - 150, footerTop, {
            align: 'right',
            width: 100
          });
        }
        
        pdf.end();
      } catch (error) {
        reject(error);
      }
    });
  },
  
  /**
   * Share a document by email
   * @param {string} documentId 
   * @param {string} email 
   * @param {string} language 
   * @returns {Promise<Object>}
   */
  async shareDocument(documentId, email, language = 'hu') {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }
      
      // Generate a token and PIN
      const token = uuidv4();
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      // Update document with sharing information
      document.sharing = {
        isShared: true,
        token,
        pin,
        expiresAt,
        email,
        language
      };
      
      await document.save();
      
      // Determine email subject and content based on language
      let subject, content;
      const shareUrl = `https://project.nb-studio.net/documents/${token}`;
      
      switch (language) {
        case 'de':
          subject = `Dokument: ${document.name}`;
          content = `
            <p>Sehr geehrter Kunde,</p>
            <p>Anbei finden Sie das Dokument: <strong>${document.name}</strong></p>
            <p>Sie können das Dokument unter folgendem Link einsehen:</p>
            <p><a href="${shareUrl}">${shareUrl}</a></p>
            <p>PIN-Code: <strong>${pin}</strong></p>
            <p>Der Link ist gültig bis: ${expiresAt.toLocaleDateString('de-DE')}</p>
            <p>Mit freundlichen Grüßen,<br>Norbert Bartus</p>
          `;
          break;
        case 'en':
          subject = `Document: ${document.name}`;
          content = `
            <p>Dear Client,</p>
            <p>Please find the document: <strong>${document.name}</strong></p>
            <p>You can view the document at the following link:</p>
            <p><a href="${shareUrl}">${shareUrl}</a></p>
            <p>PIN code: <strong>${pin}</strong></p>
            <p>The link is valid until: ${expiresAt.toLocaleDateString('en-US')}</p>
            <p>Best regards,<br>Norbert Bartus</p>
          `;
          break;
        default: // Hungarian
          subject = `Dokumentum: ${document.name}`;
          content = `
            <p>Tisztelt Ügyfelünk!</p>
            <p>Mellékelten küldjük a következő dokumentumot: <strong>${document.name}</strong></p>
            <p>A dokumentumot az alábbi linken tekintheti meg:</p>
            <p><a href="${shareUrl}">${shareUrl}</a></p>
            <p>PIN kód: <strong>${pin}</strong></p>
            <p>A link érvényességi ideje: ${expiresAt.toLocaleDateString('hu-HU')}</p>
            <p>Üdvözlettel,<br>Bartus Norbert</p>
          `;
      }
      
      // Send email
      await transporter.sendMail({
        from: process.env.SMTP_USER || 'noreply@nb-hosting.hu',
        to: email,
        subject: subject,
        html: content
      });
      
      return {
        success: true,
        token,
        pin,
        expiresAt,
        url: shareUrl
      };
    } catch (error) {
      console.error('Error sharing document:', error);
      throw error;
    }
  },

  /**
   * Verify document PIN
   * @param {string} token 
   * @param {string} pin 
   * @returns {Promise<Document>}
   */
  async verifyDocumentPin(token, pin) {
    try {
      const document = await Document.findOne({
        'sharing.token': token
      });
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      // Check if sharing has expired
      if (document.sharing.expiresAt < new Date()) {
        throw new Error('Document sharing has expired');
      }
      
      // Verify PIN
      if (document.sharing.pin !== pin) {
        throw new Error('Invalid PIN');
      }
      
      // Update view count and timestamp
      document.sharing.views += 1;
      document.sharing.lastViewed = new Date();
      await document.save();
      
      return document;
    } catch (error) {
      console.error('Error verifying document PIN:', error);
      throw error;
    }
  },
  
  /**
   * Get default templates for document creation
   * @param {string} type 
   * @param {string} language 
   * @returns {Object}
   */
  getDefaultTemplateData(type, language = 'hu') {
    // Common data for all templates
    const commonData = {
      currentDate: new Date().toLocaleDateString(
        language === 'hu' ? 'hu-HU' : 
        language === 'de' ? 'de-DE' : 'en-US'
      ),
      companyName: 'NB Studio',
      companyAddress: 'Salinenstraße 25, 76646 Bruchsal',
      companyTaxId: 'DE346419031',
      companyEmail: 'norbert@nb-studio.net',
      companyPhone: '+49 176 3499 4651',
      companyWebsite: 'www.nb-studio.net'
    };
    
    // Return template data based on type and language
    switch (type) {
      case 'contract':
        return {
          ...commonData,
          title: language === 'hu' ? 'SZERZŐDÉS' : 
                language === 'de' ? 'VERTRAG' : 'CONTRACT'
        };
      case 'proposal':
        return {
          ...commonData,
          title: language === 'hu' ? 'ÁRAJÁNLAT' : 
                language === 'de' ? 'ANGEBOT' : 'PROPOSAL'
        };
      default:
        return commonData;
    }
  }
};

export default documentService;