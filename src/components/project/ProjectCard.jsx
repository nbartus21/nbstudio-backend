import React, { useState, useEffect } from 'react';
import { Users, Calendar, FileText, MessageCircle, Upload, Trash2, Eye, Download, Link, Plus } from 'lucide-react';

const ProjectCard = ({ project, isAdmin = true }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [files, setFiles] = useState([]);
  const [showFileUpload, setShowFileUpload] = useState(false);

  // Példa fájlok és hozzászólások betöltése
  useEffect(() => {
    // Ezeket valós adatbázisból kellene betölteni
    setComments([
      { id: 1, author: 'Ügyfél', text: 'Mikor lesz kész a projekt?', timestamp: new Date(2025, 1, 24).toISOString(), isAdminComment: false },
      { id: 2, author: 'Admin', text: 'A projekt a tervezett ütemben halad, várhatóan két héten belül leszállítjuk az első verziót.', timestamp: new Date(2025, 1, 25).toISOString(), isAdminComment: true }
    ]);
    
    setFiles([
      { id: 1, name: 'dokumentacio.pdf', size: 2500000, uploadedAt: new Date(2025, 1, 22).toISOString() },
      { id: 2, name: 'tervek.zip', size: 15000000, uploadedAt: new Date(2025, 1, 23).toISOString() }
    ]);
  }, []);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment = {
      id: Date.now(),
      author: isAdmin ? 'Admin' : 'Ügyfél',
      text: newComment,
      timestamp: new Date().toISOString(),
      isAdminComment: isAdmin
    };
    
    setComments([comment, ...comments]);
    setNewComment('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-md w-full">
      {/* Fejléc rész */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">{project.name}</h2>
        <p className="text-gray-600">{project.description}</p>
        
        <div className="flex justify-between items-center mt-2">
          <span className={`px-2 py-1 text-xs rounded-full ${
            project.status === 'aktív' ? 'bg-green-100 text-green-800' :
            project.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {project.status}
          </span>
          <span className="text-gray-500 text-sm">{project.date}</span>
        </div>
      </div>
      
      {/* Megosztási információk */}
      {project.sharing && (
        <div className="bg-blue-50 p-4 border-b">
          <h3 className="font-medium text-blue-800 mb-2">Aktív megosztás</h3>
          <div className="space-y-1 text-sm">
            <div className="flex items-start">
              <span className="font-medium w-20">Link:</span>
              <a 
                href={project.sharing.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate flex-1"
              >
                {project.sharing.link}
              </a>
            </div>
            <div className="flex items-center">
              <span className="font-medium w-20">PIN kód:</span>
              <span className="bg-white px-2 py-1 rounded border">{project.sharing.pin}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium w-20">Lejárat:</span>
              <span>{project.sharing.expiryDate}</span>
            </div>
          </div>
          
          <div className="mt-2">
            <button className="w-full px-3 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 flex justify-center items-center">
              <Link className="h-4 w-4 mr-2" />
              Új megosztási link
            </button>
          </div>
        </div>
      )}
      
      {/* Gombok */}
      <div className="flex border-b">
        <button 
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 text-center ${activeTab === 'info' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-600'}`}
        >
          Részletek
        </button>
        <button 
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-3 text-center ${activeTab === 'files' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-600'}`}
        >
          Fájlok
        </button>
        <button 
          onClick={() => setActiveTab('comments')}
          className={`flex-1 py-3 text-center ${activeTab === 'comments' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-600'}`}
        >
          Hozzászólások
        </button>
      </div>
      
      {/* Tab tartalom */}
      <div className="p-4">
        {/* Részletek tab */}
        {activeTab === 'info' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-gray-500 text-sm">Ügyfél</p>
                <p className="font-medium">{project.client?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Státusz</p>
                <p className="font-medium">{project.status}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Létrehozva</p>
                <p className="font-medium">{project.date}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Lejárat</p>
                <p className="font-medium">{project.sharing?.expiryDate || 'N/A'}</p>
              </div>
            </div>
            
            <div className="pt-2">
              <button 
                className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700"
              >
                Új Számla
              </button>
            </div>

            <div className="pt-1">
              <button 
                className="w-full text-gray-600 bg-gray-100 py-2 rounded-md hover:bg-gray-200"
              >
                Részletek
              </button>
            </div>
            
            <div className="pt-1">
              <button 
                className="w-full text-red-600 bg-red-50 py-2 rounded-md hover:bg-red-100"
              >
                Törlés
              </button>
            </div>
          </div>
        )}
        
        {/* Fájlok tab */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            {isAdmin && (
              <div className="mb-4">
                <button 
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Fájl feltöltése
                </button>
                
                {showFileUpload && (
                  <div className="mt-3 p-3 border border-dashed border-gray-300 rounded-md bg-gray-50">
                    <div className="text-center">
                      <Upload className="h-6 w-6 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500 mt-1">Kattintson vagy húzza ide a fájlokat</p>
                      <input type="file" className="hidden" />
                      <button className="mt-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm">
                        Fájlok kiválasztása
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {files.length > 0 ? (
              <div className="space-y-2">
                {files.map(file => (
                  <div key={file.id} className="p-3 bg-gray-50 rounded-md flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="font-medium text-sm">{file.name}</div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-1 text-gray-500 hover:text-gray-700">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-indigo-500 hover:text-indigo-700">
                        <Download className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button className="p-1 text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Upload className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p>Még nincsenek feltöltött fájlok</p>
              </div>
            )}
          </div>
        )}
        
        {/* Hozzászólások tab */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            {/* Komment hozzáadása (csak adminok) */}
            {isAdmin && (
              <div className="mb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Írjon egy admin hozzászólást..."
                  className="w-full p-3 border rounded-md bg-purple-50 focus:ring-purple-500 focus:border-purple-500"
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Admin válasz küldése
                  </button>
                </div>
              </div>
            )}
            
            {/* Kommentek listája */}
            {comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map(comment => (
                  <div 
                    key={comment.id} 
                    className={`p-4 rounded-lg ${comment.isAdminComment ? 'bg-purple-50' : 'bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          comment.isAdminComment ? 'bg-purple-200 text-purple-800' : 'bg-gray-200 text-gray-800'
                        }`}>
                          {comment.author[0]}
                        </div>
                        <div className="ml-3">
                          <div className="font-medium flex items-center">
                            {comment.author}
                            {comment.isAdminComment && (
                              <span className="ml-2 px-2 py-0.5 bg-purple-200 text-purple-800 text-xs rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{formatDate(comment.timestamp)}</div>
                        </div>
                      </div>
                      {isAdmin && (
                        <button className="text-gray-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 pl-11 text-sm">
                      {comment.text}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <MessageCircle className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p>Még nincsenek hozzászólások</p>
              </div>
            )}
            
            {/* Felhasználó komment hozzáadása */}
            {!isAdmin && (
              <div className="pt-4 mt-4 border-t">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Írja ide hozzászólását..."
                  className="w-full p-3 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Hozzászólás küldése
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Példa projekt objektum
const exampleProject = {
  id: '1',
  name: 'muster mann',
  description: 'fdcbdfgbd',
  status: 'aktív',
  date: '2025. 02. 26.',
  client: { 
    name: 'Muster Mann'
  },
  sharing: {
    link: 'http://38.242.208.190:5173/shared-project/abc123',
    pin: '885834',
    expiryDate: '2029. 06. 26.'
  }
};

const ProjectCardDemo = () => {
  // Admin módot mutatjuk be
  const [isAdmin, setIsAdmin] = useState(true);
  
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-100 min-h-screen">
      <div className="w-full max-w-md mb-4">
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={() => setIsAdmin(!isAdmin)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Admin mód</span>
          </label>
        </div>
      </div>
      <ProjectCard project={exampleProject} isAdmin={isAdmin} />
    </div>
  );
};

export default ProjectCardDemo;