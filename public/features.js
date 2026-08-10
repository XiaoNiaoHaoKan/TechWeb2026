import { state, elements } from "./state.js";
import {
  loginUser,
  logoutUser,
  loadAndVerifyCredentials,
  updateEditorVisibility,
  updateLoginStatus,
  renderUserStatus,
} from "./session.js";

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

//Permette di caricare in parallelo i dati dei musei, degli oggetti e delle visite dal server e aggiorna lo stato dell'applicazione. Dopo aver caricato i dati, chiama le funzioni di rendering per aggiornare l'interfaccia utente.
async function fetchData() {
  const [museumsRes, itemsRes, visitsRes] = await Promise.all([
    fetch("/api/museums"),
    fetch("/api/items"),
    fetch("/api/visits"),
  ]);

  state.museums = await museumsRes.json();
  state.items = await itemsRes.json();
  state.visits = await visitsRes.json();

  renderMuseumOptions();
  renderFilters();
  renderItems();
  renderVisits();
  renderVisitItemOptions();
}

//Renderizza le opzioni dei musei nel menu a tendina e imposta il museo corrente se non è già selezionato. Se non ci sono musei disponibili, lo stato corrente del museo rimane indefinito.
function renderMuseumOptions() {
  elements.museumSelect.innerHTML = state.museums
    .map((museum) => `<option value="${museum.id}">${museum.name}</option>`)
    .join("");

  if (!state.currentMuseum || !state.museums.some((museum) => museum.id === state.currentMuseum)) {
    state.currentMuseum = state.museums[0]?.id;
  }

  elements.museumSelect.value = state.currentMuseum;
}
/**
 * @summary Gestione dei filtri di ricerca e rendering dei contenuti filtrati.
 * @description Questa sezione contiene funzioni per gestire i filtri di ricerca, ottenere gli oggetti filtrati in base ai criteri selezionati, cambiare le schede dell'interfaccia utente e visualizzare i dettagli degli oggetti e delle visite.
 * Le funzioni principali includono:
 * - renderFilters: Reset dei filtri di ricerca ai valori predefiniti.
 * - getFilteredItems: Restituisce gli oggetti filtrati in base ai criteri selezionati.
 */
//Renderizza i filtri di ricerca e resetta i valori dei filtri a quelli predefiniti.
function renderFilters() {
  elements.searchInput.value = "";
  elements.languageFilter.value = "all";
  elements.priceFilter.value = "all";
  elements.licenseFilter.value = "all";
}

function getFilteredItems() {
  const search = elements.searchInput.value.trim().toLowerCase();
  const language = elements.languageFilter.value;
  const price = elements.priceFilter.value;
  const license = elements.licenseFilter.value;

  return state.items.filter((item) => {
    if (item.museumId !== state.currentMuseum) return false;
    if (language !== "all" && item.language !== language) return false;
    if (price === "free" && item.price > 0) return false;
    if (price === "paid" && item.price === 0) return false;
    if (license !== "all" && item.license !== license) return false;

    const text = [item.title, item.author, item.room, item.tags.join(" ")]
      .join(" ")
      .toLowerCase();
    return !search || text.includes(search);
  });
}

//Cambia la scheda attiva nell'interfaccia utente e mostra/nasconde le sezioni corrispondenti in base alla scheda selezionata.
function switchTab(tabName) {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  Object.entries(elements.sections).forEach(([name, section]) => {
    section.classList.toggle("d-none", name !== tabName);
  });
}

/**
 * @summary Gestione della visualizzazione dei dettagli degli oggetti e visite, inclusi i pulsanti per l'acquisto e l'eliminazione dei contenuti.
 * @description Queste funzioni gestiscono la visualizzazione dei dettagli degli oggetti e delle visite, inclusi i pulsanti per l'acquisto e l'eliminazione dei contenuti. Le funzioni principali includono:
 * - renderItems: Renderizza la lista degli oggetti filtrati e aggiunge gli event listener per i pulsanti di visualizzazione dei dettagli.
 * - showItemDetail: Mostra i dettagli di un oggetto selezionato, inclusi titolo, autore, descrizione, prezzo e pulsanti per l'acquisto o l'eliminazione.
 * - renderVisits: Renderizza la lista delle visite disponibili e aggiunge gli event listener per i pulsanti di visualizzazione dei dettagli.
 * - showVisitDetail: Mostra i dettagli di una visita selezionata, inclusi nome, descrizione, informazioni logistiche, sequenza di visite e pulsante per l'acquisto.
 * - renderVisitItemOptions: Aggiorna le opzioni del menu a tendina per selezionare gli oggetti da aggiungere alla sequenza di una visita.
 * - addSequenceItem: Aggiunge un oggetto selezionato alla sequenza della visita in creazione
 * - renderVisitSequence: Renderizza la sequenza degli oggetti della visita in creazione e aggiunge gli event listener per i pulsanti di rimozione.
 * - createContent: Crea un nuovo contenuto (oggetto) e lo invia al server, aggiornando lo stato e l'interfaccia utente.
 * - createVisit: Crea una nuova visita e la invia al server, aggiornando lo stato e l'interfaccia utente.
 * - purchaseVisit: Gestisce l'acquisto di una visita da parte dell'utente corrente, aggiornando lo stato e l'interfaccia utente.
 * - purchaseItem: Gestisce l'acquisto di un oggetto da parte dell'utente corrente, aggiornando lo stato e l'interfaccia utente.
 * - deleteItem: Gestisce l'eliminazione di un oggetto da parte dell'autore o dell'amministratore, aggiornando lo stato e l'interfaccia
 */
function renderItems() {
  const filtered = getFilteredItems();
  if (!filtered.length) {
    elements.itemList.innerHTML =
      '<div class="col-12"><div class="alert alert-info">Nessun contenuto corrisponde ai filtri selezionati.</div></div>';
    return;
  }

  elements.itemList.innerHTML = filtered
    .map((item) => {
      const priceLabel = item.price === 0 ? "Gratuito" : `EUR ${item.price}`;
      return `
      <div class="col-md-6">
        <div class="card item-card shadow-sm">
          <img src="${item.image}" alt="${item.title}" class="item-image card-img-top" onerror="this.src='https://shorturl.at/AsyeD'" />
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${item.title}</h5>
            <p class="text-muted mb-1">${item.author} · ${item.room}</p>
            <p class="small mb-1">Linguaggio: <strong>${item.language}</strong> · Durata: ${item.duration}</p>
            <p class="small mb-2">Licenza: ${item.license} · Prezzo: ${priceLabel}</p>
            <div class="mt-auto">
              <button class="btn btn-sm btn-outline-primary w-100" data-item="${item.id}">Visualizza dettagli</button>
            </div>
          </div>
        </div>
      </div>`;
    })
    .join("");
  
  // Aggiunge gli event listener ai pulsanti "Visualizza dettagli" per ogni oggetto filtrato.
  Array.from(elements.itemList.querySelectorAll("button[data-item]")).forEach(
    (button) => {
      button.addEventListener("click", () =>
        showItemDetail(button.dataset.item),
      );
    },
  );
}

//Mostra i dettagli di un oggetto selezionato, inclusi titolo, autore, descrizione, prezzo e pulsanti per l'acquisto o l'eliminazione.
function showItemDetail(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;

  const narrativeList = item.narratives
    .map(
      (narrative) => `
      <div class="mb-3">
        <h6>${capitalize(narrative.level)} · ${narrative.duration}</h6>
        <p>${narrative.text}</p>
      </div>`,
    )
    .join("");

  const priceLabel = item.price === 0 ? "Gratis" : `EUR ${item.price}`;
  const isVisitor = state.currentUser?.role === "visitor";
  const alreadyBought = !!state.currentUser?.purchases?.some(
    (purchase) => purchase.itemId === item.id,
  );
  const hasCredit = state.currentUser && state.currentUser.credit >= item.price;
  const canBuy = isVisitor && !alreadyBought && hasCredit;

  const isAdmin = state.currentUser?.role === "admin";
  const isAuthorOwner =
    state.currentUser?.role === "author" &&
    item.createdBy === state.currentUser.username;
  const canDelete = isAdmin || isAuthorOwner;

  let buyButton = "";
  if (isVisitor) {
    buyButton = `<button id="buyItemButton" class="btn btn-primary w-100" ${!canBuy ? "disabled" : ""}>${alreadyBought ? "Già acquistato" : `Compra contenuto (${priceLabel})`}</button>`;
  } else if (!state.currentUser) {
    buyButton =
      '<button class="btn btn-warning w-100" disabled>Accedi come visitatore per acquistare</button>';
  }

  const deleteButton = canDelete
    ? '<button id="deleteItemButton" class="btn btn-outline-danger w-100 mt-2">Elimina contenuto</button>'
    : "";

  const purchaseNote = alreadyBought
    ? '<p class="text-muted small mt-2">Hai già acquistato questo contenuto.</p>'
    : "";

  elements.visitDetail.innerHTML = `
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h4>${item.title}</h4>
          <p class="text-muted mb-2">${item.author} · ${item.room}</p>
        </div>
        <span class="badge bg-info text-dark">${priceLabel}</span>
      </div>
      <p>${item.description}</p>
      <p class="mb-3"><strong>Categoria:</strong> ${item.tags.join(", ")}</p>
      <div>${narrativeList}</div>
      <p class="small text-secondary mt-3">Licenza: ${item.license}</p>
      <p class="small text-secondary">Caricato da: ${item.createdBy || "sconosciuto"}</p>
      ${buyButton}
      ${deleteButton}
      ${purchaseNote}
    </div>`;

  if (canBuy) {
    document
      .getElementById("buyItemButton")
      ?.addEventListener("click", () => purchaseItem(item.id));
  }

  if (canDelete) {
    document
      .getElementById("deleteItemButton")
      ?.addEventListener("click", () => deleteItem(item.id));
  }

  switchTab("visits");
}

function renderVisits() {
  const visits = state.visits.filter(
    (visit) => visit.museumId === state.currentMuseum,
  );
  const visitsSection = document.getElementById("visits");

  if (visits.length === 0) {
    visitsSection.classList.add("d-none");
    return;
  }

  visitsSection.classList.remove("d-none");

  elements.visitList.innerHTML = visits
    .map((visit) => {
      const priceLabel = visit.price === 0 ? "Gratis" : `EUR ${visit.price}`;
      return `<button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-visit="${visit.id}"><span>${visit.name}</span><span class="badge bg-primary rounded-pill">${priceLabel}</span></button>`;
    })
    .join("");

  Array.from(elements.visitList.querySelectorAll("button[data-visit]")).forEach(
    (button) => {
      button.addEventListener("click", () =>
        showVisitDetail(button.dataset.visit),
      );
    },
  );
}

function showVisitDetail(visitId) {
  const visit = state.visits.find((entry) => entry.id === visitId);
  if (!visit) return;

  const sequenceHtml = visit.sequence
    .map((step, index) => {
      const item = state.items.find((i) => i.id === step.itemId);
      return `<li class="mb-3"><strong>${index + 1}. ${item?.title || "Oggetto mancante"}</strong><br>${step.note || ""}</li>`;
    })
    .join("");

  const logisticsHtml = visit.logistics
    .map((note) => `<li>${note}</li>`)
    .join("");
  const priceLabel = visit.price === 0 ? "Gratis" : `EUR ${visit.price}`;
  const alreadyBought = !!state.currentUser?.purchases?.some(
    (purchase) => purchase.visitId === visit.id,
  );
  const canBuy =
    state.currentUser &&
    state.currentUser.role === "visitor" &&
    !alreadyBought &&
    state.currentUser.credit >= visit.price;
  const buyButton =
    state.currentUser?.role === "visitor"
      ? `<button id="buyVisitButton" class="btn btn-primary w-100" ${!canBuy ? "disabled" : ""}>${alreadyBought ? "Già acquistata" : `Compra visita (${priceLabel})`}</button>`
      : "";

  elements.visitDetail.innerHTML = `
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 class="mb-1">${visit.name}</h4>
          <p class="text-muted mb-0">${visit.description}</p>
        </div>
        <span class="badge bg-info text-dark">${priceLabel}</span>
      </div>
      <div class="mb-3">
        <h6>Informazioni logistiche</h6>
        <ul>${logisticsHtml}</ul>
      </div>
      <div>
        <h6>Sequenza di visite</h6>
        <ol>${sequenceHtml}</ol>
      </div>
      ${buyButton}
    </div>`;

  if (canBuy) {
    document
      .getElementById("buyVisitButton")
      ?.addEventListener("click", () => purchaseVisit(visit.id));
  }
}

function renderVisitItemOptions() {
  const options = state.items
    .filter((item) => item.museumId === state.currentMuseum)
    .map(
      (item) =>
        `<option value="${item.id}">${item.title} - ${item.author}</option>`,
    )
    .join("");

  elements.visitItemSelect.innerHTML = options;
}

function addSequenceItem() {
  const itemId = elements.visitItemSelect.value;
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;

  const step = {
    itemId,
    note: `Visita ${item.title} nella sala ${item.room}.`,
  };
  state.newVisitSequence.push(step);
  renderVisitSequence();
}

function renderVisitSequence() {
  elements.visitSequence.innerHTML = state.newVisitSequence
    .map((step, index) => {
      const item = state.items.find((entry) => entry.id === step.itemId);
      return `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span>${index + 1}. ${item?.title || "Oggetto mancante"}</span>
          <button type="button" class="btn btn-sm btn-outline-danger" data-index="${index}">Rimuovi</button>
        </li>`;
    })
    .join("");

  Array.from(
    elements.visitSequence.querySelectorAll("button[data-index]"),
  ).forEach((button) => {
    button.addEventListener("click", () => {
      state.newVisitSequence.splice(Number(button.dataset.index), 1);
      renderVisitSequence();
    });
  });
}

async function createContent() {
  if (state.currentUser?.role !== "author") {
    elements.editorMessage.textContent =
      "Devi essere un autore per creare contenuti.";
    return;
  }

  const item = {
    museumId: state.currentMuseum,
    title: elements.newTitle.value.trim(),
    author: elements.newAuthor.value.trim(),
    duration: elements.newDuration.value.trim() || "15s",
    language: elements.newLanguage.value,
    price: Number(elements.newPrice.value) || 0,
    license: elements.newLicense.value.trim() || "CC BY-NC",
    image:
      elements.newImage.value.trim() ||
      "https://www.reddit.com/media?url=https%3A%2F%2Fpreview.redd.it%2Frandom-question-but-does-anyone-have-versions-of-this-cat-v0-ya8qikz9kn0f1.png%3Fauto%3Dwebp%26s%3Dc2fdba9a3904ab3bec9e7367e380f66343c2929a",
    description: `Contenuto creato per ${elements.newObject.value.trim() || "un oggetto museale"}`,
    room: "Sala editor",
    tags: [elements.newObject.value.trim() || "Contenuto generico"],
    actorUsername: state.currentUser.username,
    narratives: [
      {
        level: elements.newLanguage.value,
        duration: elements.newDuration.value.trim() || "15s",
        text:
          elements.newText.value.trim() ||
          "Testo di esempio creato nell'editor.",
      },
    ],
  };

  const response = await fetch("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Errore durante il salvataggio del contenuto." }));
    elements.editorMessage.textContent =
      error.error || "Errore durante il salvataggio del contenuto.";
    return;
  }
  const created = await response.json();
  state.items.push(created);
  renderItems();
  renderVisitItemOptions();
  elements.editorMessage.textContent = "Contenuto salvato con successo.";
  setTimeout(() => {
    elements.editorMessage.textContent = "";
  }, 3000);
}

async function createVisit() {
  if (state.currentUser?.role !== "author") {
    elements.visitMessage.textContent =
      "Devi essere un autore per creare visite.";
    return;
  }

  if (
    !elements.newVisitName.value.trim() ||
    state.newVisitSequence.length === 0
  ) {
    elements.visitMessage.textContent =
      "Inserisci nome visita e almeno un oggetto nella sequenza.";
    return;
  }

  const visit = {
    museumId: state.currentMuseum,
    name: elements.newVisitName.value.trim(),
    description: elements.newVisitDescription.value.trim(),
    logistics: elements.newVisitLogistics.value
      .trim()
      .split("\n")
      .filter(Boolean),
    sequence: [...state.newVisitSequence],
    createdBy: state.currentUser.username,
  };

  const response = await fetch("/api/visits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(visit),
  });

  if (!response.ok) {
    elements.visitMessage.textContent =
      "Errore durante la creazione della visita.";
    return;
  }

  const created = await response.json();
  state.visits.push(created);
  renderVisits();
  elements.visitMessage.textContent = "Visita creata con successo.";
  elements.newVisitName.value = "";
  elements.newVisitDescription.value = "";
  elements.newVisitLogistics.value = "";
  state.newVisitSequence = [];
  renderVisitSequence();
  setTimeout(() => {
    elements.visitMessage.textContent = "";
  }, 3000);
}

async function purchaseVisit(visitId) {
  if (!state.currentUser) {
    updateLoginStatus("Devi effettuare il login per acquistare.", false);
    return;
  }

  const response = await fetch(`/api/purchase/visit/${visitId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: state.currentUser.username }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Errore durante l'acquisto." }));
    elements.visitMessage.textContent =
      error.error || "Errore durante l'acquisto.";
    elements.visitMessage.className = "mt-3 text-danger";
    return;
  }

  const updatedUser = await response.json();
  state.currentUser = updatedUser;

  state.visits = state.visits.filter((v) => v.id !== visitId);

  renderUserStatus();
  elements.visitMessage.textContent = "Acquisto completato con successo!";
  elements.visitMessage.className = "mt-3 text-success";
  renderVisits();

  const visitsInMuseum = state.visits.filter(
    (v) => v.museumId === state.currentMuseum,
  );
  if (visitsInMuseum.length === 0) {
    elements.visitDetail.innerHTML =
      '<div class="card-body"><h4>Nessuna visita disponibile</h4><p class="text-muted">Tutte le visite disponibili in questo museo sono state vendute.</p></div>';
  } else {
    showVisitDetail(visitsInMuseum[0].id);
  }
}

async function purchaseItem(itemId) {
  if (!state.currentUser) {
    updateLoginStatus("Devi effettuare il login per acquistare.", false);
    return;
  }

  const response = await fetch(`/api/purchase/item/${itemId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: state.currentUser.username }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Errore durante l'acquisto." }));
    elements.visitMessage.textContent =
      error.error || "Errore durante l'acquisto.";
    elements.visitMessage.className = "mt-3 text-danger";
    return;
  }

  const updatedUser = await response.json();
  state.currentUser = updatedUser;
  state.items = state.items.filter((item) => item.id !== itemId);

  renderUserStatus();
  renderItems();
  renderVisitItemOptions();
  elements.visitMessage.textContent = "Acquisto completato con successo!";
  elements.visitMessage.className = "mt-3 text-success";

  elements.visitDetail.innerHTML =
    '<div class="card-body"><h4>Contenuto acquistato</h4><p class="text-muted">Il contenuto e stato rimosso dal marketplace.</p></div>';

  setTimeout(() => {
    elements.visitMessage.textContent = "";
  }, 3000);
}

async function deleteItem(itemId) {
    console.log("Tentativo di eliminazione del contenuto con ID:", itemId);
  if (!state.currentUser) {
    updateLoginStatus(
      "Devi effettuare il login per eliminare un contenuto.",
      false,
    );
    return;
  }
  
  const response = await fetch(`/api/items/${itemId}/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: state.currentUser.username }),
  });

  console.log(response);
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Eliminazione fallita." }));
    elements.visitMessage.textContent = error.error || "Eliminazione fallita.";
    elements.visitMessage.className = "mt-3 text-danger";
    return;
  }

  state.items = state.items.filter((item) => item.id !== itemId);
  state.visits = state.visits.map((visit) => ({
    ...visit,
    sequence: (visit.sequence || []).filter((step) => step.itemId !== itemId),
  }));
  renderItems();
  renderVisits();
  renderVisitItemOptions();
  elements.visitDetail.innerHTML =
    '<div class="card-body"><h4>Contenuto eliminato</h4><p class="text-muted">Il contenuto non e piu disponibile.</p></div>';
  elements.visitMessage.textContent = "Contenuto eliminato con successo.";
  elements.visitMessage.className = "mt-3 text-success";
}

function setupEvents() {
  elements.museumSelect.addEventListener("change", (event) => {
    state.currentMuseum = event.target.value;
    renderItems();
    renderVisits();
    renderVisitItemOptions();
    elements.visitDetail.innerHTML =
      '<div class="card-body"><h4>Seleziona una visita</h4><p class="text-muted">Visualizza sequenze, note logistiche e approfondimenti per ogni percorso.</p></div>';
  });

  elements.searchInput.addEventListener("input", renderItems);
  elements.languageFilter.addEventListener("change", renderItems);
  elements.priceFilter.addEventListener("change", renderItems);
  elements.licenseFilter.addEventListener("change", renderItems);
  elements.clearFilters.addEventListener("click", () => {
    renderFilters();
    renderItems();
  });

  elements.loginButton.addEventListener("click", loginUser);
  elements.logoutButton.addEventListener("click", logoutUser);
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  elements.createContent.addEventListener("click", createContent);
  elements.addVisitItem.addEventListener("click", addSequenceItem);
  elements.createVisit.addEventListener("click", createVisit);
}

export async function initApp() {
  setupEvents();
  await loadAndVerifyCredentials();
  await fetchData();
  updateEditorVisibility();
}
