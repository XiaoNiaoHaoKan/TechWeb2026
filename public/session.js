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
  const isLoggedIn = Boolean(state.currentUser);

  /*
   * Se un account è già connesso, impedisce di inserire
   * le credenziali di un secondo account.
   */
  elements.username.disabled = isLoggedIn;
  elements.password.disabled = isLoggedIn;
  elements.loginButton.disabled = isLoggedIn;

  if (isLoggedIn) {
    const creditLabel =
      `Crediti disponibili: EUR ${
        state.currentUser.credit?.toFixed(2) ?? '0.00'
      }`;

    elements.username.value = '';
    elements.password.value = '';

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
  /*
   * Impedisce il cambio diretto di account.
   * Prima bisogna effettuare il logout.
   */
  if (state.currentUser) {
    updateLoginStatus(
      'Per cambiare account devi prima effettuare il logout.',
      false,
    );

    return false;
  }

  const username = elements.username.value.trim();
  const password = elements.password.value.trim();

  if (!username || !password) {
    updateLoginStatus(
      'Inserisci nome utente e password.',
      false,
    );

    return false;
  }

  /*
   * Evita che il pulsante venga premuto più volte
   * mentre la richiesta è in corso.
   */
  elements.loginButton.disabled = true;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    if (!response.ok) {
      updateLoginStatus(
        'Login fallito: credenziali errate.',
        false,
      );

      elements.loginButton.disabled = false;
      return false;
    }

    state.currentUser = await response.json();

    saveCredentials(username, password);

    /*
     * Ricarica la pagina: fetchData() ridisegnerà item
     * e visite usando il ruolo del nuovo account.
     */
    window.location.reload();

    return true;
  } catch (error) {
    console.error('Errore durante il login:', error);

    updateLoginStatus(
      'Impossibile effettuare il login.',
      false,
    );

    elements.loginButton.disabled = false;
    return false;
  }
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

  /*
   * Interrompe eventuali modifiche rimaste aperte.
   */
  state.editingItemId = null;
  state.editingVisitId = null;
  state.newVisitSequence = [];

  clearCredentials();

  /*
   * Ricarica la pagina senza credenziali.
   * Item e visite verranno mostrati in modalità ospite.
   */
  window.location.reload();
}
