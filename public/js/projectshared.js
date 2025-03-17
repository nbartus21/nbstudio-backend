// ... existing code ...

// A profil szerkesztési funkció
async function updateProfile(profileData) {
  try {
    console.log('Sending profile update request with data:', profileData);
    
    // Try to get token from multiple possible sources
    const token = localStorage.getItem('token') || 
                  sessionStorage.getItem('token') || 
                  getCookieValue('token');
    
    const response = await fetch('/projectshared/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      credentials: 'include',
      body: JSON.stringify(profileData)
    });
    
    console.log('Profile update response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Profile update failed:', errorData);
      throw new Error(errorData.message || 'Hiba történt a profil frissítésekor');
    }
    
    const data = await response.json();
    console.log('Profile update successful:', data);
    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    alert(`Hiba történt a profil mentésekor: ${error.message}`);
    throw error;
  }
}

// A PIN ellenőrzési funkció
async function verifyPin(pin, projectId) {
  try {
    // Try to get token from multiple possible sources
    const token = localStorage.getItem('token') || 
                  sessionStorage.getItem('token') || 
                  getCookieValue('token');
    
    console.log('Available authentication:', {
      token: token,
      cookies: document.cookie
    });
    
    console.log('Sending verify PIN request:', { pin, projectId });
    
    const response = await fetch('/projectshared/verify-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      credentials: 'include',
      body: JSON.stringify({ pin, projectId })
    });
    
    console.log('Verify PIN response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(e => ({ message: 'Could not parse error response' }));
      console.error('PIN verification failed:', errorData);
      throw new Error(errorData.message || 'Hiba történt a PIN ellenőrzésekor');
    }
    
    const data = await response.json();
    console.log('PIN verification successful:', data);
    
    // If verification was successful, store any returned token
    if (data.token) {
      localStorage.setItem('token', data.token);
      console.log('New token stored from PIN verification');
    }
    
    return data;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    alert(`Hiba történt a PIN ellenőrzésekor: ${error.message}`);
    throw error;
  }
}

// Helper function to get cookie value by name
function getCookieValue(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}