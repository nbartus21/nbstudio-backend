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
    // Ellenőrizzük, hogy támogatott-e a WebAuthn
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setBiometricAvailable(available));
      
      // Ellenőrizzük, van-e mentett credential
      const savedCredential = localStorage.getItem('biometricCredential');
      if (savedCredential) {
        setRegisteredCredential(JSON.parse(savedCredential));
      }
    }
  }, []);

  const registerBiometric = async (email) => {
    try {
      // Random challenge generálása
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // Random user ID generálása
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const publicKeyOptions = {
        challenge,
        rp: {
          name: "NB Studio Admin",
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: email,
          displayName: email
        },
        pubKeyCredParams: [{
          type: "public-key",
          alg: -7 // ES256
        }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      });

      // Credential mentése
      const credentialData = {
        id: credential.id,
        email: email
      };
      
      localStorage.setItem('biometricCredential', JSON.stringify(credentialData));
      setRegisteredCredential(credentialData);
      
      return true;
    } catch (error) {
      console.error('Hiba a biometrikus regisztráció során:', error);
      return false;
    }
  };

  const authenticateWithBiometric = async () => {
    if (!registeredCredential) return false;

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const assertionOptions = {
        challenge,
        allowCredentials: [{
          type: 'public-key',
          id: Uint8Array.from(atob(registeredCredential.id), c => c.charCodeAt(0)),
        }],
        userVerification: 'required',
        timeout: 60000
      };

      await navigator.credentials.get({
        publicKey: assertionOptions
      });

      onAuthSuccess(registeredCredential.email);
      return true;
    } catch (error) {
      console.error('Hiba a biometrikus authentikáció során:', error);
      return false;
    }
  };

  const clearBiometricData = () => {
    localStorage.removeItem('biometricCredential');
    setRegisteredCredential(null);
  };

  return (
    <div className="space-y-4">
      {biometricAvailable ? (
        <>
          {registeredCredential ? (
            <div className="space-y-2">
              <button
                onClick={authenticateWithBiometric}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Fingerprint className="w-5 h-5 mr-2" />
                Bejelentkezés biometrikus azonosítással
              </button>
              <button
                onClick={clearBiometricData}
                className="w-full px-4 py-2 text-sm text-red-600 hover:text-red-800"
              >
                Biometrikus adatok törlése
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center">
              A bejelentkezés után beállítható a biometrikus azonosítás
            </p>
          )}
        </>
      ) : null}
    </div>
  );
});

export default BiometricAuth;