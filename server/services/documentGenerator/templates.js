import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';

// Alapértelmezett sablonok, amelyek mindig elérhetők lesznek
const defaultTemplates = [
  {
    id: 'alapszabaly',
    name: 'Alapszabályzat',
    description: 'Egyszerű alapszabályzat sablon magyar nyelven.',
    category: 'Jogi dokumentumok',
    language: 'hu',
    requiredFields: ['companyName', 'companyAddress', 'taxNumber', 'ceoName'],
    content: `
      <div class="document-template">
        <h1 style="text-align: center;">ALAPSZABÁLYZAT</h1>
        <h2 style="text-align: center;">{{companyName}}</h2>
        
        <p><strong>Dátum:</strong> {{generationDate}}</p>
        
        <h3>1. A TÁRSASÁG ADATAI</h3>
        <p><strong>Cégnév:</strong> {{companyName}}</p>
        <p><strong>Székhely:</strong> {{companyAddress}}</p>
        <p><strong>Adószám:</strong> {{taxNumber}}</p>
        <p><strong>Ügyvezető:</strong> {{ceoName}}</p>
        
        <!-- IF:companyEmail -->
        <p><strong>Email:</strong> {{companyEmail}}</p>
        <!-- ENDIF -->
        
        <!-- IF:companyPhone -->
        <p><strong>Telefon:</strong> {{companyPhone}}</p>
        <!-- ENDIF -->
        
        <h3>2. ÁLTALÁNOS RENDELKEZÉSEK</h3>
        <p>A jelen alapszabályzat a {{companyName}} (továbbiakban: "Társaság") működésének alapvető szabályait tartalmazza.</p>
        
        <h3>3. A TÁRSASÁG TEVÉKENYSÉGI KÖRE</h3>
        <p>A Társaság fő tevékenységi köre:</p>
        
        <!-- IF:activities -->
        <ul>
          <!-- REPEAT:activities -->
          <li>{{item.name}}</li>
          <!-- ENDREPEAT -->
        </ul>
        <!-- ENDIF -->
        
        <h3>4. A TÁRSASÁG SZERVEZETI FELÉPÍTÉSE</h3>
        <p>4.1. A Társaság legfőbb szerve a taggyűlés.</p>
        <p>4.2. A Társaság ügyvezetését {{ceoName}} ügyvezető látja el.</p>
        
        <h3>5. ZÁRÓ RENDELKEZÉSEK</h3>
        <p>Jelen alapszabályzat a mai napon lép hatályba és visszavonásig érvényes.</p>
        
        <div style="margin-top: 50px;">
          <p style="text-align: center;">Kelt: {{companyCity}}, {{generationDate}}</p>
          
          <div style="margin-top: 50px; text-align: center;">
            <p>_______________________________<br>{{ceoName}}<br>ügyvezető</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'megbizasi-szerzodes',
    name: 'Megbízási szerződés',
    description: 'Általános megbízási szerződés sablon magyar nyelven.',
    category: 'Szerződések',
    language: 'hu',
    requiredFields: ['companyName', 'companyAddress', 'clientName', 'clientAddress', 'taskDescription', 'fee'],
    content: `
      <div class="document-template">
        <h1 style="text-align: center;">MEGBÍZÁSI SZERZŐDÉS</h1>
        
        <p>amely létrejött egyrészről:</p>
        
        <p><strong>Név/Cégnév:</strong> {{companyName}}<br>
        <strong>Székhely:</strong> {{companyAddress}}<br>
        <!-- IF:taxNumber --><strong>Adószám:</strong> {{taxNumber}}<br><!-- ENDIF -->
        <!-- IF:companyRegNumber --><strong>Cégjegyzékszám:</strong> {{companyRegNumber}}<br><!-- ENDIF -->
        <!-- IF:ceoName --><strong>Képviselő:</strong> {{ceoName}}<!-- ENDIF --></p>
        
        <p>mint megbízott (továbbiakban: <strong>"Megbízott"</strong>),</p>
        
        <p>másrészről:</p>
        
        <p><strong>Név/Cégnév:</strong> {{clientName}}<br>
        <strong>Székhely/Lakcím:</strong> {{clientAddress}}<br>
        <!-- IF:clientTaxNumber --><strong>Adószám:</strong> {{clientTaxNumber}}<br><!-- ENDIF -->
        <!-- IF:clientRegNumber --><strong>Cégjegyzékszám:</strong> {{clientRegNumber}}<br><!-- ENDIF -->
        <!-- IF:clientRepresentative --><strong>Képviselő:</strong> {{clientRepresentative}}<!-- ENDIF --></p>
        
        <p>mint megbízó (továbbiakban: <strong>"Megbízó"</strong>) között az alulírott napon és helyen az alábbi feltételek szerint:</p>
        
        <h3>1. A SZERZŐDÉS TÁRGYA</h3>
        <p>1.1. Megbízó megbízza Megbízottat az alábbi feladat elvégzésével:</p>
        <p style="padding-left: 20px;">{{taskDescription}}</p>
        
        <h3>2. MEGBÍZÁSI DÍJ</h3>
        <p>2.1. A megbízás ellátásáért Megbízottat {{fee}} összegű megbízási díj illeti meg.</p>
        
        <!-- IF:paymentTerms -->
        <p>2.2. Fizetési feltételek: {{paymentTerms}}</p>
        <!-- ENDIF -->
        
        <h3>3. A MEGBÍZÁS IDŐTARTAMA</h3>
        <!-- IF:contractStart -->
        <p>3.1. Jelen szerződés {{contractStart}} napján lép hatályba.</p>
        <!-- ENDIF -->
        
        <!-- IF:contractEnd -->
        <p>3.2. A szerződés {{contractEnd}} napjáig tartó határozott időtartamra jön létre.</p>
        <!-- ENDIF -->
        
        <!-- IF:!contractEnd -->
        <p>3.2. A szerződés határozatlan időtartamra jön létre.</p>
        <!-- ENDIF -->
        
        <h3>4. EGYÉB RENDELKEZÉSEK</h3>
        <p>4.1. A jelen szerződésben nem szabályozott kérdésekben a Polgári Törvénykönyv vonatkozó rendelkezései az irányadók.</p>
        
        <p>4.2. Jelen szerződés módosítása kizárólag írásban érvényes.</p>
        
        <p>A felek a jelen szerződést elolvasás és értelmezés után, mint akaratukkal mindenben megegyezőt jóváhagyólag írják alá.</p>
        
        <div style="margin-top: 50px;">
          <p style="text-align: center;">Kelt: {{contractCity}}, {{generationDate}}</p>
          
          <div style="margin-top: 40px; display: flex; justify-content: space-between;">
            <div style="width: 45%; text-align: center;">
              <p>_______________________________<br>{{companyName}}<br>Megbízott</p>
            </div>
            <div style="width: 45%; text-align: center;">
              <p>_______________________________<br>{{clientName}}<br>Megbízó</p>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'szamlazasi-adatlap',
    name: 'Számlázási adatlap',
    description: 'Ügyfél számlázási adatait rögzítő adatlap.',
    category: 'Ügyféladatok',
    language: 'hu',
    requiredFields: ['clientName'],
    content: `
      <div class="document-template">
        <h1 style="text-align: center;">SZÁMLÁZÁSI ADATLAP</h1>
        <p style="text-align: center;"><em>Kérjük, töltse ki az adatlapot a pontos számlázáshoz!</em></p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 40%;">Cégnév / Név:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">{{clientName}}</td>
          </tr>
          <!-- IF:clientTaxNumber -->
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Adószám:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">{{clientTaxNumber}}</td>
          </tr>
          <!-- ENDIF -->
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Számlázási cím:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <!-- IF:clientAddress -->{{clientAddress}}<!-- ENDIF -->
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Kapcsolattartó neve:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <!-- IF:contactName -->{{contactName}}<!-- ENDIF -->
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Telefonszám:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <!-- IF:clientPhone -->{{clientPhone}}<!-- ENDIF -->
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">E-mail cím:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <!-- IF:clientEmail -->{{clientEmail}}<!-- ENDIF -->
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Fizetési mód:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <!-- IF:paymentMethod -->{{paymentMethod}}<!-- ENDIF -->
            </td>
          </tr>
          <!-- IF:additionalInfo -->
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Egyéb megjegyzés:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">{{additionalInfo}}</td>
          </tr>
          <!-- ENDIF -->
        </table>
        
        <div style="margin-top: 40px;">
          <p>Az adatlapon megadott adatok helyességét igazolom:</p>
          
          <div style="margin-top: 30px; display: flex; justify-content: space-between;">
            <div style="width: 45%;">
              <p>Kelt: ________________________</p>
            </div>
            <div style="width: 45%; text-align: right;">
              <p>________________________<br>Aláírás</p>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'arajanlat',
    name: 'Árajánlat',
    description: 'Professzionális árajánlat sablon.',
    category: 'Üzleti dokumentumok',
    language: 'hu',
    requiredFields: ['companyName', 'clientName', 'offerDate', 'offerItems'],
    content: `
      <div class="document-template">
        <h1 style="text-align: center;">ÁRAJÁNLAT</h1>
        
        <div style="margin: 20px 0;">
          <p><strong>Árajánlat száma:</strong> {{offerNumber}}</p>
          <p><strong>Dátum:</strong> {{offerDate}}</p>
          <p><strong>Érvényesség:</strong> {{validUntil}}</p>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin: 30px 0;">
          <div style="width: 45%;">
            <h3>SZOLGÁLTATÓ</h3>
            <p><strong>{{companyName}}</strong><br>
            {{companyAddress}}<br>
            <!-- IF:taxNumber -->Adószám: {{taxNumber}}<br><!-- ENDIF -->
            <!-- IF:companyEmail -->Email: {{companyEmail}}<br><!-- ENDIF -->
            <!-- IF:companyPhone -->Telefon: {{companyPhone}}<!-- ENDIF --></p>
          </div>
          
          <div style="width: 45%;">
            <h3>ÜGYFÉL</h3>
            <p><strong>{{clientName}}</strong><br>
            <!-- IF:clientAddress -->{{clientAddress}}<br><!-- ENDIF -->
            <!-- IF:clientTaxNumber -->Adószám: {{clientTaxNumber}}<br><!-- ENDIF -->
            <!-- IF:clientEmail -->Email: {{clientEmail}}<br><!-- ENDIF -->
            <!-- IF:clientPhone -->Telefon: {{clientPhone}}<!-- ENDIF --></p>
          </div>
        </div>
        
        <h3>ÁRAJÁNLAT RÉSZLETEI</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Megnevezés</th>
            <th style="padding: the: 10px; border: 1px solid #ddd; text-align: right;">Mennyiség</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Egységár</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Összesen</th>
          </tr>
          
          <!-- REPEAT:offerItems -->
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <strong>{{item.name}}</strong><br>
              <span style="font-size: 0.9em;">{{item.description}}</span>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{{item.quantity}}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{{item.unitPrice}} {{currency}}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{{item.total}} {{currency}}</td>
          </tr>
          <!-- ENDREPEAT -->
          
          <tr>
            <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>Összesen:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">{{totalAmount}} {{currency}}</td>
          </tr>
        </table>
        
        <!-- IF:offerNotes -->
        <h3>MEGJEGYZÉSEK</h3>
        <p>{{offerNotes}}</p>
        <!-- ENDIF -->
        
        <h3>FIZETÉSI FELTÉTELEK</h3>
        <p><!-- IF:paymentTerms -->{{paymentTerms}}<!-- ENDIF --></p>
        
        <div style="margin-top: 40px;">
          <p>Köszönjük, hogy minket választott. Bízunk benne, hogy ajánlatunk elnyeri tetszését!</p>
          
          <div style="margin-top: 60px; text-align: center;">
            <p>_______________________________<br>{{companyName}}<br>{{ceoName}}</p>
          </div>
        </div>
      </div>
    `
  }
];

/**
 * Összes elérhető sablon lekérése
 * @returns {Promise<Array>} - Sablonok listája
 */
export const getTemplates = async () => {
  try {
    // Itt később tovább lehet bővíteni, hogy adatbázisból is betöltse a testreszabott sablonokat
    
    // Egyelőre csak az alapértelmezett sablonokat adjuk vissza
    return defaultTemplates;
  } catch (error) {
    console.error('Hiba a sablonok lekérésekor:', error);
    throw error;
  }
};

/**
 * Sablon lekérése azonosító alapján
 * @param {string} templateId - A sablon azonosítója
 * @returns {Promise<object|null>} - A sablon objektum vagy null, ha nem található
 */
export const getTemplateById = async (templateId) => {
  try {
    // Először az alapértelmezett sablonok között keresünk
    const template = defaultTemplates.find(template => template.id === templateId);
    
    if (template) {
      return template;
    }
    
    // Itt később tovább lehet bővíteni, hogy adatbázisból is betöltse a testreszabott sablonokat
    
    return null;
  } catch (error) {
    console.error(`Hiba a(z) ${templateId} azonosítójú sablon lekérésekor:`, error);
    throw error;
  }
};

/**
 * Új sablon létrehozása (későbbi implementációhoz)
 * @param {object} templateData - Az új sablon adatai
 * @returns {Promise<object>} - A létrehozott sablon
 */
export const createTemplate = async (templateData) => {
  // Ez a funkció később implementálható, ha a sablonokat adatbázisban is tárolni szeretnénk
  throw new Error('A createTemplate funkció még nincs implementálva');
};
