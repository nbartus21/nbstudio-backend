import { deepseekService } from './deepseekService';

// Exportáljuk külön a függvényeket
export const generateBlogContent = (topic, language = 'hu') => 
  deepseekService.generateBlogContent(topic, language);

export const generateTitle = (topic, language = 'hu') => 
  deepseekService.generateTitle(topic, language);

export const generateSEODescription = (content, language = 'hu') => 
  deepseekService.generateSEODescription(content, language);

export const translateContent = (content, fromLang = 'hu', toLang = 'en') => 
  deepseekService.translateContent(content, fromLang, toLang);

// Opcionálisan exportálhatunk egy default objektumot is
const chatGptService = {
  generateBlogContent,
  generateTitle,
  generateSEODescription,
  translateContent
};

export default chatGptService;