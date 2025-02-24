import { deepseekService } from './deepseekService';

// Eszköz a hibakereséshez
const debugLog = (message, data) => {
  console.log(`[ChatGPT Service] ${message}`, data);
};

// Explicit exportok
export function generateBlogContent(topic, language = 'hu') {
  debugLog('generateBlogContent called', { topic, language });
  return deepseekService.generateBlogContent(topic, language);
}

export function generateTitle(topic, language = 'hu') {
  debugLog('generateTitle called', { topic, language });
  return deepseekService.generateTitle(topic, language);
}

export function generateSEODescription(content, language = 'hu') {
  debugLog('generateSEODescription called', { content, language });
  return deepseekService.generateSEODescription(content, language);
}

export function translateContent(content, fromLang = 'hu', toLang = 'en') {
  debugLog('translateContent called', { content, fromLang, toLang });
  return deepseekService.translateContent(content, fromLang, toLang);
}

// Default export is hozzáadva
export default {
  generateBlogContent,
  generateTitle,
  generateSEODescription,
  translateContent
};