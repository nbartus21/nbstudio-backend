import { deepseekService } from './deepseekService';

// Módosítsuk az exportokat
export const generateBlogContent = async (topic, language = 'hu') => {
  return deepseekService.generateBlogContent(topic, language);
};

export const generateTitle = async (topic, language = 'hu') => {
  return deepseekService.generateTitle(topic, language);
};

export const generateSEODescription = async (content, language = 'hu') => {
  return deepseekService.generateSEODescription(content, language);
};

export const translateContent = async (content, fromLang = 'hu', toLang = 'en') => {
  return deepseekService.translateContent(content, fromLang, toLang);
};

// Ha több exportált függvény is van, explicit export listát is használhatunk
export {
  generateBlogContent,
  generateTitle,
  generateSEODescription,
  translateContent
};