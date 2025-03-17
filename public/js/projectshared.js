// ... existing code ...

// A profil szerkesztési funkció
async function updateProfile(profileData) {
  try {
    console.log('Sending profile update request with data:', profileData);
    
    const response = await fetch('/projectshared/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Ellenőrizzük, hogy van-e token vagy más hitelesítési adat
        'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
      },
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
    // Itt kezeljük a hibát a felhasználói felületen
    alert(`Hiba történt a profil mentésekor: ${error.message}`);
    throw error;
  }
}

// A PIN ellenőrzési funkció
async function verifyPin(pin, projectId) {
  try {
    console.log('Sending verify PIN request:', { pin, projectId });
    
    const response = await fetch('/projectshared/verify-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pin, projectId })
    });
    
    console.log('Verify PIN response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('PIN verification failed:', errorData);
      throw new Error(errorData.message || 'Hiba történt a PIN ellenőrzésekor');
    }
    
    const data = await response.json();
    console.log('PIN verification successful:', data);
    return data;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    alert(`Hiba történt a PIN ellenőrzésekor: ${error.message}`);
    throw error;
  }
}

// ... existing code ...