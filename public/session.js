import { state, elements } from './state.js';

function switchToMarketplaceIfNeeded() {
  if (elements.sections.editor.classList.contains('d-none')) return;

  elements.tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === 'marketplace');
  });

  Object.entries(elements.sections).forEach(([name, section]) => {
    section.classList.toggle('d-none', name !== 'marketplace');
  });
}

export function updateLoginStatus(message, success) {
  elements.loginStatus.textContent = message;
  elements.loginStatus.className = `badge rounded-pill ${success ? 'bg-success' : 'bg-danger'}`;
}

export function renderUserStatus() {
  if (state.currentUser) {
    const creditLabel = `Crediti disponibili: EUR ${state.currentUser.credit?.toFixed(2) ?? '0.00'}`;
    elements.userCredits.textContent = creditLabel;
    elements.userCredits.style.display = 'block';
    elements.logoutButton.classList.remove('d-none');
  } else {
    elements.userCredits.textContent = '';
    elements.userCredits.style.display = 'none';
    elements.logoutButton.classList.add('d-none');
  }
}

export function updateEditorVisibility() {
  const isAuthor = state.currentUser?.role === 'author';
  const editorTab = elements.tabButtons.find((btn) => btn.dataset.tab === 'editor');

  if (editorTab) {
    editorTab.style.display = isAuthor ? 'inline-block' : 'none';
  }

  if (!isAuthor) {
    switchToMarketplaceIfNeeded();
  }

  const controls = elements.sections.editor.querySelectorAll('input, textarea, select, button');
  controls.forEach((control) => {
    control.disabled = !isAuthor;
  });
}

export function saveCredentials(username, password) {
  localStorage.setItem('museo_username', username);
  localStorage.setItem('museo_password', password);
}

export function clearCredentials() {
  localStorage.removeItem('museo_username');
  localStorage.removeItem('museo_password');
}

export async function loginUser() {
  const username = elements.username.value.trim();
  const password = elements.password.value.trim();

  if (!username || !password) {
    updateLoginStatus('Inserisci nome utente e password.', false);
    return false;
  }

  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    updateLoginStatus('Login fallito: credenziali errate.', false);
    return false;
  }

  state.currentUser = await response.json();
  saveCredentials(username, password);
  updateLoginStatus(`Connesso come ${state.currentUser.username} (${state.currentUser.role})`, true);
  renderUserStatus();
  updateEditorVisibility();
  return true;
}

export async function loadAndVerifyCredentials() {
  const username = localStorage.getItem('museo_username');
  const password = localStorage.getItem('museo_password');

  if (!username || !password) return false;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      clearCredentials();
      return false;
    }

    state.currentUser = await response.json();
    elements.username.value = '';
    elements.password.value = '';
    updateLoginStatus(`Connesso come ${state.currentUser.username} (${state.currentUser.role})`, true);
    renderUserStatus();
    updateEditorVisibility();
    return true;
  } catch (error) {
    console.error('Errore durante il caricamento delle credenziali:', error);
    clearCredentials();
    return false;
  }
}

export function logoutUser() {
  state.currentUser = null;
  clearCredentials();
  elements.username.value = '';
  elements.password.value = '';
  updateLoginStatus('Disconnesso', false);
  renderUserStatus();
  updateEditorVisibility();
}
