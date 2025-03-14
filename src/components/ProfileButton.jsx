import React, { useState } from 'react';
import { User, Settings, UserPlus, LogOut, ChevronDown } from 'lucide-react';
import ProfileEditModal from './ProfileEditModal';
import { debugLog } from './utils';

// API URL és key - ugyanazok mint a többi komponensben
const API_URL = 'https://admin.nb-studio.net:5001/api';
const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

// Translation data for all UI elements
const translations = {
  en: {
    profile: "Profile",
    editProfile: "Edit profile",
    logout: "Logout",
    createAccount: "Create account",
    welcome: "Welcome",
    guest: "Guest"
  },
  de: {
    profile: "Profil",
    editProfile: "Profil bearbeiten",
    logout: "Abmelden",
    createAccount: "Konto erstellen",
    welcome: "Willkommen",
    guest: "Gast"
  },
  hu: {
    profile: "Profil",
    editProfile: "Profil szerkesztése",
    logout: "Kilépés",
    createAccount: "Fiók létrehozása",
    welcome: "Üdvözöljük",
    guest: "Vendég"
  }
};

const ProfileButton = ({ 
  user, 
  project,
  language = 'hu', 
  onLogout, 
  onLanguageChange,
  onUpdateUser,
  showSuccessMessage,
  showErrorMessage,
  isAuthenticated = true
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const t = translations[language] || translations.hu;
  
  // Toggle the dropdown menu
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };
  
  // Close the dropdown menu
  const closeDropdown = () => {
    setShowDropdown(false);
  };
  
  // Open profile edit modal
  const openProfileModal = () => {
    setShowProfileModal(true);
    closeDropdown();
  };
  
  // Close profile edit modal
  const closeProfileModal = () => {
    setShowProfileModal(false);
  };
  
  // Handle profile update - most már a projektet is frissítjük
  const handleUpdateProfile = async (updatedUser) => {
    debugLog('ProfileButton', 'Updating profile data', { userId: updatedUser?.id });

    try {
      // Helyi user adatok frissítése
      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }
      
      // Ha van projekt, akkor frissítsük a kliens adatokat
      if (project && project._id) {
        debugLog('ProfileButton', 'Updating project client data', { projectId: project._id });
        
        // Itt nem kell API hívást tenni, mert azt a ProfileEditModal már megtette
        // Ez csak egy jelzés, hogy a frissítés sikerült
      }
    } catch (error) {
      debugLog('ProfileButton', 'Error updating profile', error);
      if (showErrorMessage) {
        showErrorMessage('Error updating profile data');
      }
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    closeDropdown();
    if (onLogout) {
      onLogout();
    }
  };
  
  return (
    <div className="relative">
      {/* Profile button with dropdown */}
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 py-2 px-3 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm"
      >
        {user?.avatar ? (
          <img 
            src={user.avatar} 
            alt={user?.name || t.guest} 
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center">
            <User className="h-4 w-4 text-indigo-600" />
          </div>
        )}
        <span className="hidden sm:inline-block text-gray-700 font-medium">
          {user?.name || t.guest}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>
      
      {/* Dropdown menu */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 py-1 border border-gray-200">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-500">{t.welcome}</p>
            <p className="font-medium text-gray-800 truncate">
              {user?.name || t.guest}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
          </div>
          
          <div className="py-1">
            {isAuthenticated ? (
              <>
                <button
                  onClick={openProfileModal}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <Settings className="h-4 w-4 mr-2 text-gray-500" />
                  {t.editProfile}
                </button>
                
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-2 text-gray-500" />
                  {t.logout}
                </button>
              </>
            ) : (
              <button
                onClick={openProfileModal}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <UserPlus className="h-4 w-4 mr-2 text-gray-500" />
                {t.createAccount}
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Profile edit modal */}
      {showProfileModal && (
        <ProfileEditModal
          user={user}
          project={project}
          onClose={closeProfileModal}
          onSave={handleUpdateProfile}
          showSuccessMessage={showSuccessMessage}
          showErrorMessage={showErrorMessage}
          language={language}
          onLanguageChange={onLanguageChange}
        />
      )}
    </div>
  );
};

export default ProfileButton;