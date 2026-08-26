import { initApp } from './features.js';

window.addEventListener('DOMContentLoaded', () => {
  initApp().catch((error) => {
    console.error('Errore di inizializzazione:', error);
  });
});
