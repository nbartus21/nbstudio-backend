import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Fingerprint } from 'lucide-react';

const BiometricAuth = forwardRef(({ onAuthSuccess }, ref) => {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [registeredCredential, setRegisteredCredential] = useState(null);

  useImperativeHandle(ref, () => ({
    registerBiometric: async (email) => {
      return await registerBiometric(email);
    }
  }));

  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricAvailable(available);
        } else {
          setBiometricAvailable(false);
        }

        const savedCredential = localStorage.getItem('biometricCredential');
        if (savedCredential) {
          setRegisteredCredential(JSON.parse(savedCredential));
        }
      } catch (error) {
        console.error('Biometric check error:', error);
        setBiometricAvailable(false);
      }
    };

    checkBiometricAvailability();
  }, []);

  const registerBiometric = async (email) => {
    if (!navigator.credentials || !navigator.credentials.create) {
      console.error('Biometrikus hitelesítés nem támogatott ebben a böngészőben vagy környezetben.');
      alert('A böngésződ nem támogatja a biometrikus bejelentkezést.');
      return;
    }
  
    try {
      const publicKeyCredential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32), // Példaérték, a szervernek kell generálnia
          rp: { name: 'Admin Panel' },
          user: {
            id: new Uint8Array(16), // Egyedi user ID
            name: email,
            displayName: email,
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: { userVerification: 'preferred' },
          timeout: 60000,
        },
      });
  
      localStorage.setItem('biometricCredential', JSON.stringify(publicKeyCredential));
      alert('Biometrikus bejelentkezés sikeresen beállítva!');
    } catch (error) {
      console.error('Hiba a biometrikus regisztráció során:', error);
      alert('Hiba történt a biometrikus beállítás közben.');
    }
  };
  

  const authenticateWithBiometric = async () => {
    try {
      if (!registeredCredential) return false;
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const assertionOptions = {
        challenge,
        allowCredentials: [{ type: 'public-key', id: Uint8Array.from(atob(registeredCredential.id), c => c.charCodeAt(0)) }],
        userVerification: 'required',
        timeout: 60000
      };

      await navigator.credentials.get({ publicKey: assertionOptions });
      onAuthSuccess(registeredCredential.email);
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  };

  const clearBiometricData = () => {
    localStorage.removeItem('biometricCredential');
    setRegisteredCredential(null);
  };

  if (!biometricAvailable) return null;

  return (
    <div className="space-y-4">
      {registeredCredential ? (
        <div className="space-y-2">
          <button onClick={authenticateWithBiometric} className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
            <Fingerprint className="w-5 h-5 mr-2" />
            Gyors bejelentkezés
          </button>
          <button onClick={clearBiometricData} className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
            Gyors bejelentkezés kikapcsolása
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-600 text-center">Bejelentkezés után engedélyezheti a gyors bejelentkezést</p>
      )}
    </div>
  );
});

export default BiometricAuth;
