import React, { useState, useEffect } from 'react';
import { MessageCircle, Trash2, Plus, User } from 'lucide-react';
import { formatDate, debugLog, saveToLocalStorage, getProjectId } from './utils';

// Translation data for all UI elements
const translations = {
  en: {
    comments: "Comments",
    adminComment: "Admin Comment",
    newComment: "New Comment",
    writeAdminComment: "Write your admin comment here...",
    writeComment: "Write your comment here...",
    sendAdminComment: "Send Admin Comment",
    sendComment: "Send Comment",
    delete: "Delete",
    noComments: "No comments yet",
    beFirstComment: "Be the first to comment on this project!",
    admin: "Admin",
    client: "Client",
    confirmDelete: "Are you sure you want to delete this comment?",
    commentAddSuccess: "Comment successfully added",
    adminCommentAddSuccess: "Admin comment successfully added",
    commentError: "Error adding comment",
    deleteSuccess: "Comment successfully deleted",
    deleteError: "Error deleting comment",
    projectIdError: "No valid project ID! Try refreshing the page."
  },
  de: {
    comments: "Kommentare",
    adminComment: "Admin Kommentar",
    newComment: "Neuer Kommentar",
    writeAdminComment: "Schreiben Sie hier Ihren Admin-Kommentar...",
    writeComment: "Schreiben Sie hier Ihren Kommentar...",
    sendAdminComment: "Admin-Kommentar senden",
    sendComment: "Kommentar senden",
    delete: "Löschen",
    noComments: "Noch keine Kommentare",
    beFirstComment: "Seien Sie der Erste, der dieses Projekt kommentiert!",
    admin: "Admin",
    client: "Kunde",
    confirmDelete: "Sind Sie sicher, dass Sie diesen Kommentar löschen möchten?",
    commentAddSuccess: "Kommentar erfolgreich hinzugefügt",
    adminCommentAddSuccess: "Admin-Kommentar erfolgreich hinzugefügt",
    commentError: "Fehler beim Hinzufügen des Kommentars",
    deleteSuccess: "Kommentar erfolgreich gelöscht",
    deleteError: "Fehler beim Löschen",
    projectIdError: "Keine gültige Projekt-ID! Versuchen Sie, die Seite zu aktualisieren."
  },
  hu: {
    comments: "Hozzászólások",
    adminComment: "Admin hozzászólás",
    newComment: "Új hozzászólás",
    writeAdminComment: "Írja ide az admin hozzászólását...",
    writeComment: "Írja ide hozzászólását...",
    sendAdminComment: "Admin hozzászólás küldése",
    sendComment: "Hozzászólás küldése",
    delete: "Törlés",
    noComments: "Még nincsenek hozzászólások",
    beFirstComment: "Legyen Ön az első, aki hozzászól a projekthez!",
    admin: "Admin",
    client: "Ügyfél",
    confirmDelete: "Biztosan törölni szeretné ezt a hozzászólást?",
    commentAddSuccess: "Hozzászólás sikeresen hozzáadva",
    adminCommentAddSuccess: "Admin hozzászólás sikeresen hozzáadva",
    commentError: "Hiba történt a hozzászólás hozzáadásakor",
    deleteSuccess: "Hozzászólás sikeresen törölve",
    deleteError: "Hiba történt a törlés során",
    projectIdError: "Nincs érvényes projekt azonosító! Próbálja frissíteni az oldalt."
  }
};

const ProjectComments = ({ 
  project, 
  comments, 
  setComments, 
  showSuccessMessage, 
  showErrorMessage, 
  isAdmin = false,
  language = 'hu'
}) => {
  const [newComment, setNewComment] = useState('');
  
  // Get translations based on language
  const t = translations[language] || translations.hu;
  
  // Get safe project ID
  const projectId = getProjectId(project);

  // Debug info at mount
  useEffect(() => {
    debugLog('ProjectComments-mount', {
      projectId: projectId,
      commentsCount: comments?.length || 0,
      isAdmin: isAdmin,
      language: language
    });
  }, []);

  // Filter for project-specific comments
  const projectComments = comments.filter(comment => comment.projectId === projectId);
  
  // Comment addition handler with debug info
  const handleAddComment = () => {
    debugLog('handleAddComment', 'Adding new comment', { projectId: projectId, text: newComment, isAdmin: isAdmin });
    
    if (!projectId) {
      debugLog('handleAddComment', 'ERROR: No project ID');
      showErrorMessage(t.projectIdError);
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
        author: isAdmin ? t.admin : t.client,
        timestamp: new Date().toISOString(),
        projectId: projectId,
        isAdminComment: isAdmin // Jelöljük meg, hogy admin hozzászólás-e
      };
      
      // Update comments state with the new comment
      const updatedComments = [comment, ...comments];
      setComments(updatedComments);
      
      // Save to localStorage
      debugLog('handleAddComment', 'Saving to localStorage');
      const saved = saveToLocalStorage(project, 'comments', updatedComments);
      debugLog('handleAddComment', 'Saved to localStorage:', saved);
      
      // Reset input and show success message
      setNewComment('');
      showSuccessMessage(isAdmin ? t.adminCommentAddSuccess : t.commentAddSuccess);
      debugLog('handleAddComment', 'Comment added successfully');
    } catch (error) {
      debugLog('handleAddComment', 'Error adding comment', error);
      showErrorMessage(t.commentError);
    }
  };

  // Comment deletion handler
  const handleDeleteComment = (commentId) => {
    debugLog('handleDeleteComment', `Deleting comment ID: ${commentId}`);
    
    if (!window.confirm(t.confirmDelete)) {
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
      saveToLocalStorage(project, 'comments', updatedComments);
      
      showSuccessMessage(t.deleteSuccess);
      debugLog('handleDeleteComment', 'Comment deleted successfully');
    } catch (error) {
      debugLog('handleDeleteComment', 'Error deleting comment', error);
      showErrorMessage(t.deleteError);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium">{t.comments}</h2>
      </div>
      
      {/* Add Comment Form */}
      <div className="p-6 border-b border-gray-200">
        <form onSubmit={(e) => {
          e.preventDefault();
          handleAddComment();
        }}>
          <div className="mb-3">
            <label htmlFor="commentText" className="block text-sm font-medium text-gray-700 mb-1">
              {isAdmin ? t.adminComment : t.newComment}
            </label>
            <textarea
              id="commentText"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${isAdmin ? 'bg-purple-50' : ''}`}
              rows={4}
              placeholder={isAdmin ? t.writeAdminComment : t.writeComment}
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newComment.trim()}
              className={`px-4 py-2 ${isAdmin ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isAdmin ? t.sendAdminComment : t.sendComment}
            </button>
          </div>
        </form>
      </div>
      
      {/* Comments List */}
      <div className="divide-y divide-gray-200">
        {projectComments.length > 0 ? (
          projectComments.map((comment) => (
            <div key={comment.id} className={`p-6 hover:bg-gray-50 ${comment.isAdminComment ? 'bg-purple-50' : ''}`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`h-10 w-10 rounded-full ${comment.isAdminComment ? 'bg-purple-100' : 'bg-indigo-100'} flex items-center justify-center`}>
                    <span className={`${comment.isAdminComment ? 'text-purple-800' : 'text-indigo-800'} font-bold`}>
                      {comment.author && comment.author[0].toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex justify-between items-center">
                    <div className={`font-medium ${comment.isAdminComment ? 'text-purple-900' : 'text-gray-900'}`}>
                      {comment.author}
                      {comment.isAdminComment && <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">{t.admin}</span>}
                    </div>
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
                      {t.delete}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium text-gray-600">{t.noComments}</p>
            <p className="text-sm mt-1">{t.beFirstComment}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectComments;