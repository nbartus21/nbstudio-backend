import { deepseekService } from './deepseekService';

// Debug log hozzáadása az exportáláshoz
console.log('DeepSeek Service:', deepseekService);

try {
  // Explicit hibakezelés éslogolás
  console.log('Attempting to export translateContent');
  
  const translateContent = (content, fromLang = 'hu', toLang = 'en') => {
    console.log('translateContent called with:', { content, fromLang, toLang });
    
    try {
      const result = deepseekService.translateContent(content, fromLang, toLang);
      console.log('Translation result:', result);
      return result;
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  };

  // Explicit export
  module.exports = {
    generateBlogContent: (topic, language = 'hu') => {
      console.log('generateBlogContent called with:', { topic, language });
      return deepseekService.generateBlogContent(topic, language);
    },
    generateTitle: (topic, language = 'hu') => {
      console.log('generateTitle called with:', { topic, language });
      return deepseekService.generateTitle(topic, language);
    },
    generateSEODescription: (content, language = 'hu') => {
      console.log('generateSEODescription called with:', { content, language });
      return deepseekService.generateSEODescription(content, language);
    },
    translateContent
  };

  // Log az exportált objektumról
  console.log('Exported module:', module.exports);
} catch (error) {
  console.error('Fatal error in chatGptService:', error);
}

// Alternatív export mód
export const generateBlogContent = (topic, language = 'hu') => 
  deepseekService.generateBlogContent(topic, language);

export const generateTitle = (topic, language = 'hu') => 
  deepseekService.generateTitle(topic, language);

export const generateSEODescription = (content, language = 'hu') => 
  deepseekService.generateSEODescription(content, language);

export const translateContent = (content, fromLang = 'hu', toLang = 'en') => 
  deepseekService.translateContent(content, fromLang, toLang);

// Default export is hozzáadva
export default {
  generateBlogContent,
  generateTitle,
  generateSEODescription,
  translateContent
};