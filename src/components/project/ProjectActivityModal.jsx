import React, { useState, useEffect } from 'react';
import { MessageCircle, File, Upload, X, Send, Paperclip, Eye, Download, Reply } from 'lucide-react';

const ProjectActivityModal = ({ 
  project, 
  isOpen, 
  onClose, 
  onSendComment, 
  onUploadFile,
  onMarkAsRead 
}) => {
  const [activeTab, setActiveTab] = useState('comments');
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const comments = project?.comments || [];
  const files = project?.files || [];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Ha van olvasatlan aktivitás, jelöljük olvasottnak
      if ((project?.activityCounters?.hasNewComments || project?.activityCounters?.hasNewFiles) && onMarkAsRead) {
        onMarkAsRead(project._id);
      }

      // Ha admin válasz szükséges, nyissuk meg alapból a hozzászólások fület
      if (project?.activityCounters?.adminResponseRequired) {
        setActiveTab('comments');
      }
    } else {
      setNewComment('');
      setReplyTo(null);
      setSelectedFile(null);
      setFilePreview(null);
    }
  }, [isOpen, project, onMarkAsRead]);

  // Hozzászólás küldése
  const handleSendComment = () => {
    if (!newComment.trim()) return;

    const commentData = {
      text: newComment,
      author: 'Admin',
      isAdminComment: true,
      replyTo: replyTo?.id || replyTo?._id
    };

    onSendComment(project._id, commentData);
    setNewComment('');
    setReplyTo(null);
  };

  // Fájl kiválasztása
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    // Fájl előnézet generálása (ha kép)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  // Fájl feltöltése
  const handleUploadFile = () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        content: event.target.result, // Base64 formátum
        uploadedBy: 'Admin'
      };

      onUploadFile(project._id, fileData);
      setSelectedFile(null);
      setFilePreview(null);
    };
    reader.readAsDataURL(selectedFile);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Fejléc */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">
            Projekt aktivitások: {project.name}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Fülek */}
        <div className="flex border-b">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'comments' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('comments')}
          >
            <div className="flex items-center">
              <MessageCircle className="h-4 w-4 mr-2" />
              Hozzászólások
              {project?.activityCounters?.hasNewComments && (
                <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-red-800 text-xs">
                  <span className="animate-pulse">●</span>
                </span>
              )}
            </div>
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'files' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('files')}
          >
            <div className="flex items-center">
              <File className="h-4 w-4 mr-2" />
              Fájlok
              {project?.activityCounters?.hasNewFiles && (
                <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-red-800 text-xs">
                  <span className="animate-pulse">●</span>
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Tartalom */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'comments' ? (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Nincsenek hozzászólások</p>
                </div>
              ) : (
                comments.map((comment, index) => (
                  <div 
                    key={comment._id || comment.id || index} 
                    className={`p-4 rounded-lg ${
                      comment.isAdminComment ? 'bg-blue-50 ml-8' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`h-10 w-10 rounded-full ${
                        comment.isAdminComment ? 'bg-blue-100' : 'bg-green-100'
                      } flex items-center justify-center mr-3`}>
                        <span className={`font-bold ${
                          comment.isAdminComment ? 'text-blue-800' : 'text-green-800'
                        }`}>
                          {comment.author?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium">{comment.author || 'Felhasználó'}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1">{comment.text}</p>
                        
                        {!comment.isAdminComment && (
                          <button 
                            onClick={() => setReplyTo(comment)}
                            className="mt-2 text-blue-600 text-sm flex items-center"
                          >
                            <Reply className="h-3 w-3 mr-1" />
                            Válasz
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Fájl feltöltő szekció */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium mb-3">Új fájl feltöltése</h3>
                <div className="flex flex-col space-y-3">
                  {filePreview && (
                    <div className="border rounded p-2 bg-white">
                      {filePreview.startsWith('data:image/') ? (
                        <img 
                          src={filePreview} 
                          alt="Preview" 
                          className="max-h-40 mx-auto"
                        />
                      ) : (
                        <div className="flex items-center text-gray-700 p-2">
                          <File className="h-5 w-5 mr-2" />
                          <span>{selectedFile?.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <label className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                    <Paperclip className="h-5 w-5 mr-2 text-gray-500" />
                    <span>Fájl kiválasztása</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                  
                  <button
                    onClick={handleUploadFile}
                    disabled={!selectedFile}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Feltöltés
                  </button>
                </div>
              </div>
              
              {/* Fájl lista */}
              {files.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <File className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Nincsenek feltöltött fájlok</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b">
                    <h3 className="font-medium">Feltöltött fájlok</h3>
                  </div>
                  <div className="divide-y">
                    {files.map((file, index) => (
                      <div 
                        key={file._id || file.id || index} 
                        className="p-3 hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center mr-3">
                            <File className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <div className="font-medium">{file.name}</div>
                            <div className="text-xs text-gray-500">
                              {file.uploadedBy} · {new Date(file.uploadedAt).toLocaleDateString()} · 
                              {Math.round(file.size / 1024)} KB
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            className="p-1 text-gray-500 hover:text-blue-600 rounded hover:bg-blue-50"
                            title="Megtekintés"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            className="p-1 text-gray-500 hover:text-green-600 rounded hover:bg-green-50"
                            title="Letöltés"
                          >
                            <Download size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lábléc / Input mező (csak a hozzászólások fülnél) */}
        {activeTab === 'comments' && (
          <div className="border-t p-4">
            {replyTo && (
              <div className="mb-2 p-2 bg-gray-100 rounded-lg flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">Válasz neki:</span> {replyTo.author}
                </div>
                <button 
                  onClick={() => setReplyTo(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex space-x-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Írja be a hozzászólását..."
                className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <button
                onClick={handleSendComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 self-end flex items-center"
              >
                <Send className="h-4 w-4 mr-2" />
                Küldés
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectActivityModal;