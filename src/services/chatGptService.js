// services/chatGptService.js

/**
 * Önálló implementáció a blog kezelés és egyéb AI funkcionalitások számára
 * Ez a fájl közvetlenül tartalmazza a funkciókat, nem támaszkodik a deepseekService-re
 */

const DEEPSEEK_API_KEY = 'sk-a781f0251b034cf6b91f970b43d9caa5';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// API hívás DeepSeek-hez
const callDeepSeekAPI = async (payload) => {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: payload.messages,
        stream: false
      })
    });
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('DeepSeek API call failed:', error);
    throw error;
  }
};

/**
 * Blog tartalom generálás egy adott témáról
 * @param {string} topic - A blog téma
 * @param {string} language - Célnyelv kódja
 * @returns {Promise<string>} - Generált HTML tartalom
 */
export const generateBlogContent = async (topic, language = 'hu') => {
  const languageNames = {
    'hu': 'Hungarian',
    'en': 'English',
    'de': 'German'
  };
  
  const fullLanguageName = languageNames[language] || 'Hungarian';
  
  try {
    const response = await callDeepSeekAPI({
      messages: [
        {
          role: "system",
          content: `You are a professional blog content creator. Create well-structured, engaging content with HTML formatting.`
        },
        {
          role: "user",
          content: `Write a blog post about "${topic}" in ${fullLanguageName}. 
          The content should be approximately 1250 characters long.
          Format the content with proper HTML tags (p, h2, h3, ul, li, etc.).
          The tone should be informative, engaging, and professional.
          Make sure the content is well-structured with clear sections.
          
          Generate only the HTML content without any explanations.`
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Blog content generation failed:', error);
    
    // Fallback válasz hiba esetén
    return `
<h2>Introduction to ${topic}</h2>
<p>The world of ${topic} has been evolving rapidly in recent years. With new technologies and approaches emerging, it's becoming an increasingly important area to understand for professionals across industries.</p>

<h3>Key Aspects of ${topic}</h3>
<p>There are several important aspects to consider when exploring ${topic}:</p>
<ul>
  <li>The historical context and development</li>
  <li>Current best practices and methodologies</li>
  <li>Future trends and potential innovations</li>
</ul>

<p>Understanding these elements provides a comprehensive view of how ${topic} impacts our daily lives and business operations.</p>

<h3>Why ${topic} Matters</h3>
<p>The significance of ${topic} cannot be overstated. It influences everything from product development to customer experience, making it a critical consideration for forward-thinking organizations.</p>

<p>As we continue to navigate an increasingly complex landscape, expertise in ${topic} will become an invaluable asset for professionals looking to stay ahead of the curve.</p>

<h2>Conclusion</h2>
<p>The journey through ${topic} is ongoing, with new discoveries and innovations emerging regularly. By staying informed and adaptable, you can leverage the potential of ${topic} to drive meaningful improvements in your personal and professional endeavors.</p>
`;
  }
};

/**
 * Blog cím generálása
 * @param {string} topic - A blog téma
 * @param {string} language - Célnyelv kódja
 * @returns {Promise<string>} - Generált cím
 */
export const generateTitle = async (topic, language = 'hu') => {
  const languageNames = {
    'hu': 'Hungarian',
    'en': 'English',
    'de': 'German'
  };
  
  const fullLanguageName = languageNames[language] || 'Hungarian';
  
  try {
    const response = await callDeepSeekAPI({
      messages: [
        {
          role: "system",
          content: "You are a blog title creator. Respond only with the title text."
        },
        {
          role: "user",
          content: `Create an engaging, SEO-friendly blog title about "${topic}" in ${fullLanguageName}.
          The title should be concise (under 60 characters), attention-grabbing, and clearly indicate the topic.
          Generate only the title without any explanations.`
        }
      ]
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Title generation failed:', error);
    
    // Fallback címek
    const mockTitles = {
      'hu': `${topic}: Amit Tudnia Kell a Sikeres Alkalmazáshoz`,
      'en': `Essential Guide to ${topic}: What You Need to Know`,
      'de': `${topic}: Ein Umfassender Leitfaden für Erfolg`
    };

    return mockTitles[language] || mockTitles['en'];
  }
};

/**
 * SEO leírás generálása blog bejegyzéshez
 * @param {string} content - A blog tartalom vagy téma
 * @param {string} language - Célnyelv kódja
 * @returns {Promise<string>} - Generált SEO leírás
 */
export const generateSEODescription = async (content, language = 'hu') => {
  const languageNames = {
    'hu': 'Hungarian',
    'en': 'English',
    'de': 'German'
  };
  
  const fullLanguageName = languageNames[language] || 'Hungarian';
  
  // Használjuk csak a tartalom első részét a token limitek miatt
  const contentPreview = typeof content === 'string' ? content.substring(0, 1000) : content;
  
  try {
    const response = await callDeepSeekAPI({
      messages: [
        {
          role: "system",
          content: "You are a meta description specialist. Respond only with the description text."
        },
        {
          role: "user",
          content: `Based on the following blog content, create a compelling meta description in ${fullLanguageName}.
          The description should be 140-160 characters, include relevant keywords, and entice readers to click.
          Content preview: ${contentPreview}
          Generate only the description without any explanations.`
        }
      ]
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('SEO description generation failed:', error);
    
    // Fallback leírások
    const mockDescriptions = {
      'hu': 'Ismerje meg a legfontosabb szempontokat és stratégiákat, amelyek segítenek sikeresen alkalmazni a modern technológiát vállalkozása növekedéséhez és hatékonyságának javításához.',
      'en': 'Discover the essential aspects and strategies that will help you successfully implement modern technology to grow your business and improve operational efficiency.',
      'de': 'Entdecken Sie die wichtigsten Aspekte und Strategien, die Ihnen helfen, moderne Technologie erfolgreich einzusetzen, um Ihr Unternehmen zu vergrößern und die Effizienz zu verbessern.'
    };

    return mockDescriptions[language] || mockDescriptions['en'];
  }
};

/**
 * Tartalom fordítása egyik nyelvről a másikra
 * @param {string} content - A lefordítandó tartalom
 * @param {string} fromLang - Forrásnyelv kódja
 * @param {string} toLang - Célnyelv kódja
 * @returns {Promise<string>} - Lefordított tartalom
 */
export const translateContent = async (content, fromLang = 'hu', toLang = 'en') => {
  const languageNames = {
    'hu': 'Hungarian',
    'en': 'English',
    'de': 'German'
  };
  
  const fromLanguageName = languageNames[fromLang] || 'Hungarian';
  const toLanguageName = languageNames[toLang] || 'English';
  
  try {
    const response = await callDeepSeekAPI({
      messages: [
        {
          role: "system",
          content: "You are a professional translator. Provide accurate translations."
        },
        {
          role: "user",
          content: `Translate this content from ${fromLanguageName} to ${toLanguageName}.
          Maintain the formatting and style.
          
          Content to translate:
          ${content}`
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Translation failed:', error);
    // Hiba esetén visszaadjuk az eredeti tartalmat
    return content;
  }
};

/**
 * SEO javaslatok generálása
 * @param {string} content - Az elemzendő tartalom
 * @param {string} language - Tartalom nyelve
 * @returns {Promise<Object>} - SEO javaslatok
 */
export const generateSEOSuggestions = async (content, language) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        { 
          role: "system", 
          content: "You are an SEO expert assistant. Provide clear, structured suggestions." 
        },
        { 
          role: "user", 
          content: `
          Analyze this content and provide SEO optimization suggestions.
          Content language: ${language}
          
          Content:
          ${content}
          
          Please provide:
          1. Suggested meta title (max 60 characters)
          2. Meta description (max 160 characters)
          3. Focus keywords
          4. Content improvement suggestions
          ` 
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('SEO suggestion generation failed:', error);
    return {
      metaTitle: '',
      metaDescription: '',
      keywords: [],
      suggestions: []
    };
  }
};

/**
 * Meta tartalom (cím és leírás) generálása
 * @param {string} content - Az elemzendő tartalom
 * @param {string} language - Tartalom nyelve
 * @returns {Promise<Object>} - Meta tartalom objektum
 */
export const generateMetaContent = async (content, language) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        { 
          role: "system", 
          content: "You are an SEO metadata specialist. Respond ONLY with a valid JSON object containing metaTitle and metaDescription." 
        },
        { 
          role: "user", 
          content: `
          Generate SEO-optimized meta title and description.
          Language: ${language}
          
          Content:
          ${content}
          
          Respond EXACTLY in this format:
          {"metaTitle":"60 chars max title","metaDescription":"160 chars max description"}
          ` 
        }
      ]
    });

    try {
      const result = JSON.parse(response.choices[0].message.content.trim());
      return {
        metaTitle: result.metaTitle || '',
        metaDescription: result.metaDescription || ''
      };
    } catch (parseError) {
      console.error('Meta content parse error:', parseError);
      return {
        metaTitle: '',
        metaDescription: ''
      };
    }
  } catch (error) {
    console.error('Meta content generation failed:', error);
    return {
      metaTitle: '',
      metaDescription: ''
    };
  }
};

/**
 * Címkék javaslata tartalomhoz
 * @param {string} content - Az elemzendő tartalom
 * @param {string} language - Tartalom nyelve
 * @returns {Promise<Array>} - Címke sztringek tömb
 */
export const suggestTags = async (content, language) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        { 
          role: "system", 
          content: "You are a content tagger. Respond ONLY with a valid JSON array of strings." 
        },
        { 
          role: "user", 
          content: `
          Generate relevant tags for this content.
          Language: ${language}
          
          Content:
          ${content}
          
          Respond EXACTLY in this format:
          ["tag1","tag2","tag3"]
          ` 
        }
      ]
    });

    try {
      const tags = JSON.parse(response.choices[0].message.content.trim());
      return Array.isArray(tags) ? tags : [];
    } catch (parseError) {
      console.error('Tag parse error:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Tag suggestion failed:', error);
    return [];
  }
};

/**
 * Kapcsolati üzenetek kategorizálása
 * @param {string} message - A kategorizálandó üzenet
 * @returns {Promise<Object>} - Kategória információ
 */
export const categorizeMessage = async (message) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        {
          role: "system",
          content: "You are an AI assistant. Respond ONLY with a valid JSON object in the exact format shown."
        },
        {
          role: "user",
          content: `Analyze this message and respond EXACTLY in this format:
          {"category":"support/inquiry/feedback/complaint","priority":"high/medium/low","sentiment":"positive/neutral/negative"}
          
          Message: ${message}`
        }
      ]
    });

    try {
      const result = JSON.parse(response.choices[0].message.content.trim());
      return {
        category: result.category || 'other',
        priority: result.priority || 'medium',
        sentiment: result.sentiment || 'neutral'
      };
    } catch (parseError) {
      console.error('Message categorization parse error:', parseError);
      return {
        category: 'other',
        priority: 'medium',
        sentiment: 'neutral'
      };
    }
  } catch (error) {
    console.error('Message categorization failed:', error);
    return {
      category: 'other',
      priority: 'medium',
      sentiment: 'neutral'
    };
  }
};

/**
 * Válasz javaslat generálása üzenetekhez
 * @param {string} message - Az üzenet, amire válaszolni kell
 * @returns {Promise<string>} - Javasolt válasz
 */
export const generateResponseSuggestion = async (message) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        {
          role: "system",
          content: "You are a professional customer service representative. Provide clear, helpful responses."
        },
        {
          role: "user",
          content: `Generate a professional response to this message:
          
          Customer message: ${message}
          
          The response should be:
          1. Professional and polite
          2. Solution-focused
          3. Clear and concise`
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Response suggestion failed:', error);
    return 'We have received your message and will respond shortly.';
  }
};

/**
 * Üzenet összefoglalók generálása
 * @param {string} message - Az összefoglalandó üzenet
 * @returns {Promise<string>} - Üzenet összefoglaló
 */
export const generateSummary = async (message) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        {
          role: "system",
          content: "Create brief, clear summaries of customer messages."
        },
        {
          role: "user",
          content: `Summarize this message in 2-3 clear sentences:
          
          ${message}`
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Summary generation failed:', error);
    return 'Message summary not available.';
  }
};

/**
 * Projektek elemzése
 * @param {Object} projectData - Projekt adatok elemzéshez
 * @returns {Promise<string>} - Projekt elemzés
 */
export const analyzeProject = async (projectData) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        {
          role: "system",
          content: "You are a project management AI assistant."
        },
        {
          role: "user",
          content: `Analyze this project and provide recommendations:
            Project: ${projectData.description}
            Type: ${projectData.projectType}
            Budget: ${projectData.budget}
          `
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Project analysis failed:', error);
    return null;
  }
};