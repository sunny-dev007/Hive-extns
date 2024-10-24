import { PublicClientApplication } from '@azure/msal-browser';

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: "92c2f002-ac04-41ec-9c4b-4ad985e65641",
    authority: "https://login.microsoftonline.com/62ffbf34-05c6-4362-94d0-9a7c70c9e268",
    redirectUri: chrome.identity.getRedirectURL(),
  },
};

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Listen for login messages from the side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'login') {
    const loginRequest = {
      scopes: ["user.read"]
    };

    msalInstance.loginPopup(loginRequest)
      .then((response) => {
        console.log('Login successful:', response);
        sendResponse({ success: true, token: response.accessToken });
      })
      .catch((error) => {
        console.error('Login failed:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keeps the message channel open for async response
  }
});
