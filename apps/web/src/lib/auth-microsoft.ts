import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from './msal-config';
import apiClient from './api-client';

let msalInstance: PublicClientApplication | null = null;
let initPromise: Promise<void> | null = null;

export const getMsalInstance = async (): Promise<PublicClientApplication> => {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
    initPromise = msalInstance.initialize();
  }
  
  if (initPromise) {
    await initPromise;
    initPromise = null;
  }
  
  return msalInstance;
};

export const loginWithMicrosoft = async () => {
  const msal = await getMsalInstance();
  
  try {
    const response = await msal.loginPopup(loginRequest);
    
    if (response && response.idToken) {
      const backendResponse = await apiClient.post('/auth/microsoft/callback', {
        idToken: response.idToken,
        accessToken: response.accessToken,
      });

      return backendResponse.data;
    }
    
    throw new Error('No se recibió token de Microsoft');
  } catch (error: any) {
    console.error('Error en login con Microsoft:', error);
    throw error;
  }
};

export const logoutMicrosoft = async () => {
  const msal = await getMsalInstance();
  const accounts = msal.getAllAccounts();
  
  if (accounts.length > 0) {
    await msal.logoutPopup({
      account: accounts[0],
    });
  }
};
