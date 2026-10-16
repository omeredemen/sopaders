import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { requestPersistentStorage } from './shared/pwa/persistentStorage';
// Side effect: starts listening for `beforeinstallprompt`, which can fire before the
// (lazy-loaded) settings page that shows the install button is opened.
import './shared/pwa/useInstallPrompt';
import './index.css';

// Ask the browser to keep our IndexedDB data (no prompt; granted for installed/engaged apps).
void requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
