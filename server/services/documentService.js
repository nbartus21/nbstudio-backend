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
      const title = language === 'hu' ? 'SZÁMLA' : 
                    language === 'de' ? 'RECHNUNG' : 'INVOICE';
      
      return `<div style="font-family: 'Helvetica', 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 0;">
        <!-- Header with modern blue background -->
        <div style="background-color: #3182CE; color: white; padding: 30px 40px; border-radius: 4px 4px 0 0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="font-size: 36px; margin: 0; font-weight: 700;">${title}</h1>
              <p style="font-size: 16px; margin: 5px 0 0;">{{invoiceNumber}}</p>
            </div>
            <div style="text-align: right;">
              <div style="background-color: rgba(255, 255, 255, 0.2); padding: 10px 15px; border-radius: 4px;">
                <p style="margin: 0 0 5px; font-size: 12px;">Kiállítás dátuma:</p>
                <p style="margin: 0; font-size: 16px; font-weight: 500;">{{invoiceDate}}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Color accent bar -->
        <div style="height: 4px; background-color: #4FD1C5;"></div>
        
        <!-- Main content -->
        <div style="background-color: white; padding: 40px; border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0;">
          <!-- Company and client information -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
            <div style="width: 48%;">
              <h2 style="font-size: 16px; color: #2D3748; margin: 0 0 10px; text-transform: uppercase; font-weight: 600;">Kiállító</h2>
              <div style="padding: 15px; background-color: #F7FAFC; border-radius: 4px; border-left: 3px solid #3182CE;">
                <p style="margin: 0 0 8px; font-weight: 600; color: #3182CE;">{{companyName}}</p>
                <p style="margin: 0 0 4px; font-size: 14px; color: #4A5568;">{{companyAddress}}</p>
                <p style="margin: 0 0 4px; font-size: 14px; color: #4A5568;">Adószám: {{companyTaxId}}</p>
                <p style="margin: 0 0 4px; font-size: 14px; color: #4A5568;">{{companyEmail}}</p>
                <p style="margin: 0; font-size: 14px; color: #4A5568;">{{companyPhone}}</p>
              </div>
            </div>
            <div style="width: 48%;">
              <h2 style="font-size: 16px; color: #2D3748; margin: 0 0 10px; text-transform: uppercase; font-weight: 600;">Vevő</h2>
              <div style="padding: 15px; background-color: #F7FAFC; border-radius: 4px; border-left: 3px solid #4FD1C5;">
                <p style="margin: 0 0 8px; font-weight: 600; color: #2D3748;">{{clientName}}</p>
                <p style="margin: 0 0 4px; font-size: 14px; color: #4A5568;">{{clientAddress}}</p>
                <p style="margin: 0 0 4px; font-size: 14px; color: #4A5568;">{{clientEmail}}</p>
                <p style="margin: 0; font-size: 14px; color: #4A5568;">Adószám: {{clientTaxNumber}}</p>
              </div>
            </div>
          </div>
          
          <!-- Invoice items -->
          <div style="margin-bottom: 40px;">
            <h2 style="font-size: 16px; color: #2D3748; margin: 0 0 15px; text-transform: uppercase; font-weight: 600;">Tételek</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #2D3748; color: white;">
                  <th style="padding: 10px 15px; text-align: left; font-weight: 500; font-size: 14px; border-radius: 4px 0 0 0;">Tétel</th>
                  <th style="padding: 10px 15px; text-align: right; font-weight: 500; font-size: 14px;">Mennyiség</th>
                  <th style="padding: 10px 15px; text-align: right; font-weight: 500; font-size: 14px;">Egységár</th>
                  <th style="padding: 10px 15px; text-align: right; font-weight: 500; font-size: 14px; border-radius: 0 4px 0 0;">Összesen</th>
                </tr>
              </thead>
              <tbody>
                <tr style="background-color: #F7FAFC;">
                  <td style="padding: 12px 15px; border-bottom: 1px solid #E2E8F0; font-size: 14px;">{{item1Description}}</td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #E2E8F0; text-align: right; font-size: 14px;">{{item1Quantity}}</td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #E2E8F0; text-align: right; font-size: 14px;">{{item1Price}} EUR</td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #E2E8F0; text-align: right; font-size: 14px;">{{item1Total}} EUR</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #E2E8F0; font-size: 14px;">{{item2Description}}</td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #E2E8F0; text-align: right; font-size: 14px;">{{item2Quantity}}</td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #E2E8F0; text-align: right; font-size: 14px;">{{item2Price}} EUR</td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #E2E8F0; text-align: right; font-size: 14px;">{{item2Total}} EUR</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 15px; text-align: right; font-weight: 600; font-size: 14px; color: #2D3748;">Végösszeg:</td>
                  <td style="padding: 15px; text-align: right; font-weight: 700; font-size: 16px; color: #3182CE; background-color: #EBF8FF; border-radius: 0 0 4px 0;">{{totalPrice}} EUR</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <!-- Payment Information -->
          <div style="margin-bottom: 40px;">
            <h2 style="font-size: 16px; color: #2D3748; margin: 0 0 15px; text-transform: uppercase; font-weight: 600;">Fizetési információk</h2>
            <div style="background-color: #F7FAFC; border-radius: 4px; padding: 15px; border-left: 3px solid #3182CE;">
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #4A5568; width: 30%;">Fizetési határidő:</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #2D3748; font-weight: 500;">{{dueDate}}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #4A5568;">Bankszámlaszám:</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #2D3748; font-weight: 500;">{{bankAccount}}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #4A5568;">SWIFT/BIC:</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #2D3748; font-weight: 500;">{{swift}}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #4A5568;">Közlemény:</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #2D3748; font-weight: 500;">{{invoiceNumber}}</td>
                </tr>
              </table>
            </div>
          </div>
          
          <!-- Notes -->
          <div style="margin-bottom: 40px;">
            <h2 style="font-size: 16px; color: #2D3748; margin: 0 0 15px; text-transform: uppercase; font-weight: 600;">Megjegyzések</h2>
            <div style="background-color: #F7FAFC; border-radius: 4px; padding: 15px; font-size: 14px; color: #4A5568;">
              <p style="margin: 0; line-height: 1.6;">{{notes}}</p>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #2D3748; color: white; padding: 20px; text-align: center; border-radius: 0 0 4px 4px;">
          <p style="margin: 0 0 5px; font-size: 14px;">{{companyName}} | {{companyWebsite}}</p>
          <p style="margin: 0; font-size: 12px; color: #A0AEC0;">Ez a számla elektronikusan készült és érvényes aláírás nélkül is.</p>
        </div>
      </div>`;
    },
    
    getProjectDocTemplate(language = 'hu') {
      const title = language === 'hu' ? 'PROJEKT DOKUMENTÁCIÓ' : 
                    language === 'de' ? 'PROJEKTDOKUMENTATION' : 'PROJECT DOCUMENTATION';
      const versionLabel = language === 'hu' ? 'Verzió' : 
                          language === 'de' ? 'Version' : 'Version';
      const dateLabel = language === 'hu' ? 'Dátum' : 
                       language === 'de' ? 'Datum' : 'Date';
      const statusLabel = language === 'hu' ? 'Státusz' : 
                         language === 'de' ? 'Status' : 'Status';
                         
      return `<div style="font-family: 'Helvetica', 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 0;">
        <!-- Header with accent border -->
        <div style="border-top: 6px solid #6B46C1; background-color: white; padding: 30px 40px; text-align: center;">
          <h1 style="font-size: 32px; margin: 0 0 10px; font-weight: 700; color: #2D3748;">${title}</h1>
          <p style="font-size: 18px; margin: 0; font-weight: 300; color: #4A5568;">{{projectName}}</p>
        </div>
        
        <!-- Document info bar -->
        <div style="background-color: #F7FAFC; padding: 15px 40px; display: flex; justify-content: space-between; border-bottom: 1px solid #E2E8F0; border-top: 1px solid #E2E8F0;">
          <div style="display: flex; align-items: center;">
            <span style="font-size: 14px; font-weight: 600; color: #4A5568; margin-right: 10px;">${versionLabel}:</span>
            <span style="font-size: 14px; color: #6B46C1; font-weight: 500;">{{docVersion}}</span>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="font-size: 14px; font-weight: 600; color: #4A5568; margin-right: 10px;">${dateLabel}:</span>
            <span style="font-size: 14px; color: #2D3748;">{{lastUpdated}}</span>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="font-size: 14px; font-weight: 600; color: #4A5568; margin-right: 10px;">${statusLabel}:</span>
            <span style="font-size: 14px; background-color: #E9D8FD; color: #6B46C1; padding: 2px 8px; border-radius: 4px; font-weight: 500;">{{status}}</span>
          </div>
        </div>
        
        <!-- Main content -->
        <div style="background-color: white; padding: 40px; border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0;">
          <!-- Table of Contents -->
          <div style="margin-bottom: 40px;">
            <h2 style="font-size: 22px; color: #2D3748; margin: 0 0 20px; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px;">Tartalomjegyzék</h2>
            <ul style="list-style-type: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 8px;">
                <a href="#introduction" style="display: flex; text-decoration: none;">
                  <span style="width: 25px; height: 25px; background-color: #6B46C1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 12px; font-weight: 600;">1</span>
                  <span style="color: #4A5568; font-size: 16px; font-weight: 500;">Bevezetés</span>
                </a>
              </li>
              <li style="margin-bottom: 8px;">
                <a href="#scope" style="display: flex; text-decoration: none;">
                  <span style="width: 25px; height: 25px; background-color: #6B46C1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 12px; font-weight: 600;">2</span>
                  <span style="color: #4A5568; font-size: 16px; font-weight: 500;">Projekt területe és célkitűzések</span>
                </a>
              </li>
              <li style="margin-bottom: 8px;">
                <a href="#timelines" style="display: flex; text-decoration: none;">
                  <span style="width: 25px; height: 25px; background-color: #6B46C1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 12px; font-weight: 600;">3</span>
                  <span style="color: #4A5568; font-size: 16px; font-weight: 500;">Ütemterv és mérföldkövek</span>
                </a>
              </li>
              <li style="margin-bottom: 8px;">
                <a href="#deliverables" style="display: flex; text-decoration: none;">
                  <span style="width: 25px; height: 25px; background-color: #6B46C1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 12px; font-weight: 600;">4</span>
                  <span style="color: #4A5568; font-size: 16px; font-weight: 500;">Várt eredmények</span>
                </a>
              </li>
            </ul>
          </div>
          
          <!-- Introduction Section -->
          <div id="introduction" style="margin-bottom: 40px;">
            <h2 style="font-size: 22px; color: #2D3748; margin: 0 0 20px; display: flex; align-items: center;">
              <span style="width: 32px; height: 32px; background-color: #6B46C1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 14px; font-weight: 600;">1</span>
              Bevezetés
            </h2>
            <div style="background-color: #F7FAFC; border-radius: 8px; padding: 25px; font-size: 16px; color: #4A5568; line-height: 1.6; border-left: 4px solid #6B46C1;">
              <p style="margin: 0 0 15px;">{{projectDescription}}</p>
              <p style="margin: 0;">A projekt {{{companyName}}} által került megvalósításra {{clientName}} részére.</p>
            </div>
          </div>
          
          <!-- Project Scope Section -->
          <div id="scope" style="margin-bottom: 40px;">
            <h2 style="font-size: 22px; color: #2D3748; margin: 0 0 20px; display: flex; align-items: center;">
              <span style="width: 32px; height: 32px; background-color: #6B46C1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 14px; font-weight: 600;">2</span>
              Projekt területe és célkitűzések
            </h2>
            <div style="background-color: #F7FAFC; border-radius: 8px; padding: 25px; font-size: 16px; color: #4A5568; line-height: 1.6;">
              <h3 style="font-size: 18px; color: #2D3748; margin: 0 0 15px;">Célkitűzések</h3>
              <ul style="margin: 0 0 20px; padding-left: 20px;">
                <li style="margin-bottom: 10px;">{{objective1}}</li>
                <li style="margin-bottom: 10px;">{{objective2}}</li>
                <li>{{objective3}}</li>
              </ul>
              
              <h3 style="font-size: 18px; color: #2D3748; margin: 0 0 15px;">Technikai környezet</h3>
              <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                <span style="background-color: #E9D8FD; color: #6B46C1; padding: 5px 12px; border-radius: 16px; font-size: 14px;">{{technology1}}</span>
                <span style="background-color: #E9D8FD; color: #6B46C1; padding: 5px 12px; border-radius: 16px; font-size: 14px;">{{technology2}}</span>
                <span style="background-color: #E9D8FD; color: #6B46C1; padding: 5px 12px; border-radius: 16px; font-size: 14px;">{{technology3}}</span>
              </div>
            </div>
          </div>
          
          <!-- Remaining sections would continue with similar styling -->
          
        </div>
        
        <!-- Footer -->
        <div style="background-color: #2D3748; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 5px; font-size: 14px;">{{companyName}} | {{companyWebsite}}</p>
          <p style="margin: 0; font-size: 12px; color: #A0AEC0;">{{author}} által készítve | {{lastUpdated}}</p>
        </div>
      </div>`;
    },
    
    getReportTemplate(language = 'hu') {
      const title = language === 'hu' ? 'JELENTÉS' : 
                    language === 'de' ? 'BERICHT' : 'REPORT';
                    
      return `<div style="font-family: 'Helvetica', 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 0;">
        <!-- Header with gradient background -->
        <div style="background: linear-gradient(135deg, #3182CE 0%, #2C5282 100%); color: white; padding: 40px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="font-size: 36px; margin: 0 0 5px; font-weight: 700;">${title}</h1>
          <p style="font-size: 18px; margin: 0; opacity: 0.9;">{{reportPeriod}}</p>
        </div>
        
        <!-- Report info bar -->
        <div style="background-color: #EBF8FF; padding: 15px 40px; display: flex; justify-content: space-between; border-bottom: 1px solid #BEE3F8;">
          <div>
            <span style="font-size: 14px; font-weight: 500; color: #2C5282;">Készítette: {{preparedBy}}</span>
          </div>
          <div>
            <span style="font-size: 14px; font-weight: 500; color: #2C5282;">{{currentDate}}</span>
          </div>
          <div>
            <span style="font-size: 14px; background-color: #2C5282; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 500;">{{confidentiality}}</span>
          </div>
        </div>
        
        <!-- Main content -->
        <div style="background-color: white; padding: 40px; border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0;">
          <!-- Executive Summary -->
          <div style="margin-bottom: 40px;">
            <h2 style="font-size: 24px; color: #2C5282; margin: 0 0 20px; padding-bottom: 10px; border-bottom: 2px solid #BEE3F8;">Vezetői összefoglaló</h2>
            <div style="background-color: #EBF8FF; border-radius: 8px; padding: 25px; font-size: 16px; color: #2D3748; line-height: 1.6; border-left: 4px solid #3182CE;">
              <p style="margin: 0;">{{executiveSummary}}</p>
            </div>
          </div>
          
          <!-- Key Metrics -->
          <div style="margin-bottom: 40px;">
            <h2 style="font-size: 24px; color: #2C5282; margin: 0 0 20px; padding-bottom: 10px; border-bottom: 2px solid #BEE3F8;">Fő mutatók</h2>
            
            <!-- Metrics Grid -->
            <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px;">
              <!-- Metric Card 1 -->
              <div style="flex: 1; min-width: 200px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #E2E8F0;">
                <div style="padding: 15px; background-color: #3182CE; color: white;">
                  <h3 style="margin: 0; font-size: 16px; font-weight: 500;">{{metric1Label}}</h3>
                </div>
                <div style="padding: 20px; text-align: center;">
                  <p style="font-size: 32px; font-weight: 700; margin: 0 0 10px; color: #2D3748;">{{metric1Value}}</p>
                  <p style="font-size: 14px; color: #718096; margin: 0;">{{metric1Change}}</p>
                </div>
              </div>
              
              <!-- Metric Card 2 -->
              <div style="flex: 1; min-width: 200px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #E2E8F0;">
                <div style="padding: 15px; background-color: #38B2AC; color: white;">
                  <h3 style="margin: 0; font-size: 16px; font-weight: 500;">{{metric2Label}}</h3>
                </div>
                <div style="padding: 20px; text-align: center;">
                  <p style="font-size: 32px; font-weight: 700; margin: 0 0 10px; color: #2D3748;">{{metric2Value}}</p>
                  <p style="font-size: 14px; color: #718096; margin: 0;">{{metric2Change}}</p>
                </div>
              </div>
              
              <!-- Metric Card 3 -->
              <div style="flex: 1; min-width: 200px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #E2E8F0;">
                <div style="padding: 15px; background-color: #9F7AEA; color: white;">
                  <h3 style="margin: 0; font-size: 16px; font-weight: 500;">{{metric3Label}}</h3>
                </div>
                <div style="padding: 20px; text-align: center;">
                  <p style="font-size: 32px; font-weight: 700; margin: 0 0 10px; color: #2D3748;">{{metric3Value}}</p>
                  <p style="font-size: 14px; color: #718096; margin: 0;">{{metric3Change}}</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Detailed Analysis -->
          <div style="margin-bottom: 40px;">
            <h2 style="font-size: 24px; color: #2C5282; margin: 0 0 20px; padding-bottom: 10px; border-bottom: 2px solid #BEE3F8;">Részletes elemzés</h2>
            
            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 18px; color: #2C5282; margin: 0 0 15px;">{{section1Title}}</h3>
              <p style="font-size: 16px; color: #4A5568; line-height: 1.6; margin: 0 0 15px;">{{section1Content}}</p>
              
              <!-- Example Table -->
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                  <tr style="background-color: #EBF8FF;">
                    <th style="padding: 12px 15px; text-align: left; border: 1px solid #BEE3F8; color: #2C5282;">{{table1Header1}}</th>
                    <th style="padding: 12px 15px; text-align: right; border: 1px solid #BEE3F8; color: #2C5282;">{{table1Header2}}</th>
                    <th style="padding: 12px 15px; text-align: right; border: 1px solid #BEE3F8; color: #2C5282;">{{table1Header3}}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 12px 15px; border: 1px solid #BEE3F8; color: #4A5568;">{{table1Row1Col1}}</td>
                    <td style="padding: 12px 15px; text-align: right; border: 1px solid #BEE3F8; color: #4A5568;">{{table1Row1Col2}}</td>
                    <td style="padding: 12px 15px; text-align: right; border: 1px solid #BEE3F8; color: #4A5568;">{{table1Row1Col3}}</td>
                  </tr>
                  <tr style="background-color: #F7FAFC;">
                    <td style="padding: 12px 15px; border: 1px solid #BEE3F8; color: #4A5568;">{{table1Row2Col1}}</td>
                    <td style="padding: 12px 15px; text-align: right; border: 1px solid #BEE3F8; color: #4A5568;">{{table1Row2Col2}}</td>
                    <td style="padding: 12px 15px; text-align: right; border: 1px solid #BEE3F8; color: #4A5568;">{{table1Row2Col3}}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Recommendations -->
          <div style="margin-bottom: 40px;">
            <h2 style="font-size: 24px; color: #2C5282; margin: 0 0 20px; padding-bottom: 10px; border-bottom: 2px solid #BEE3F8;">Ajánlások</h2>
            
            <div style="background-color: #F7FAFC; border-radius: 8px; padding: 25px;">
              <ul style="margin: 0; padding-left: 20px; color: #4A5568;">
                <li style="margin-bottom: 15px; padding-left: 10px;">
                  <p style="margin: 0 0 5px; font-weight: 600; color: #2D3748;">{{recommendation1Title}}</p>
                  <p style="margin: 0; font-size: 14px; line-height: 1.6;">{{recommendation1Detail}}</p>
                </li>
                <li style="margin-bottom: 15px; padding-left: 10px;">
                  <p style="margin: 0 0 5px; font-weight: 600; color: #2D3748;">{{recommendation2Title}}</p>
                  <p style="margin: 0; font-size: 14px; line-height: 1.6;">{{recommendation2Detail}}</p>
                </li>
                <li style="padding-left: 10px;">
                  <p style="margin: 0 0 5px; font-weight: 600; color: #2D3748;">{{recommendation3Title}}</p>
                  <p style="margin: 0; font-size: 14px; line-height: 1.6;">{{recommendation3Detail}}</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #2C5282; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 5px; font-size: 14px;">{{companyName}} | {{companyWebsite}}</p>
          <p style="margin: 0; font-size: 12px; color: #BEE3F8;">Bizalmas dokumentum csak belső használatra</p>
        </div>
      </div>`;
    },
    
    /**
     * Generic template for other document types
     */
    getGenericTemplate(type, language) {
      const title = language === 'hu' ? 'DOKUMENTUM' : 
                    language === 'de' ? 'DOKUMENT' : 'DOCUMENT';
                    
      return `<div style="font-family: 'Helvetica', 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 0;">
        <!-- Modern Header -->
        <div style="background: linear-gradient(to right, #4A5568, #2D3748); color: white; padding: 40px; border-radius: 8px 8px 0 0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="font-size: 32px; margin: 0; font-weight: 700;">{{documentTitle}}</h1>
              <p style="font-size: 16px; margin: 8px 0 0; opacity: 0.8;">{{currentDate}}</p>
            </div>
            <div style="text-align: right;">
              <img src="https://nb-studio.net/logo.png" alt="NB Studio Logo" style="width: 120px; height: auto; display: block;">
            </div>
          </div>
        </div>
        
        <!-- Color accent bar -->
        <div style="height: 4px; background: linear-gradient(to right, #38B2AC, #81E6D9);"></div>
        
        <!-- Company Information -->
        <div style="background-color: #F7FAFC; padding: 20px 40px; border-bottom: 1px solid #E2E8F0;">
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between;">
            <div style="margin-right: 20px; margin-bottom: 15px;">
              <p style="margin: 0; font-size: 14px; color: #718096;">Készítette:</p>
              <p style="margin: 0; font-size: 16px; font-weight: 600; color: #2D3748;">{{companyName}}</p>
            </div>
            <div style="margin-right: 20px; margin-bottom: 15px;">
              <p style="margin: 0; font-size: 14px; color: #718096;">Elérhetőség:</p>
              <p style="margin: 0; font-size: 16px; color: #2D3748;">{{companyEmail}}</p>
              <p style="margin: 0; font-size: 16px; color: #2D3748;">{{companyPhone}}</p>
            </div>
            <div style="margin-bottom: 15px;">
              <p style="margin: 0; font-size: 14px; color: #718096;">Webcím:</p>
              <p style="margin: 0; font-size: 16px; color: #4299E1;">{{companyWebsite}}</p>
            </div>
          </div>
        </div>
        
        <!-- Main content -->
        <div style="background-color: white; padding: 40px; border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0;">
          <!-- Project Overview -->
          <div style="margin-bottom: 30px;">
            <h2 style="font-size: 22px; color: #2D3748; margin: 0 0 20px; padding-bottom: 10px; border-bottom: 2px solid #E2E8F0;">Áttekintés</h2>
            <div style="background-color: #F7FAFC; border-radius: 8px; padding: 25px; font-size: 16px; color: #4A5568; line-height: 1.6; border-left: 4px solid #4299E1;">
              <p style="margin: 0;">Projekt: <strong>{{projectName}}</strong></p>
              <p style="margin: 10px 0 0;">{{projectDescription}}</p>
            </div>
          </div>
          
          <!-- Document Content Section -->
          <div style="margin-bottom: 30px;">
            <h2 style="font-size: 22px; color: #2D3748; margin: 0 0 20px; padding-bottom: 10px; border-bottom: 2px solid #E2E8F0;">Dokumentum tartalma</h2>
            
            <!-- Content Placeholder - This would be replaced with actual document content -->
            <div style="font-size: 16px; color: #4A5568; line-height: 1.6;">
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus luctus urna sed urna ultricies ac tempor dui sagittis. In condimentum facilisis porta. Sed nec diam eu diam mattis viverra. Nulla fringilla, orci ac euismod semper, magna diam porttitor mauris, quis sollicitudin sapien justo in libero. Vestibulum mollis mauris enim. Morbi euismod magna ac lorem rutrum elementum.</p>
              
              <h3 style="font-size: 18px; color: #2D3748; margin: 25px 0 15px;">Fejezet 1</h3>
              <p>Vivamus luctus urna sed urna ultricies ac tempor dui sagittis. In condimentum facilisis porta. Sed nec diam eu diam mattis viverra. Nulla fringilla, orci ac euismod semper, magna.</p>
              
              <h3 style="font-size: 18px; color: #2D3748; margin: 25px 0 15px;">Fejezet 2</h3>
              <p>Sed nec diam eu diam mattis viverra. Nulla fringilla, orci ac euismod semper, magna diam porttitor mauris, quis sollicitudin sapien justo in libero. Vestibulum mollis mauris enim.</p>
              
              <!-- Example Table -->
              <table style="width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 14px;">
                <thead>
                  <tr style="background-color: #EBF8FF;">
                    <th style="padding: 12px 15px; text-align: left; border: 1px solid #BEE3F8; color: #2C5282;">Megnevezés</th>
                    <th style="padding: 12px 15px; text-align: right; border: 1px solid #BEE3F8; color: #2C5282;">Érték</th>
                    <th style="padding: 12px 15px; text-align: right; border: 1px solid #BEE3F8; color: #2C5282;">Állapot</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 12px 15px; border: 1px solid #E2E8F0; color: #4A5568;">Item 1</td>
                    <td style="padding: 12px 15px; text-align: right; border: 1px solid #E2E8F0; color: #4A5568;">100</td>
                    <td style="padding: 12px 15px; text-align: right; border: 1px solid #E2E8F0;">
                      <span style="background-color: #C6F6D5; color: #2F855A; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Aktív</span>
                    </td>
                  </tr>
                  <tr style="background-color: #F7FAFC;">
                    <td style="padding: 12px 15px; border: 1px solid #E2E8F0; color: #4A5568;">Item 2</td>
                    <td style="padding: 12px 15px; text-align: right; border: 1px solid #E2E8F0; color: #4A5568;">75</td>
                    <td style="padding: 12px 15px; text-align: right; border: 1px solid #E2E8F0;">
                      <span style="background-color: #FEEBC8; color: #C05621; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Függőben</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #2D3748; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 5px; font-size: 14px;">{{companyName}} | {{companyWebsite}}</p>
          <p style="margin: 0; font-size: 12px; color: #A0AEC0;">Ez a dokumentum a {{companyName}} szellemi tulajdonát képezi.</p>
        </div>
      </div>`;
    },
    
    /**
     * Generate HTML to PDF options
     * @returns {Object} - PDF generation options
     */
    getPdfOptions() {
      return {
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        footerTemplate: `
          <div style="width: 100%; text-align: center; font-size: 10px; color: #666;">
            <span>Oldal <span class="pageNumber"></span> / <span class="totalPages"></span></span>
          </div>
        `,
        displayHeaderFooter: true,
        printBackground: true
      };
    }
  };
  
  export default documentService;