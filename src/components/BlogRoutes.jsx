import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BlogManagement from '../components/BlogManagement';

/**
 * Blog module routing component
 * Handles all routes related to blog management
 */
const BlogRoutes = () => {
  return (
    <Routes>
      {/* List all blog posts */}
      <Route path="/" element={<BlogManagement />} />
      
      {/* Create new blog post */}
      <Route path="/new" element={<BlogManagement />} />
      
      {/* Edit existing blog post */}
      <Route path="/edit/:id" element={<BlogManagement />} />
      
      {/* Redirect any other blog routes to the main blog page */}
      <Route path="*" element={<Navigate to="/blog" replace />} />
    </Routes>
  );
};

export default BlogRoutes;