import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, File, Upload, X, Send, Paperclip, Eye, Download, Reply, Image, AlertCircle, CheckCircle } from 'lucide-react';

const ProjectActivityModal = ({ 
  project, 
  isOpen, 
  onClose, 
  onSendComment, 
  onUploadFile,
  onMarkAsRead,
  initialTab = 'comments'
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const commentInputRef = useRef(null);

  const comments = project?.comments || [];
  const files = project?.files || [];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'comments');
      
      // Ha van olvasatlan aktivitás, jelöljük olvasottnak
      if ((project?.activityCounters?.hasNewComments || project?.activityCounters?.hasNewFiles) && onMarkAsRead) {
        onMarkAsRead(project._id);
      }

      // Fókusz a hozzászólás beviteli mezőre, ha éppen válaszolunk
      if (initialTab === 'comments' && commentInputRef.current) {
        setTimeout(() => {
          commentInputRef.current.focus();
        }, 300);
      }
    } else {
      setNewComment('');
      setReplyTo(null);
      setSelectedFile(null);
      setFilePreview(null);
      setUploadProgress(0);
      setUploadStatus(null);
    }
  }, [isOpen, project, onMarkAsRead, initialTab]);

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

  // Enter gombra küldés
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  // Fájl kiválasztása
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    createFilePreview(file);
  };

  // Fájl előnézet létrehozása
  const createFilePreview = (file) => {
    // Reset previous states
    setFilePreview(null);
    setUploadProgress(0);
    setUploadStatus(null);

    // For images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview({
          type: 'image',
          content: event.target.result
        });
      };
      reader.readAsDataURL(file);
    } 
    // For PDFs
    else if (file.type === 'application/pdf') {
      setFilePreview({
        type: 'pdf',
        name: file.name
      });
    } 
    // For other files
    else {
      setFilePreview({
        type: 'generic',
        name: file.name,
        size: file.size,
        extension: file.name.split('.').pop()
      });
    }
  };

  // Fájl feltöltése
  const handleUploadFile = () => {
    if (!selectedFile) return;
  
    // Szimuláljuk a feltöltési folyamatot
    setUploadStatus('uploading');
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setUploadProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const fileData = {
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
            content: event.target.result, // Base64 formátum
            uploadedBy: 'Admin'
          };
  
          console.log('Calling onUploadFile with:', { 
            projectId: project._id, 
            fileName: fileData.name,
            fileSize: fileData.size,
            contentPreview: fileData.content.substring(0, 100) + '...'
          });
          
          if (typeof onUploadFile !== 'function') {
            console.error('onUploadFile is not a function!', onUploadFile);
            setUploadStatus('error');
            return;
          }
  
          onUploadFile(project._id, fileData);
          setUploadStatus('success');
          
          // Reset after success
          setTimeout(() => {
            setSelectedFile(null);
            setFilePreview(null);
            setUploadProgress(0);
            setUploadStatus(null);
          }, 2000);
        };
        reader.readAsDataURL(selectedFile);
      }
    }, 50);
  };
  

  // Drag & Drop kezelése
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      createFilePreview(file);
    }
  };

  // Fájltípus ikon kiválasztása a kiterjesztés alapján
  const getFileIcon = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return (
          <svg className="h-8 w-8 text-red-500" viewBox="0 0 24 24">
            <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10.92,12.31C10.68,11.54 10.15,9.08 11.55,9.04C12.95,9 12.03,12.16 12.03,12.16C12.42,13.65 14.05,14.72 14.05,14.72C14.55,14.57 17.4,14.24 17,15.72C16.57,17.2 13.5,15.87 13.5,15.87C11.55,15.16 10.13,16.04 10.13,16.04C8.4,16.57 7.2,14.83 7.2,14.83C6.5,12.85 10.92,12.31 10.92,12.31M10.31,16.15C10.31,16.15 11.81,15.22 14.05,16.26C14.05,16.26 16,17.03 16.4,16.3C16.8,15.58 15.14,15.87 14.38,15.91C13.62,15.95 11.69,15.15 10.31,16.15M9.15,12.95C9.15,12.95 8.8,13.34 9.24,14.38C9.24,14.38 9.5,15.5 10.24,15.11C10.24,15.11 11.24,14.07 11.5,13.5C11.5,13.5 12.3,11.1 12.53,10.63C12.76,10.15 11.84,10.27 11.17,11C10.5,11.7 9.15,12.95 9.15,12.95Z" />
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg className="h-8 w-8 text-blue-500" viewBox="0 0 24 24">
            <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M9.5,11A1.5,1.5 0 0,1 11,12.5V13H9V13.75H11V15H10V16H9V15H8V13.75H9V13H8V12.5A1.5,1.5 0 0,1 9.5,11M9.5,11.5A0.5,0.5 0 0,0 9,12H10A0.5,0.5 0 0,0 9.5,11.5M15.5,11A1.5,1.5 0 0,1 17,12.5V15.5A1.5,1.5 0 0,1 15.5,17A1.5,1.5 0 0,1 14,15.5V12.5A1.5,1.5 0 0,1 15.5,11M15.5,11.5A0.5,0.5 0 0,0 15,12V15.5A0.5,0.5 0 0,0 15.5,16A0.5,0.5 0 0,0 16,15.5V12A0.5,0.5 0 0,0 15.5,11.5M11.5,12A1.5,1.5 0 0,1 13,13.5V14.5A1.5,1.5 0 0,1 11.5,16A1.5,1.5 0 0,1 10,14.5V13.5A1.5,1.5 0 0,1 11.5,12M11.5,12.5A0.5,0.5 0 0,0 11,13V14.5A0.5,0.5 0 0,0 11.5,15A0.5,0.5 0 0,0 12,14.5V13A0.5,0.5 0 0,0 11.5,12.5Z" />
          </svg>
        );
      case 'xls':
      case 'xlsx':
        return (
          <svg className="h-8 w-8 text-green-500" viewBox="0 0 24 24">
            <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10,19H8V18H10V19M10,16H8V15H10V16M10,13H8V12H10V13M16,19H14V18H16V19M16,16H14V15H16V16M16,13H14V12H16V13M12,10H8V9H12V10M16,10H14V9H16V10Z" />
          </svg>
        );
      case 'ppt':
      case 'pptx':
        return (
          <svg className="h-8 w-8 text-orange-500" viewBox="0 0 24 24">
            <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M8,14H10V16H8V14M8,12H10V13H8V12M8,9H10V11H8V9M12,9H15V11H12V9M12,12H15V13H12V12M12,14H15V16H12V14Z" />
          </svg>
        );
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <Image className="h-8 w-8 text-blue-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  // Format filesize
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Formázott dátum
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Close on escape key
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // Close on outside click
  const handleOutsideClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={handleOutsideClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fejléc */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            Projekt aktivitások: {project.name}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Fülek */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'comments' 
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('comments')}
          >
            <div className="flex items-center">
              <MessageCircle className="h-5 w-5 mr-2" />
              Hozzászólások
              {project?.activityCounters?.hasNewComments && (
                <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-red-800 text-xs">
                  <span className="animate-pulse">●</span>
                </span>
              )}
            </div>
          </button>
          <button
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'files' 
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('files')}
          >
            <div className="flex items-center">
              <File className="h-5 w-5 mr-2" />
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
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'comments' ? (
            <div className="p-6 space-y-6">
              {comments.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                  <MessageCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">Nincsenek hozzászólások</p>
                  <p className="text-gray-400 text-sm mt-1">Legyen Ön az első, aki hozzászól</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {comments.map((comment, index) => {
                    // Check if comment is a reply to another comment
                    const isReply = comment.replyTo;
                    const repliedComment = isReply 
                      ? comments.find(c => (c._id || c.id) === comment.replyTo) 
                      : null;
                    
                    return (
                      <div 
                        key={comment._id || comment.id || index} 
                        className={`p-4 rounded-lg ${
                          comment.isAdminComment 
                            ? isReply ? 'bg-indigo-50 border border-indigo-100 ml-8' : 'bg-indigo-50 border border-indigo-100'
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <div className="flex items-start">
                          <div className={`h-10 w-10 rounded-full ${
                            comment.isAdminComment ? 'bg-indigo-100' : 'bg-emerald-100'
                          } flex items-center justify-center mr-3 flex-shrink-0`}>
                            <span className={`font-bold ${
                              comment.isAdminComment ? 'text-indigo-800' : 'text-emerald-800'
                            }`}>
                              {comment.author?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-gray-900">
                                {comment.author || 'Felhasználó'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(comment.timestamp)}
                              </span>
                            </div>
                            
                            {/* Replied to content */}
                            {isReply && repliedComment && (
                              <div className="mb-2 p-2 bg-gray-100 rounded text-sm border-l-2 border-gray-300">
                                <div className="flex items-center text-xs text-gray-500 mb-1">
                                  <Reply className="h-3 w-3 mr-1" />
                                  Válasz neki: {repliedComment.author}
                                </div>
                                <p className="text-gray-600 line-clamp-2">{repliedComment.text}</p>
                              </div>
                            )}
                            
                            <p className="text-gray-800 whitespace-pre-line">{comment.text}</p>
                            
                            {!comment.isAdminComment && (
                              <button 
                                onClick={() => setReplyTo(comment)}
                                className="mt-2 text-indigo-600 text-sm flex items-center hover:text-indigo-800 transition-colors"
                              >
                                <Reply className="h-3 w-3 mr-1" />
                                Válasz
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Fájl feltöltő szekció */}
              <div 
                className={`relative border-2 rounded-lg p-6 transition-colors ${
                  dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-dashed border-gray-300 bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  
                  {!selectedFile ? (
                    <>
                      <h3 className="font-medium text-gray-700 mb-1">Húzza ide a fájlt, vagy kattintson a feltöltéshez</h3>
                      <p className="text-sm text-gray-500 mb-4">Támogatott formátumok: JPG, PNG, PDF, DOC, XLS</p>
                      
                      <label className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors cursor-pointer">
                        <span>Fájl kiválasztása</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </label>
                    </>
                  ) : (
                    <div className="w-full max-w-md">
                      {uploadStatus === 'uploading' ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">Feltöltés folyamatban...</span>
                            <span className="text-sm font-medium text-gray-700">{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-100 ease-out"
                              style={{ width: `${uploadProgress}%` }} 
                            ></div>
                          </div>
                        </div>
                      ) : uploadStatus === 'success' ? (
                        <div className="text-center py-4">
                          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                          <h3 className="font-medium text-green-700">Feltöltés sikeres!</h3>
                        </div>
                      ) : uploadStatus === 'error' ? (
                        <div className="text-center py-4">
                          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                          <h3 className="font-medium text-red-700">Feltöltés sikertelen!</h3>
                          <button
                            onClick={() => setUploadStatus(null)}
                            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                          >
                            Próbálja újra
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center bg-white p-3 rounded-lg border border-gray-200 mb-4">
                            {filePreview?.type === 'image' ? (
                              <img 
                                src={filePreview.content} 
                                alt="Preview" 
                                className="h-12 w-12 object-cover rounded mr-3"
                              />
                            ) : (
                              <div className="h-12 w-12 flex items-center justify-center mr-3">
                                {getFileIcon(selectedFile.name)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate">{selectedFile.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedFile(null);
                                setFilePreview(null);
                              }}
                              className="ml-2 text-gray-400 hover:text-gray-600"
                            >
                              <X size={18} />
                            </button>
                          </div>
                          
                          <div className="flex space-x-3">
                            <button
                              onClick={() => {
                                setSelectedFile(null);
                                setFilePreview(null);
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            >
                              Mégse
                            </button>
                            <button
                              onClick={handleUploadFile}
                              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Feltöltés
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Fájl lista */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Feltöltött fájlok</h3>
                
                {files.length === 0 ? (
                  <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                    <File className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 font-medium">Nincsenek feltöltött fájlok</p>
                    <p className="text-gray-400 text-sm mt-1">A feltöltött fájlok itt fognak megjelenni</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="divide-y divide-gray-200">
                      {files.map((file, index) => (
                        <div 
                          key={file._id || file.id || index} 
                          className="p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="h-12 w-12 flex items-center justify-center mr-4 flex-shrink-0">
                              {getFileIcon(file.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium text-gray-900 truncate">{file.name}</h4>
                                  <div className="flex flex-wrap items-center text-xs text-gray-500 mt-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                                      file.uploadedBy === 'Admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {file.uploadedBy}
                                    </span>
                                    <span className="mx-2">•</span>
                                    <span>{formatDate(file.uploadedAt)}</span>
                                    <span className="mx-2">•</span>
                                    <span>{formatFileSize(file.size)}</span>
                                  </div>
                                </div>
                                <div className="flex space-x-1 ml-4">
                                  <button 
                                    className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition-colors"
                                    title="Megtekintés"
                                  >
                                    <Eye size={18} />
                                  </button>
                                  <button 
                                    className="p-1 text-gray-400 hover:text-green-600 rounded hover:bg-green-50 transition-colors"
                                    title="Letöltés"
                                  >
                                    <Download size={18} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Lábléc / Input mező (csak a hozzászólások fülnél) */}
        {activeTab === 'comments' && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            {replyTo && (
              <div className="mb-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center">
                <div>
                  <span className="font-medium text-indigo-800">Válasz neki:</span>{' '}
                  <span className="text-gray-700">{replyTo.author}</span>
                  <p className="text-gray-500 text-sm mt-1 line-clamp-1">{replyTo.text}</p>
                </div>
                <button 
                  onClick={() => setReplyTo(null)}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex space-x-3">
              <textarea
                ref={commentInputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Írja be a hozzászólását..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all"
                rows={3}
              />
              <div className="flex flex-col justify-end">
                <button
                  onClick={handleSendComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Küldés
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Enter gomb: küldés • Shift+Enter: új sor
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectActivityModal;