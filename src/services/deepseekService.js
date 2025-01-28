const DEEPSEEK_API_KEY = 'sk-a781f0251b034cf6b91f970b43d9caa5';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

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

// SEO Optimalizáció
export const generateSEOSuggestions = async (content, language) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        { role: "system", content: "You are an SEO expert assistant. Provide clear, structured suggestions." },
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

    try {
      return response.choices[0].message.content;
    } catch (parseError) {
      console.error('Parse error in SEO suggestions:', parseError);
      return {
        metaTitle: '',
        metaDescription: '',
        keywords: [],
        suggestions: []
      };
    }
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

// Automatikus fordítás
export const translateContent = async (content, sourceLanguage, targetLanguage) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        { role: "system", content: "You are a professional translator. Provide accurate translations." },
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
    return content; // Return original content if translation fails
  }
};

// SEO Meta címek és leírások generálása
export const generateMetaContent = async (content, language) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        { 
          role: "system", 
          content: "You are an SEO metadata specialist. Respond ONLY with a valid JSON object containing metaTitle and metaDescription." 
        },
        { role: "user", content: `
          Generate SEO-optimized meta title and description.
          Language: ${language}
          
          Content:
          ${content}
          
          Respond EXACTLY in this format:
          {"metaTitle":"60 chars max title","metaDescription":"160 chars max description"}
        ` }
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

// Tag javaslatok
export const suggestTags = async (content, language) => {
  try {
    const response = await callDeepSeekAPI({
      messages: [
        { 
          role: "system", 
          content: "You are a content tagger. Respond ONLY with a valid JSON array of strings." 
        },
        { role: "user", content: `
          Generate relevant tags for this content.
          Language: ${language}
          
          Content:
          ${content}
          
          Respond EXACTLY in this format:
          ["tag1","tag2","tag3"]
        ` }
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

// Contact üzenet kategorizálás
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

// Válasz javaslat generálás
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

// Üzenet összefoglaló generálás
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