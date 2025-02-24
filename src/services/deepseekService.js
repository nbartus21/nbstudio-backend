// services/deepseekService.js

/**
 * Egyszerű mock szolgáltatás deepSeek API hívások helyett
 * Ez a módosítás eltávolítja a külső API függőséget
 */

// Mock függvények, amelyek egyszerű szöveget adnak vissza API hívások helyett
const deepseekService = {
  /**
   * Generate blog content on a specific topic in the specified language
   * @param {string} topic - The blog topic
   * @param {string} language - Target language code (hu, en, de)
   * @returns {Promise<string>} - Generated HTML content
   */
  generateBlogContent: async (topic, language = 'hu') => {
    // Mock tartalom visszaadása - nincs API hívás
    const mockContent = {
      'hu': `
<h2>Bevezetés a témába: ${topic}</h2>
<p>Ez egy automatikusan generált blog bejegyzés a következő témában: ${topic}.</p>
<p>Az AI funkcionalitás jelenleg ki van kapcsolva, kérjük, írja meg saját tartalmát.</p>

<h3>További információk</h3>
<p>Egy valódi blog bejegyzést kell írni ehhez a témához.</p>
<ul>
  <li>Első fontos pont a témában</li>
  <li>Második fontos pont a témában</li>
  <li>Harmadik fontos pont a témában</li>
</ul>

<h3>Összegzés</h3>
<p>Ez a példa szöveg csak helykitöltő. Kérjük, írja meg a saját tartalmát.</p>
      `,
      'en': `
<h2>Introduction to: ${topic}</h2>
<p>This is an automatically generated blog post about: ${topic}.</p>
<p>AI functionality is currently disabled, please write your own content.</p>

<h3>More information</h3>
<p>A real blog post should be written for this topic.</p>
<ul>
  <li>First important point about the topic</li>
  <li>Second important point about the topic</li>
  <li>Third important point about the topic</li>
</ul>

<h3>Summary</h3>
<p>This example text is just a placeholder. Please write your own content.</p>
      `,
      'de': `
<h2>Einführung in: ${topic}</h2>
<p>Dies ist ein automatisch generierter Blogbeitrag über: ${topic}.</p>
<p>Die KI-Funktionalität ist derzeit deaktiviert, bitte schreiben Sie Ihren eigenen Inhalt.</p>

<h3>Weitere Informationen</h3>
<p>Für dieses Thema sollte ein echter Blogbeitrag geschrieben werden.</p>
<ul>
  <li>Erster wichtiger Punkt zum Thema</li>
  <li>Zweiter wichtiger Punkt zum Thema</li>
  <li>Dritter wichtiger Punkt zum Thema</li>
</ul>

<h3>Zusammenfassung</h3>
<p>Dieser Beispieltext ist nur ein Platzhalter. Bitte schreiben Sie Ihren eigenen Inhalt.</p>
      `
    };

    return mockContent[language] || mockContent['en'];
  },

  /**
   * Generate a title for a blog post on a specific topic
   * @param {string} topic - The blog topic
   * @param {string} language - Target language code (hu, en, de)
   * @returns {Promise<string>} - Generated title
   */
  generateTitle: async (topic, language = 'hu') => {
    const mockTitles = {
      'hu': `${topic} - Minden amit tudni érdemes`,
      'en': `Everything you need to know about ${topic}`,
      'de': `Alles was Sie über ${topic} wissen müssen`
    };

    return mockTitles[language] || mockTitles['en'];
  },

  /**
   * Generate SEO description for a blog post
   * @param {string} content - The blog content or topic
   * @param {string} language - Target language code (hu, en, de)
   * @returns {Promise<string>} - Generated SEO description
   */
  generateSEODescription: async (content, language = 'hu') => {
    const mockDescriptions = {
      'hu': `Ez egy információgazdag bejegyzés a következő témában: ${typeof content === 'string' ? content.substring(0, 30) + '...' : 'a megadott témában'}. Olvassa el és tudjon meg többet a témáról!`,
      'en': `This is an informative post about ${typeof content === 'string' ? content.substring(0, 30) + '...' : 'the specified topic'}. Read on to learn more!`,
      'de': `Dies ist ein informativer Beitrag über ${typeof content === 'string' ? content.substring(0, 30) + '...' : 'das angegebene Thema'}. Lesen Sie weiter, um mehr zu erfahren!`
    };

    return mockDescriptions[language] || mockDescriptions['en'];
  },

  /**
   * Translate content from one language to another
   * @param {string} content - The content to translate
   * @param {string} fromLang - Source language code (hu, en, de)
   * @param {string} toLang - Target language code (hu, en, de)
   * @returns {Promise<string>} - Translated content
   */
  translateContent: async (content, fromLang = 'hu', toLang = 'en') => {
    // Egyszerű szöveg fordítás API hívás nélkül
    // Ezt később igazi fordítással helyettesítheted
    
    // Ha ugyanaz a nyelv, nincs mit tenni
    if (fromLang === toLang) {
      return content;
    }

    // Máskülönben tartalmazzuk a tartalmat egy megjegyzéssel
    const notePrefix = {
      'hu': '(Fordított tartalom) ',
      'en': '(Translated content) ',
      'de': '(Übersetzter Inhalt) '
    };

    return `${notePrefix[toLang] || '(Translated) '}${content}`;
  },

  /**
   * Generate SEO suggestions for content
   */
  generateSEOSuggestions: async (content, language) => {
    return `
SEO Javaslatok (Mock adatok):
===========================
1. Meta cím: Használjon kulcsszavakat a témában
2. Meta leírás: Maximum 160 karakter, tartalmazza a fő kulcsszót
3. Javasolt kulcsszavak: kulcsszó1, kulcsszó2, kulcsszó3
4. Tartalmi javaslatok:
   - Használjon több alcímet
   - Adjon hozzá képeket
   - Írjon legalább 300 szót
`;
  },

  /**
   * Generate SEO meta titles and descriptions
   */
  generateMetaContent: async (content, language) => {
    return {
      metaTitle: 'SEO-barát cím a témához',
      metaDescription: 'Ez egy SEO-barát leírás, amely tartalmazza a fő kulcsszavakat és vonzza az olvasókat.'
    };
  },

  /**
   * Suggest tags for content
   */
  suggestTags: async (content, language) => {
    return ["webfejlesztés", "marketing", "seo", "üzleti", "technológia"];
  },

  /**
   * Categorize contact messages
   */
  categorizeMessage: async (message) => {
    return {
      category: "inquiry",
      priority: "medium",
      sentiment: "neutral"
    };
  },

  /**
   * Generate response suggestions for messages
   */
  generateResponseSuggestion: async (message) => {
    return "Köszönjük megkeresését! Hamarosan válaszolunk üzenetére. Kérdésével kapcsolatban munkatársunk fogja Önnel felvenni a kapcsolatot.";
  },

  /**
   * Generate message summaries
   */
  generateSummary: async (message) => {
    return "Ez egy automatikusan generált összefoglaló az üzenetről. Az AI funkció jelenleg ki van kapcsolva.";
  },

  /**
   * Analyze projects
   */
  analyzeProject: async (projectData) => {
    return "Projekt elemzés: A projekt megfelelő ütemezéssel és erőforrásokkal sikeresen megvalósítható.";
  },

  // Modell beállítás (csak stub, nem csinál semmit)
  setModel: (modelName) => {
    console.log(`Model set to: ${modelName} (this is just a mock function)`);
  }
};

export { deepseekService };