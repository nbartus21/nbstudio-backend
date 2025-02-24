
import { deepseekService } from './deepseekService';

// Blog tartalom generálás
export const generateBlogContent = async (topic, language = 'hu') => {
  return deepseekService.generateBlogContent(topic, language);
};

// Blog cím generálás
export const generateTitle = async (topic, language = 'hu') => {
  return deepseekService.generateTitle(topic, language);
};

// SEO leírás generálás
export const generateSEODescription = async (content, language = 'hu') => {
  return deepseekService.generateSEODescription(content, language);
};

// Tartalom fordítás
export const translateContent = async (content, fromLang = 'hu', toLang = 'en') => {
  return deepseekService.translateContent(content, fromLang, toLang);
};

// SEO javaslatok
export const generateSEOSuggestions = async (content, language) => {
  return deepseekService.generateSEOSuggestions(content, language);
};

// Meta tartalom generálás
export const generateMetaContent = async (content, language) => {
  return deepseekService.generateMetaContent(content, language);
};

// Címkék javaslata
export const suggestTags = async (content, language) => {
  return deepseekService.suggestTags(content, language);
};

// Üzenet kategorizálás
export const categorizeMessage = async (message) => {
  return deepseekService.categorizeMessage(message);
};

// Válasz javaslat generálás
export const generateResponseSuggestion = async (message) => {
  return deepseekService.generateResponseSuggestion(message);
};

// Üzenet összefoglaló generálás
export const generateSummary = async (message) => {
  return deepseekService.generateSummary(message);
};

// Projekt elemzés
export const analyzeProject = async (projectData) => {
  return deepseekService.analyzeProject(projectData);
};