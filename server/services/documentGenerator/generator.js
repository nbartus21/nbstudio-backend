import mongoose from 'mongoose';
import { getTemplateById } from './templates.js';

/**
 * Dokumentum generálása sablon alapján
 * @param {string} templateId - A sablon azonosítója
 * @param {object} documentData - A dokumentumban használandó adatok
 * @param {string} userId - A felhasználó ID-ja, aki a dokumentumot generálja
 * @returns {Promise<object>} - A generált dokumentum adatai
 */
export const generateDocumentFromTemplate = async (templateId, documentData, userId) => {
  try {
    console.log(`Dokumentum generálása a(z) ${templateId} sablon alapján.`);
    
    // Sablon lekérése
    const template = await getTemplateById(templateId);
    if (!template) {
      throw new Error(`Nem található sablon ezzel az azonosítóval: ${templateId}`);
    }
    
    // Adatok validálása - ellenőrizzük, hogy minden kötelező mező megtalálható-e
    validateTemplateData(template, documentData);
    
    // Sablon tartalmának feldolgozása a megadott adatokkal (változó helyettesítés)
    const content = processTemplateContent(template.content, documentData);
    
    // A generált tartalommal visszaadható egy objektum
    return {
      templateId,
      templateName: template.name,
      content,
      generatedAt: new Date(),
      // Egyéb metaadatok
    };
  } catch (error) {
    console.error('Hiba a dokumentum generálásakor:', error);
    throw error;
  }
};

/**
 * A sablon kötelező mezőinek validálása
 * @param {object} template - A sablon objektum
 * @param {object} documentData - A dokumentum adatok
 */
const validateTemplateData = (template, documentData) => {
  // Ha a sablonnak vannak kötelező mezői, ellenőrizzük azokat
  if (template.requiredFields && Array.isArray(template.requiredFields)) {
    const missingFields = template.requiredFields.filter(field => {
      // Ellenőrizzük, hogy a kötelező mezők megvannak-e az adatokban
      // Támogatja a nested objektumokat is (pl. client.name)
      const fieldPath = field.split('.');
      let value = documentData;
      
      for (const key of fieldPath) {
        if (value === undefined || value === null) return true;
        value = value[key];
      }
      
      return value === undefined || value === null || value === '';
    });
    
    if (missingFields.length > 0) {
      throw new Error(`Hiányzó kötelező mezők: ${missingFields.join(', ')}`);
    }
  }
};

/**
 * A sablon tartalmának feldolgozása, változók helyettesítése
 * @param {string} templateContent - A sablon HTML/text tartalma
 * @param {object} documentData - A dokumentum adatok
 * @returns {string} - A feldolgozott tartalom
 */
const processTemplateContent = (templateContent, documentData) => {
  // Egyszerű változó helyettesítés a {{variable}} szintaxissal
  let processedContent = templateContent;
  
  // Regex a {{variable}} formátumú változók azonosításához
  const variableRegex = /\{\{([^}]+)\}\}/g;
  
  // Változók helyettesítése
  processedContent = processedContent.replace(variableRegex, (match, variable) => {
    // Az összetett változókat is kezelni tudjuk (pl. {{client.name}})
    const variablePath = variable.trim().split('.');
    let value = documentData;
    
    // Végigmegyünk a változó útvonalán
    for (const key of variablePath) {
      if (value === undefined || value === null) return match; // Ha nincs ilyen, megtartjuk az eredeti {{variable}} formát
      value = value[key];
    }
    
    // Ha a változó értéke undefined vagy null, üres stringgel helyettesítjük
    if (value === undefined || value === null) return '';
    
    // A dátumokat formázva adjuk vissza
    if (value instanceof Date) {
      return value.toLocaleDateString('hu-HU');
    }
    
    // Speciális formázások kezelése (pl. {{date:client.birthDate}})
    if (variable.includes(':')) {
      const [format, path] = variable.split(':');
      const variablePath = path.trim().split('.');
      
      let formatValue = documentData;
      for (const key of variablePath) {
        if (formatValue === undefined || formatValue === null) return '';
        formatValue = formatValue[key];
      }
      
      if (format === 'date' && formatValue) {
        const date = new Date(formatValue);
        return !isNaN(date) ? date.toLocaleDateString('hu-HU') : formatValue;
      }
      
      return formatValue || '';
    }
    
    return value.toString();
  });
  
  // Feltételes szakaszok kezelése (csak akkor mutatjuk, ha a változó létezik és nem üres)
  // Szintaxis: <!-- IF:variable -->tartalom<!-- ENDIF -->
  const conditionalRegex = /<!--\s*IF:([^>]+)\s*-->([\s\S]*?)<!--\s*ENDIF\s*-->/g;
  
  processedContent = processedContent.replace(conditionalRegex, (match, variable, content) => {
    // Az összetett változókat is kezelni tudjuk (pl. client.name)
    const variablePath = variable.trim().split('.');
    let value = documentData;
    
    // Végigmegyünk a változó útvonalán
    for (const key of variablePath) {
      if (value === undefined || value === null) return ''; // Ha nincs ilyen, nem mutatjuk a feltételes szakaszt
      value = value[key];
    }
    
    // Ha a változó létezik és nem üres, megmutatjuk a tartalmat
    if (value !== undefined && value !== null && value !== '') {
      return content;
    }
    
    return ''; // Különben nem mutatjuk
  });
  
  // Ismétlődő szakaszok kezelése (tömbök esetén)
  // Szintaxis: <!-- REPEAT:items -->{{item.name}}<!-- ENDREPEAT -->
  const repeatRegex = /<!--\s*REPEAT:([^>]+)\s*-->([\s\S]*?)<!--\s*ENDREPEAT\s*-->/g;
  
  processedContent = processedContent.replace(repeatRegex, (match, arrayName, itemTemplate) => {
    // Az array változó útvonala
    const arrayPath = arrayName.trim().split('.');
    let array = documentData;
    
    // Megkeressük az array-t a dokumentum adatokban
    for (const key of arrayPath) {
      if (array === undefined || array === null) return '';
      array = array[key];
    }
    
    // Ha nem tömb vagy üres, üres stringet adunk vissza
    if (!Array.isArray(array) || array.length === 0) return '';
    
    // Minden elemre alkalmazzuk az item template-et
    return array.map(item => {
      // Az {{item.xyz}} változókat helyettesítjük az aktuális elem adataival
      let itemContent = itemTemplate;
      
      // Helyettesítjük a {{item.xyz}} típusú változókat az aktuális elem tulajdonságaival
      const itemVarRegex = /\{\{item\.([^}]+)\}\}/g;
      itemContent = itemContent.replace(itemVarRegex, (match, property) => {
        const propPath = property.split('.');
        let propValue = item;
        
        for (const key of propPath) {
          if (propValue === undefined || propValue === null) return '';
          propValue = propValue[key];
        }
        
        return propValue !== undefined && propValue !== null ? propValue.toString() : '';
      });
      
      return itemContent;
    }).join('');
  });
  
  // Automatikusan frissítjük a generálás dátumát
  const today = new Date().toLocaleDateString('hu-HU');
  processedContent = processedContent.replace(/\{\{generationDate\}\}/g, today);
  
  return processedContent;
};
