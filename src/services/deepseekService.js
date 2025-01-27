
const DEEPSEEK_API_KEY = 'sk-a781f0251b034cf6b91f970b43d9caa5';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'; // Módosított URL

const callDeepSeekAPI = async (payload) => {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat", // A dokumentáció szerint ezt kell használni
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

// SEO Optimalizáció
export const generateSEOSuggestions = async (content, language) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        { role: "system", content: "You are an SEO expert assistant." },
        { role: "user", content: `
          Analyze this content and provide SEO optimization suggestions.
          Content language: ${language}
          
          Content:
          ${content}
          
          Please provide:
          1. Suggested meta title (max 60 characters)
          2. Meta description (max 160 characters)
          3. Focus keywords
          4. Content improvement suggestions
        ` }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('SEO suggestion generation failed:', error);
    throw error;
  }
};

// Automatikus fordítás
export const translateContent = async (content, sourceLanguage, targetLanguage) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        { role: "system", content: "You are a professional translator." },
        { role: "user", content: `
          Translate this content from ${sourceLanguage} to ${targetLanguage}.
          Maintain the formatting and style.
          
          Content to translate:
          ${content}
        ` }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Translation failed:', error);
    throw error;
  }
};

// SEO Meta címek és leírások generálása
export const generateMetaContent = async (content, language) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        { role: "system", content: "You are an SEO metadata specialist." },
        { role: "user", content: `
          Generate SEO-optimized meta title and description.
          Language: ${language}
          
          Content:
          ${content}
          
          Respond in this format:
          {
            "metaTitle": "60 characters max title",
            "metaDescription": "160 characters max description"
          }
        ` }
      ]
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Meta content generation failed:', error);
    throw error;
  }
};

// Automatikus tag javaslatok
export const suggestTags = async (content, language) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        { role: "system", content: "You are a content categorization specialist." },
        { role: "user", content: `
          Suggest relevant tags for this content.
          Language: ${language}
          
          Content:
          ${content}
          
          Provide response as a JSON array of tags.
        ` }
      ]
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Tag suggestion failed:', error);
    throw error;
  }
};