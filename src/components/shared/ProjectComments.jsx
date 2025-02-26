import React, { useState, useEffect } from 'react';
import { MessageCircle, Trash2, Plus } from 'lucide-react';
import { formatDate, debugLog, saveToLocalStorage } from './utils';

const ProjectComments = ({ project, comments, setComments, showSuccessMessage, showErrorMessage }) => {
  const [newComment, setNewComment] = useState('');

  // Debug info at mount
  useEffect(() => {
    debugLog('ProjectComments-mount', {
      projectId: project?._id,
      commentsCount: comments?.length || 0
    });
  }, []);

  // Filter for project-specific comments
  const projectComments = comments.filter(comment => comment.projectId === project._id);
  
  // Comment addition handler with debug info
  const handleAddComment = () => {
    debugLog('handleAddComment', 'Adding new comment', { projectId: project?._id, text: newComment });
    
    if (!project || !project._id) {
      debugLog('handleAddComment', 'ERROR: No project ID');
      showErrorMessage('Nincs érvényes projekt azonosító!');
      return;
    }
    
    if (!newComment.trim()) {
      debugLog('handleAddComment', 'Empty comment - skipping');
      return;
    }
    
    try {
      debugLog('handleAddComment', 'Creating comment object');
      
      const comment = {
        id: Date.now(),
        text: newComment,
        author: 'Ügyfél',
        timestamp: new Date().toISOString(),
        projectId: project._id
      };
      
      // Update comments state with the new comment
      const updatedComments = [comment, ...comments];
      setComments(updatedComments);
      
      // Save to localStorage
      debugLog('handleAddComment', 'Saving to localStorage');
      const saved = saveToLocalStorage(project._id, 'comments', updatedComments);
      debugLog('handleAddComment', 'Saved to localStorage:', saved);
      
      // Reset input and show success message
      setNewComment('');
      showSuccessMessage('Hozzászólás sikeresen hozzáadva');
      debugLog('handleAddComment', 'Comment added successfully');
    } catch (error) {
      debugLog('handleAddComment', 'Error adding comment', error);
      showErrorMessage('Hiba történt a hozzászólás hozzáadásakor');
    }
  };

  // Comment deletion handler
  const handleDeleteComment = (commentId) => {
    debugLog('handleDeleteComment', `Deleting comment ID: ${commentId}`);
    
    if (!window.confirm('Biztosan törölni szeretné ezt a hozzászólást?')) {
      debugLog('handleDeleteComment', 'Deletion cancelled by user');
      return;
    }
    
    try {
      // Find the comment to be deleted for logging
      const commentToDelete = comments.find(comment => comment.id === commentId);
      debugLog('handleDeleteComment', 'Comment to delete:', commentToDelete);
      
      // Update comments state without the deleted comment
      const updatedComments = comments.filter(comment => comment.id !== commentId);
      setComments(updatedComments);
      
      // Save to localStorage
      saveToLocalStorage(project._id, 'comments', updatedComments);
      
      showSuccessMessage('Hozzászólás sikeresen törölve');
      debugLog('handleDeleteComment', 'Comment deleted successfully');
    } catch (error) {
      debugLog('handleDeleteComment', 'Error deleting comment', error);
      showErrorMessage('Hiba történt a törlés során');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium">Hozzászólások</h2>
      </div>
      
      {/* Add Comment Form */}
      <div className="p-6 border-b border-gray-200">
        <form onSubmit={(e) => {
          e.preventDefault();
          handleAddComment();
        }}>
          <div className="mb-3">
            <label htmlFor="commentText" className="block text-sm font-medium text-gray-700 mb-1">
              Új hozzászólás
            </label>
            <textarea
              id="commentText"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              rows={4}
              placeholder="Írja ide hozzászólását..."
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Hozzászólás küldése
            </button>
          </div>
        </form>
      </div>
      
      {/* Comments List */}
      <div className="divide-y divide-gray-200">
        {projectComments.length > 0 ? (
          projectComments.map((comment) => (
            <div key={comment.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-800 font-bold">
                      {comment.author && comment.author[0].toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-gray-900">{comment.author}</div>
                    <div className="text-sm text-gray-500">{formatDate(comment.timestamp)}</div>
                  </div>
                  <div className="mt-2 text-gray-700 whitespace-pre-wrap text-sm">
                    {comment.text}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-600 hover:text-red-800 text-sm flex items-center"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Törlés
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium text-gray-600">Még nincsenek hozzászólások</p>
            <p className="text-sm mt-1">Legyen Ön az első, aki hozzászól a projekthez!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectComments;