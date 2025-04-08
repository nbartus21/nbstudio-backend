/**
 * Service for handling document generation and templating
 */
export const documentService = {
    /**
     * Process a document template by replacing variables with actual data
     * @param {string} templateContent - The template content with variables
     * @param {Object} data - The data object containing variable values
     * @returns {string} - Processed content with variables replaced
     */
    processTemplate(templateContent, data) {
      let processedContent = templateContent;
      
      // Replace all variables
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedContent = processedContent.replace(regex, value || '');
      });
      
      // Clean up any remaining unreplaced variables
      processedContent = processedContent.replace(/{{[^{}]+}}/g, '');
      
      return processedContent;
    },
    
    /**
     * Generate default document data for the specified document type
     * @param {string} type - Document type (contract, proposal, etc.)
     * @param {string} language - Document language (hu, de, en)
     * @returns {Object} - Default document data
     */
    getDefaultTemplateData(type, language = 'hu') {
      // Common data
      const common = {
        currentDate: new Date().toLocaleDateString(language === 'hu' ? 'hu-HU' : language === 'de' ? 'de-DE' : 'en-US'),
        companyName: 'NB Studio',
        companyAddress: '1234 Budapest, Példa utca 1.',
        companyTaxId: '12345678-1-42',
        companyEmail: 'info@nb-studio.net',
        companyPhone: '+36 30 123 4567',
        companyWebsite: 'www.nb-studio.net'
      };
      
      // Type-specific templates
      switch(type) {
        case 'contract':
          return {
            ...common,
            documentTitle: language === 'hu' ? 'SZERZŐDÉS' : 
                           language === 'de' ? 'VERTRAG' : 'CONTRACT',
            contractType: language === 'hu' ? 'Vállalkozási szerződés' : 
                          language === 'de' ? 'Dienstleistungsvertrag' : 'Service agreement',
            contractNumber: `C-${Date.now().toString().slice(-6)}`,
            contactPerson: 'Bartus Norbert',
            paymentTerms: language === 'hu' ? '14 nap' : 
                          language === 'de' ? '14 Tage' : '14 days',
            notes: ''
          };
          
        case 'proposal':
          return {
            ...common,
            documentTitle: language === 'hu' ? 'ÁRAJÁNLAT' : 
                           language === 'de' ? 'ANGEBOT' : 'PROPOSAL',
            proposalNumber: `P-${Date.now().toString().slice(-6)}`,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toLocaleDateString(language === 'hu' ? 'hu-HU' : language === 'de' ? 'de-DE' : 'en-US'),
            contactPerson: 'Bartus Norbert',
            deliveryTime: language === 'hu' ? '30 nap' : 
                          language === 'de' ? '30 Tage' : '30 days',
            notes: ''
          };
        
        case 'invoice':
          return {
            ...common,
            documentTitle: language === 'hu' ? 'SZÁMLA' : 
                           language === 'de' ? 'RECHNUNG' : 'INVOICE',
            invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
            invoiceDate: new Date().toLocaleDateString(language === 'hu' ? 'hu-HU' : 
                                                       language === 'de' ? 'de-DE' : 'en-US'),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                .toLocaleDateString(language === 'hu' ? 'hu-HU' : language === 'de' ? 'de-DE' : 'en-US'),
            paymentMethod: language === 'hu' ? 'Banki átutalás' : 
                           language === 'de' ? 'Banküberweisung' : 'Bank transfer',
            bankAccount: 'DE47 6634 0014 0743 4638 00',
            swift: 'COBADEFFXXX'
          };
          
        case 'projectDoc':
          return {
            ...common,
            documentTitle: language === 'hu' ? 'PROJEKT DOKUMENTÁCIÓ' : 
                           language === 'de' ? 'PROJEKTDOKUMENTATION' : 'PROJECT DOCUMENTATION',
            docVersion: '1.0',
            lastUpdated: new Date().toLocaleDateString(language === 'hu' ? 'hu-HU' : 
                                                       language === 'de' ? 'de-DE' : 'en-US'),
            author: 'Bartus Norbert',
            status: language === 'hu' ? 'Tervezet' : 
                    language === 'de' ? 'Entwurf' : 'Draft'
          };
          
        case 'report':
          return {
            ...common,
            documentTitle: language === 'hu' ? 'JELENTÉS' : 
                           language === 'de' ? 'BERICHT' : 'REPORT',
            reportPeriod: `${new Date().getFullYear()}.${new Date().getMonth() + 1}`,
            preparedBy: 'Bartus Norbert',
            preparedFor: '',
            confidentiality: language === 'hu' ? 'Bizalmas' : 
                             language === 'de' ? 'Vertraulich' : 'Confidential'
          };
        
        default:
          return common;
      }
    },
    
    /**
     * Get template content for the specified document type
     * @param {string} type - Document type
     * @param {string} language - Document language
     * @returns {string} - Default template content
     */
    getTemplateContent(type, language = 'hu') {
      switch(type) {
        case 'contract':
          return this.getContractTemplate(language);
        case 'proposal':
          return this.getProposalTemplate(language);
        case 'invoice':
          return this.getInvoiceTemplate(language);
        case 'projectDoc':
          return this.getProjectDocTemplate(language);
        case 'report':
          return this.getReportTemplate(language);
        default:
          return '';
      }
    },
    
    /**
     * Get contract template
     * @param {string} language - Template language
     * @returns {string} - Contract template
     */
    getContractTemplate(language = 'hu') {
      if (language === 'hu') {
        return `<div style="text-align: center; margin-bottom: 20px;">
    <h1>{{documentTitle}}</h1>
    <h2>{{contractType}}</h2>
    <p>Szerződésszám: {{contractNumber}}</p>
  </div>
  
  <p>
    Amely létrejött egyrészről az<br>
    <strong>{{companyName}}</strong><br>
    Székhely: {{companyAddress}}<br>
    Adószám: {{companyTaxId}}<br>
    Képviseli: {{contactPerson}}<br>
    mint Vállalkozó (továbbiakban: Vállalkozó)
  </p>
  
  <p>
    másrészről a<br>
    <strong>{{clientName}}</strong><br>
    Székhely: {{clientAddress}}<br>
    Adószám: {{clientTaxId}}<br>
    Képviseli: {{clientContactName}}<br>
    mint Megrendelő (továbbiakban: Megrendelő)
  </p>
  
  <p>között az alábbi feltételekkel:</p>
  
  <h3>1. A szerződés tárgya</h3>
  <p>Vállalkozó kötelezettséget vállal az alábbi szolgáltatások elvégzésére:</p>
  <p>{{projectDescription}}</p>
  
  <h3>2. Teljesítési határidő</h3>
  <p>A munka kezdetének időpontja: {{projectStartDate}}</p>
  <p>A teljesítés határideje: {{projectEndDate}}</p>
  
  <h3>3. Vállalkozói díj</h3>
  <p>A Vállalkozó a fenti 1. pontban meghatározott szolgáltatások teljesítéséért az alábbi díjazásra jogosult:</p>
  <p>Vállalkozói díj: {{projectBudget}}</p>
  <p>Fizetési ütemezés: {{paymentTerms}}</p>
  
  <h3>4. Egyéb rendelkezések</h3>
  <p>{{notes}}</p>
  
  <p>Jelen szerződés {{currentDate}} napon készült és lép hatályba.</p>
  
  <div style="display: flex; justify-content: space-between; margin-top: 50px;">
    <div style="width: 45%;">
      <hr style="margin-bottom: 10px;">
      <p>Vállalkozó</p>
    </div>
    <div style="width: 45%;">
      <hr style="margin-bottom: 10px;">
      <p>Megrendelő</p>
    </div>
  </div>`;
      } else if (language === 'de') {
        return `<div style="text-align: center; margin-bottom: 20px;">
    <h1>{{documentTitle}}</h1>
    <h2>{{contractType}}</h2>
    <p>Vertragsnummer: {{contractNumber}}</p>
  </div>
  
  <p>
    Abgeschlossen zwischen<br>
    <strong>{{companyName}}</strong><br>
    Sitz: {{companyAddress}}<br>
    Steuernummer: {{companyTaxId}}<br>
    Vertreten durch: {{contactPerson}}<br>
    als Auftragnehmer (im Folgenden: Auftragnehmer)
  </p>
  
  <p>
    und<br>
    <strong>{{clientName}}</strong><br>
    Sitz: {{clientAddress}}<br>
    Steuernummer: {{clientTaxId}}<br>
    Vertreten durch: {{clientContactName}}<br>
    als Auftraggeber (im Folgenden: Auftraggeber)
  </p>
  
  <p>unter den folgenden Bedingungen:</p>
  
  <h3>1. Vertragsgegenstand</h3>
  <p>Der Auftragnehmer verpflichtet sich zur Erbringung der folgenden Dienstleistungen:</p>
  <p>{{projectDescription}}</p>
  
  <h3>2. Leistungsfrist</h3>
  <p>Beginn der Arbeit: {{projectStartDate}}</p>
  <p>Fertigstellungstermin: {{projectEndDate}}</p>
  
  <h3>3. Vergütung</h3>
  <p>Für die unter Punkt 1 genannten Dienstleistungen erhält der Auftragnehmer folgende Vergütung:</p>
  <p>Vergütung: {{projectBudget}}</p>
  <p>Zahlungsbedingungen: {{paymentTerms}}</p>
  
  <h3>4. Sonstige Bestimmungen</h3>
  <p>{{notes}}</p>
  
  <p>Dieser Vertrag wurde am {{currentDate}} erstellt und tritt in Kraft.</p>
  
  <div style="display: flex; justify-content: space-between; margin-top: 50px;">
    <div style="width: 45%;">
      <hr style="margin-bottom: 10px;">
      <p>Auftragnehmer</p>
    </div>
    <div style="width: 45%;">
      <hr style="margin-bottom: 10px;">
      <p>Auftraggeber</p>
    </div>
  </div>`;
      } else {
        return `<div style="text-align: center; margin-bottom: 20px;">
    <h1>{{documentTitle}}</h1>
    <h2>{{contractType}}</h2>
    <p>Contract Number: {{contractNumber}}</p>
  </div>
  
  <p>
    This agreement is made between<br>
    <strong>{{companyName}}</strong><br>
    Registered office: {{companyAddress}}<br>
    Tax ID: {{companyTaxId}}<br>
    Represented by: {{contactPerson}}<br>
    as the Contractor (hereinafter: Contractor)
  </p>
  
  <p>
    and<br>
    <strong>{{clientName}}</strong><br>
    Registered office: {{clientAddress}}<br>
    Tax ID: {{clientTaxId}}<br>
    Represented by: {{clientContactName}}<br>
    as the Client (hereinafter: Client)
  </p>
  
  <p>under the following terms and conditions:</p>
  
  <h3>1. Subject of the Contract</h3>
  <p>The Contractor undertakes to perform the following services:</p>
  <p>{{projectDescription}}</p>
  
  <h3>2. Deadlines</h3>
  <p>Start date: {{projectStartDate}}</p>
  <p>Completion date: {{projectEndDate}}</p>
  
  <h3>3. Fees</h3>
  <p>For the services specified in Point 1, the Contractor is entitled to the following compensation:</p>
  <p>Fee: {{projectBudget}}</p>
  <p>Payment terms: {{paymentTerms}}</p>
  
  <h3>4. Other Provisions</h3>
  <p>{{notes}}</p>
  
  <p>This contract was prepared and enters into force on {{currentDate}}.</p>
  
  <div style="display: flex; justify-content: space-between; margin-top: 50px;">
    <div style="width: 45%;">
      <hr style="margin-bottom: 10px;">
      <p>Contractor</p>
    </div>
    <div style="width: 45%;">
      <hr style="margin-bottom: 10px;">
      <p>Client</p>
    </div>
  </div>`;
      }
    },
    
    /**
     * Get proposal template
     * @param {string} language - Template language
     * @returns {string} - Proposal template
     */
    getProposalTemplate(language = 'hu') {
      if (language === 'hu') {
        return `<div style="text-align: center; margin-bottom: 20px;">
    <h1>{{documentTitle}}</h1>
    <p>Ajánlat száma: {{proposalNumber}}</p>
    <p>Érvényes: {{validUntil}}</p>
  </div>
  
  <div style="display: flex; justify-content: space-between;">
    <div>
      <h3>Szolgáltató</h3>
      <p>
        <strong>{{companyName}}</strong><br>
        {{companyAddress}}<br>
        Adószám: {{companyTaxId}}<br>
        Email: {{companyEmail}}<br>
        Telefon: {{companyPhone}}
      </p>
    </div>
    <div>
      <h3>Ügyfél</h3>
      <p>
        <strong>{{clientName}}</strong><br>
        {{clientAddress}}<br>
        {{clientEmail}}<br>
        {{clientPhone}}
      </p>
    </div>
  </div>
  
  <h3>Tisztelt {{clientName}}!</h3>
  
  <p>Köszönjük érdeklődését szolgáltatásaink iránt. Az alábbiakban részletezzük ajánlatunkat a {{projectName}} projektre vonatkozóan.</p>
  
  <h3>1. Projekt leírása</h3>
  <p>{{projectDescription}}</p>
  
  <h3>2. Árajánlat részletei</h3>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Megnevezés</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Mennyiség</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Egységár</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Összesen</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">Fejlesztés</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">1</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{item1Price}} EUR</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{item1Price}} EUR</td>
      </tr>
      <tr>
        <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">Kiegészítő szolgáltatások</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">1</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{item2Price}} EUR</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{item2Price}} EUR</td>
      </tr>
      <tr style="font-weight: bold;">
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;" colspan="3">Összesen:</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{totalPrice}} EUR</td>
      </tr>
    </tbody>
  </table>
  
  <h3>3. Teljesítési határidő</h3>
  <p>Vállalt teljesítési határidő: {{deliveryTime}} a megrendelés visszaigazolásától számítva.</p>
  
  <h3>4. Fizetési feltételek</h3>
  <p>- 50% előleg a szerződéskötéskor<br>
  - 50% a teljesítéskor</p>
  
  <h3>5. Egyéb feltételek</h3>
  <p>{{notes}}</p>
  
  <p>Bízunk benne, hogy ajánlatunk elnyeri tetszését. Kérdés esetén állunk rendelkezésére.</p>
  
  <p>Üdvözlettel,<br>
  {{contactPerson}}<br>
  {{companyName}}</p>
  
  <p style="margin-top: 30px; font-size: 12px; color: #666;">
    Ez az ajánlat {{validUntil}} napig érvényes. Az árak nettó árak, nem tartalmazzák az ÁFÁ-t.
  </p>`;
      } else if (language === 'de') {
        return `<div style="text-align: center; margin-bottom: 20px;">
    <h1>{{documentTitle}}</h1>
    <p>Angebotsnummer: {{proposalNumber}}</p>
    <p>Gültig bis: {{validUntil}}</p>
  </div>
  
  <div style="display: flex; justify-content: space-between;">
    <div>
      <h3>Anbieter</h3>
      <p>
        <strong>{{companyName}}</strong><br>
        {{companyAddress}}<br>
        Steuernummer: {{companyTaxId}}<br>
        E-Mail: {{companyEmail}}<br>
        Telefon: {{companyPhone}}
      </p>
    </div>
    <div>
      <h3>Kunde</h3>
      <p>
        <strong>{{clientName}}</strong><br>
        {{clientAddress}}<br>
        {{clientEmail}}<br>
        {{clientPhone}}
      </p>
    </div>
  </div>
  
  <h3>Sehr geehrte(r) {{clientName}},</h3>
  
  <p>Vielen Dank für Ihr Interesse an unseren Dienstleistungen. Im Folgenden finden Sie unser Angebot für das Projekt {{projectName}}.</p>
  
  <h3>1. Projektbeschreibung</h3>
  <p>{{projectDescription}}</p>
  
  <h3>2. Angebotsdetails</h3>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Bezeichnung</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Menge</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Einzelpreis</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Gesamt</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">Entwicklung</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">1</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{item1Price}} EUR</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{item1Price}} EUR</td>
      </tr>
      <tr>
        <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">Zusatzleistungen</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">1</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{item2Price}} EUR</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{item2Price}} EUR</td>
      </tr>
      <tr style="font-weight: bold;">
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;" colspan="3">Gesamtsumme:</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{totalPrice}} EUR</td>
      </tr>
    </tbody>
  </table>
  
  <h3>3. Lieferzeit</h3>
  <p>Zugesagte Lieferzeit: {{deliveryTime}} ab Auftragsbestätigung.</p>
  
  <h3>4. Zahlungsbedingungen</h3>
  <p>- 50% Anzahlung bei Vertragsunterzeichnung<br>
  - 50% bei Lieferung</p>
  
  <h3>5. Sonstige Bedingungen</h3>
  <p>{{notes}}</p>
  
  <p>Wir hoffen, dass unser Angebot Ihren Anforderungen entspricht. Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
  
  <p>Mit freundlichen Grüßen,<br>
  {{contactPerson}}<br>
  {{companyName}}</p>
  
  <p style="margin-top: 30px; font-size: 12px; color: #666;">
    Dieses Angebot ist gültig bis {{validUntil}}. Alle Preise sind Nettopreise ohne MwSt.
  </p>`;
      } else {
        return `<div style="text-align: center; margin-bottom: 20px;">
    <h1>{{documentTitle}}</h1>
    <p>Proposal Number: {{proposalNumber}}</p>
    <p>Valid until: {{validUntil}}</p>
  </div>
  
  <div style="display: flex; justify-content: space-between;">
    <div>
      <h3>Provider</h3>
      <p>
        <strong>{{companyName}}</strong><br>
        {{companyAddress}}<br>
        Tax ID: {{companyTaxId}}<br>
        Email: {{companyEmail}}<br>
        Phone: {{companyPhone}}
      </p>
    </div>
    <div>
      <h3>Client</h3>
      <p>
        <strong>{{clientName}}</strong><br>
        {{clientAddress}}<br>
        {{clientEmail}}<br>
        {{clientPhone}}
      </p>
    </div>
  </div>
  
  <h3>Dear {{clientName}},</h3>
  
  <p>Thank you for your interest in our services. Please find below our proposal for the {{projectName}} project.</p>
  
  <h3>1. Project Description</h3>
  <p>{{projectDescription}}</p>
  
  <h3>2. Proposal Details</h3>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Description</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Quantity</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Unit Price</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">Development</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">1</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{item1Price}} EUR</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{item1Price}} EUR</td>
      </tr>
      <tr>
        <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">Additional Services</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">1</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{item2Price}} EUR</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{item2Price}} EUR</td>
      </tr>
      <tr style="font-weight: bold;">
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;" colspan="3">Total:</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{{totalPrice}} EUR</td>
      </tr>
    </tbody>
  </table>
  
  <h3>3. Delivery Time</h3>
  <p>Estimated delivery time: {{deliveryTime}} from order confirmation.</p>
  
  <h3>4. Payment Terms</h3>
  <p>- 50% advance payment upon contract signing<br>
  - 50% upon completion</p>
  
  <h3>5. Other Terms</h3>
  <p>{{notes}}</p>
  
  <p>We hope that our proposal meets your requirements. If you have any questions, please do not hesitate to contact us.</p>
  
  <p>Best regards,<br>
  {{contactPerson}}<br>
  {{companyName}}</p>
  
  <p style="margin-top: 30px; font-size: 12px; color: #666;">
    This proposal is valid until {{validUntil}}. All prices are net prices excluding VAT.
  </p>`;
      }
    },
    
    /**
     * Get the template for other document types
     * These methods would implement similar template patterns
     */
    getInvoiceTemplate(language = 'hu') {
      return `
        <style>
          body {
            font-family: 'Arial', sans-serif;
            color: #333;
            line-height: 1.6;
          }
          .container {
            padding: 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
          }
          .company-info {
            flex: 1;
          }
          .invoice-info {
            text-align: right;
          }
          .invoice-number {
            font-size: 24px;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .details {
            margin: 30px 0;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .table th {
            background-color: #f3f4f6;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #e5e7eb;
          }
          .table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          .total {
            text-align: right;
            margin-top: 30px;
            font-size: 18px;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #666;
          }
        </style>
        <div class="container">
          <div class="header">
            <div class="company-info">
              <h1 style="color: #2563eb; margin: 0;">NB-Studio</h1>
              <p>{{companyAddress}}</p>
              <p>{{companyEmail}}</p>
              <p>{{companyPhone}}</p>
            </div>
            <div class="invoice-info">
              <div class="invoice-number">Számla #{{invoiceNumber}}</div>
              <p>Dátum: {{currentDate}}</p>
              <p>Fizetési határidő: {{dueDate}}</p>
            </div>
          </div>

          <div class="details">
            <h3>Számlázási adatok:</h3>
            <p>{{clientName}}</p>
            <p>{{clientAddress}}</p>
            <p>{{clientTaxNumber}}</p>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Tétel</th>
                <th>Mennyiség</th>
                <th>Egységár</th>
                <th>Összesen</th>
              </tr>
            </thead>
            <tbody>
              {{#each items}}
              <tr>
                <td>{{name}}</td>
                <td>{{quantity}}</td>
                <td>{{price}} Ft</td>
                <td>{{total}} Ft</td>
              </tr>
              {{/each}}
            </tbody>
          </table>

          <div class="total">
            <p>Részösszeg: {{subtotal}} Ft</p>
            <p>ÁFA ({{vatRate}}%): {{vatAmount}} Ft</p>
            <h2>Végösszeg: {{total}} Ft</h2>
          </div>

          <div class="footer">
            <p>Köszönjük, hogy minket választott!</p>
            <p>www.nb-studio.net</p>
          </div>
        </div>
      `;
    },
    
    getProjectDocTemplate(language = 'hu') {
      // Project documentation template
      return this.getGenericTemplate('projectDoc', language);
    },
    
    getReportTemplate(language = 'hu') {
      // Report template
      return this.getGenericTemplate('report', language);
    },
    
    /**
     * Generic template for other document types
     */
    getGenericTemplate(type, language) {
      return `<div style="text-align: center; margin-bottom: 20px;">
    <h1>{{documentTitle}}</h1>
  </div>
  
  <div style="display: flex; justify-content: space-between;">
    <div>
      <strong>{{companyName}}</strong><br>
      {{companyAddress}}<br>
      {{companyEmail}}<br>
      {{companyPhone}}
    </div>
    <div>
      <p>Dátum: {{currentDate}}</p>
    </div>
  </div>
  
  <hr style="margin: 20px 0;">
  
  <!-- Document specific content would go here -->
  <p>Projekt: {{projectName}}</p>
  <p>Leírás: {{projectDescription}}</p>
  
  <hr style="margin: 20px 0;">
  
  <p style="font-size: 12px; color: #666; text-align: center;">
    {{companyName}} - {{companyWebsite}}
  </p>`;
    },
    
    /**
     * Generate HTML to PDF options
     * @returns {Object} - PDF generation options
     */
    getPdfOptions() {
      return {
        format: 'A4',
        margin: {
          top: '30mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        headerTemplate: `
          <div style="width: 100%; padding: 20px; border-bottom: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 24px; font-weight: bold; color: #333;">
                NB-Studio
              </div>
              <div style="font-size: 12px; color: #666;">
                ${new Date().toLocaleDateString('hu-HU')}
              </div>
            </div>
          </div>
        `,
        footerTemplate: `
          <div style="width: 100%; padding: 10px 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #eee;">
            <div style="margin-bottom: 5px;">NB-Studio | www.nb-studio.net</div>
            <div>Oldal <span class="pageNumber"></span> / <span class="totalPages"></span></div>
          </div>
        `,
        displayHeaderFooter: true,
        preferCSSPageSize: true
      };
    }
  };
  
  export default documentService;