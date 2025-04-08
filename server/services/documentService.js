import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DocumentTemplate, Document } from '../models/DocumentTemplate.js';

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
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: document.name,
            Author: 'NB Studio',
            Subject: 'Document',
          }
        });
        
        // Buffer to store PDF data
        let buffers = [];
        pdf.on('data', buffers.push.bind(buffers));
        pdf.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
        
        // Define colors
        const colors = {
          primary: '#4F46E5',
          text: '#1F2937',
          light: '#E5E7EB'
        };
        
        // Add document header
        pdf.font('Helvetica-Bold')
           .fontSize(28)
           .fillColor(colors.primary)
           .text('DOKUMENTUM', 50, 50)
           .fontSize(16)
           .fillColor(colors.text)
           .text(document.name, 50, 90);
        
        // Add date
        const dateText = language === 'hu' ? 'Készült:' :
                        (language === 'de' ? 'Erstellt am:' : 'Created on:');
        pdf.font('Helvetica')
           .fontSize(10)
           .text(`${dateText} ${new Date().toLocaleDateString(
             language === 'hu' ? 'hu-HU' :
             language === 'de' ? 'de-DE' : 'en-US'
           )}`, 50, 115);
        
        // Company info
        pdf.moveDown(2);
        pdf.font('Helvetica-Bold')
           .fontSize(12)
           .text('Norbert Bartus', 50, 150);
        
        pdf.font('Helvetica')
           .fontSize(10)
           .text('Salinenstraße 25', 50, 165)
           .text('76646 Bruchsal', 50, 180)
           .text('Baden-Württemberg, Deutschland', 50, 195);
        
        // Document content
        pdf.moveDown(3);
        pdf.font('Helvetica-Bold')
           .fontSize(14)
           .text(language === 'hu' ? 'Dokumentum tartalma' :
                 language === 'de' ? 'Dokumentinhalt' : 'Document content', 50, 230);
        
        pdf.moveDown();
        
        // Convert HTML to plain text (very basic)
        const plainText = document.content
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        pdf.font('Helvetica')
           .fontSize(11)
           .text(plainText, 50, 260, {
             align: 'left',
             width: pdf.page.width - 100,
             lineGap: 5
           });
        
        // Add page numbers to each page
        const pageCount = pdf.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          pdf.switchToPage(i);
          
          // Footer position
          const footerTop = pdf.page.height - 50;
          
          pdf.font('Helvetica')
             .fontSize(8)
             .fillColor('#6B7280');
          
          // Footer text with page number
          const footerText = `Norbert Bartus | St.-Nr.: 68194547329 | USt-IdNr.: DE346419031 | ${language === 'hu' ? `${i+1}. oldal` : (language === 'de' ? `Seite ${i+1}` : `Page ${i+1}`)} / ${pageCount}`;
          pdf.text(footerText, 50, footerTop, {
            align: 'center',
            width: pdf.page.width - 100
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