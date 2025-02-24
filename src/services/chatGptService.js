// services/chatGptService.js

/**
 * Compatibility layer that redirects functions to deepseekService
 * This file exists to maintain backward compatibility with existing code
 * that imports from chatGptService while we transition to deepseekService.
 */

import { deepseekService } from './deepseekService';

/**
 * Generate blog content on a specific topic
 * @param {string} topic - The blog topic
 * @param {string} language - Target language code
 * @returns {Promise<string>} - Generated HTML content
 */
export const generateBlogContent = async (topic, language = 'hu') => {
  return deepseekService.generateBlogContent(topic, language);
};

/**
 * Generate a title for a blog post
 * @param {string} topic - The blog topic
 * @param {string} language - Target language code
 * @returns {Promise<string>} - Generated title
 */
export const generateTitle = async (topic, language = 'hu') => {
  return deepseekService.generateTitle(topic, language);
};

/**
 * Generate SEO description for a blog post
 * @param {string} content - The blog content or topic
 * @param {string} language - Target language code
 * @returns {Promise<string>} - Generated SEO description
 */
export const generateSEODescription = async (content, language = 'hu') => {
  return deepseekService.generateSEODescription(content, language);
};

/**
 * Translate content from one language to another
 * @param {string} content - The content to translate
 * @param {string} fromLang - Source language code
 * @param {string} toLang - Target language code
 * @returns {Promise<string>} - Translated content
 */
export const translateContent = async (content, fromLang = 'hu', toLang = 'en') => {
  return deepseekService.translateContent(content, fromLang, toLang);
};

/**
 * Generate SEO suggestions for content
 * @param {string} content - The content to analyze
 * @param {string} language - Content language
 * @returns {Promise<Object>} - SEO suggestions
 */
export const generateSEOSuggestions = async (content, language) => {
  return deepseekService.generateSEOSuggestions(content, language);
};

/**
 * Generate meta content (title and description)
 * @param {string} content - The content to analyze
 * @param {string} language - Content language
 * @returns {Promise<Object>} - Meta content object
 */
export const generateMetaContent = async (content, language) => {
  return deepseekService.generateMetaContent(content, language);
};

/**
 * Suggest tags for content
 * @param {string} content - The content to analyze
 * @param {string} language - Content language
 * @returns {Promise<Array>} - Array of tag strings
 */
export const suggestTags = async (content, language) => {
  return deepseekService.suggestTags(content, language);
};

/**
 * Categorize contact messages
 * @param {string} message - The message to categorize
 * @returns {Promise<Object>} - Category information
 */
export const categorizeMessage = async (message) => {
  return deepseekService.categorizeMessage(message);
};

/**
 * Generate response suggestions for messages
 * @param {string} message - The message to respond to
 * @returns {Promise<string>} - Suggested response
 */
export const generateResponseSuggestion = async (message) => {
  return deepseekService.generateResponseSuggestion(message);
};

/**
 * Generate message summaries
 * @param {string} message - The message to summarize
 * @returns {Promise<string>} - Message summary
 */
export const generateSummary = async (message) => {
  return deepseekService.generateSummary(message);
};

/**
 * Analyze projects
 * @param {Object} projectData - Project data to analyze
 * @returns {Promise<string>} - Project analysis
 */
export const analyzeProject = async (projectData) => {
  return deepseekService.analyzeProject(projectData);
};