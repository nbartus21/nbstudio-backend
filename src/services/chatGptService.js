import { deepseekService } from './deepseekService';

const chatGptService = {
  generateBlogContent: (topic, language = 'hu') => 
    deepseekService.generateBlogContent(topic, language),
  
  generateTitle: (topic, language = 'hu') => 
    deepseekService.generateTitle(topic, language),
  
  generateSEODescription: (content, language = 'hu') => 
    deepseekService.generateSEODescription(content, language),
  
  translateContent: (content, fromLang = 'hu', toLang = 'en') => 
    deepseekService.translateContent(content, fromLang, toLang),
  
  generateSEOSuggestions: (content, language) => 
    deepseekService.generateSEOSuggestions(content, language),
  
  generateMetaContent: (content, language) => 
    deepseekService.generateMetaContent(content, language),
  
  suggestTags: (content, language) => 
    deepseekService.suggestTags(content, language)
};

export default chatGptService;