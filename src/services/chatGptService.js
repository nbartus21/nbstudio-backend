const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

// Ellenőrizzük, hogy az API kulcs be van-e állítva
if (!OPENAI_API_KEY) {
  console.error('OpenAI API kulcs nincs beállítva! Ellenőrizd a .env fájlt.');
}

const generateContent = async (prompt, maxTokens = 2500) => {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API kulcs nincs beállítva');
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'ChatGPT API hiba');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('ChatGPT API hiba:', error);
    throw new Error('Nem sikerült a tartalom generálása: ' + error.message);
  }
};

export const generateBlogContent = async (topic, language) => {
  const languagePrompts = {
    hu: 'magyar nyelven',
    en: 'in English',
    de: 'auf Deutsch'
  };

  const prompt = `Írj egy blog bejegyzést a következő témáról: "${topic}" ${languagePrompts[language]}.
                 A szöveg legyen 1800-2000 karakter hosszú.
                 Strukturált, jól olvasható formában, bekezdésekkel.
                 SEO-barát megfogalmazással és kulcsszavakkal.
                 A szöveg legyen informatív és érdekes.`;

  return await generateContent(prompt);
};

export const generateTitle = async (topic, language) => {
  const languagePrompts = {
    hu: 'magyar nyelven',
    en: 'in English',
    de: 'auf Deutsch'
  };

  const prompt = `Generálj egy SEO-barát, figyelemfelkeltő címet a következő témájú blog bejegyzéshez: "${topic}" ${languagePrompts[language]}.
                 A cím legyen tömör, de informatív.`;

  return await generateContent(prompt, 100);
};

export const generateSEODescription = async (content, language) => {
  const languagePrompts = {
    hu: 'magyar nyelven',
    en: 'in English',
    de: 'auf Deutsch'
  };

  const prompt = `Készíts egy SEO-optimalizált meta leírást a következő blog bejegyzéshez ${languagePrompts[language]}. A leírás legyen 150-160 karakter.
                 
                 Blog tartalom:
                 ${content}`;

  return await generateContent(prompt, 200);
};

export const translateContent = async (content, fromLang, toLang) => {
  const prompt = `Fordítsd le a következő szöveget ${fromLang} nyelvről ${toLang} nyelvre. 
                 Tartsd meg az eredeti formázást és a szöveg stílusát.
                 
                 Szöveg:
                 ${content}`;

  return await generateContent(prompt);
};