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

//funzioni per collegare codice identificatore a wikidata
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderObjectIdentifier(value) {
  const identifier = String(value || "").trim();

  if (!identifier) {
    return "Non indicato";
  }

  const wikidataMatch = identifier.match(/^Q\d+$/i);

  if (wikidataMatch) {
    const wikidataId = wikidataMatch[0].toUpperCase();

    return `<a href="https://www.wikidata.org/wiki/${wikidataId}"
      target="_blank"
      rel="noopener noreferrer">
      ${wikidataId}
    </a>`;
  }

  if (/^https?:\/\//i.test(identifier)) {
    return `<a href="${escapeHtml(identifier)}"
      target="_blank"
      rel="noopener noreferrer">
      Apri identificatore esterno
    </a>`;
  }

  return escapeHtml(identifier);
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

      const canEdit =state.currentUser?.role === "author" && item.createdBy === state.currentUser.username;

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

              ${canEdit
                ? `<button
                    class="btn btn-sm btn-primary w-100 mt-2"
                    data-edit-item="${item.id}">
                    Modifica item
                  </button>`
                : ""}

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

  Array.from(
    elements.itemList.querySelectorAll("button[data-edit-item]"),
  ).forEach((button) => {
    button.addEventListener("click", () => {
      startItemEdit(button.dataset.editItem);
    });
  });

}

//Mostra i dettagli di un oggetto selezionato, inclusi titolo, autore, descrizione, prezzo e pulsanti per l'acquisto o l'eliminazione.
function showItemDetail(itemId) {
  const item = state.items.find(
    (entry) => entry.id === itemId,
  );

  if (!item) return;

  const narrativeList = (item.narratives || [])
    .map(
      (narrative) => `
        <div class="mb-3">
          <h6>
            ${capitalize(narrative.level)} · ${narrative.duration}
          </h6>
          <p>${narrative.text}</p>
        </div>
      `,
    )
    .join("");

  const priceLabel =
    item.price === 0 ? "Gratis" : `EUR ${item.price}`;

  const isVisitor =
    state.currentUser?.role === "visitor";

  const alreadyBought =
    !!state.currentUser?.purchases?.some(
      (purchase) => purchase.itemId === item.id,
    );

  const hasCredit =
    state.currentUser &&
    state.currentUser.credit >= item.price;

  const canBuy =
    isVisitor &&
    !alreadyBought &&
    hasCredit;

  const isAdmin =
    state.currentUser?.role === "admin";

  const isAuthorOwner =
    state.currentUser?.role === "author" &&
    item.createdBy === state.currentUser.username;

  const canDelete =
    isAdmin || isAuthorOwner;

  let buyButton = "";

  if (isVisitor) {
    buyButton = `
      <button
        id="buyItemButton"
        class="btn btn-primary w-100"
        ${!canBuy ? "disabled" : ""}
      >
        ${
          alreadyBought
            ? "Già acquistato"
            : `Compra contenuto (${priceLabel})`
        }
      </button>
    `;
  } else if (!state.currentUser) {
    buyButton = `
      <button
        class="btn btn-warning w-100"
        disabled
      >
        Accedi come visitatore per acquistare
      </button>
    `;
  }

  const deleteButton = canDelete
    ? `
      <button
        id="deleteItemButton"
        class="btn btn-outline-danger w-100 mt-2"
      >
        Elimina contenuto
      </button>
    `
    : "";

  const purchaseNote = alreadyBought
    ? `
      <p class="text-muted small mt-2">
        Hai già acquistato questo contenuto.
      </p>
    `
    : "";

  elements.visitDetail.innerHTML = `
    <div class="card-body">
      <div
        class="d-flex justify-content-between align-items-start mb-3"
      >
        <div>
          <h4>${item.title}</h4>

          <p class="text-muted mb-2">
            ${item.author} · ${item.room}
          </p>
        </div>

        <span class="badge bg-info text-dark">
          ${priceLabel}
        </span>
      </div>

      <p>${item.description}</p>

      <p class="mb-3">
        <strong>Parole chiave:</strong>
        ${(item.tags || []).join(", ") || "Nessuna"}
      </p>

      <div class="item-metadata mb-4">
        <h6 class="mb-3">Dati dell'opera</h6>

        <dl class="row mb-0">
          <dt class="col-sm-4">Opera associata</dt>
          <dd class="col-sm-8">
            ${item.objectName || "Non indicata"}
          </dd>

          <dt class="col-sm-4">Identificatore</dt>
          <dd class="col-sm-8">
            ${renderObjectIdentifier(item.objectId)}
          </dd>

          <dt class="col-sm-4">Datazione</dt>
          <dd class="col-sm-8">
            ${item.creationDate || "Non indicata"}
          </dd>

          <dt class="col-sm-4">Stile</dt>
          <dd class="col-sm-8">
            ${item.style || "Non indicato"}
          </dd>

          <dt class="col-sm-4">Tecnica</dt>
          <dd class="col-sm-8">
            ${item.technique || "Non indicata"}
          </dd>

          <dt class="col-sm-4">Materiali</dt>
          <dd class="col-sm-8">
            ${item.materials || "Non indicati"}
          </dd>

          <dt class="col-sm-4">Provenienza</dt>
          <dd class="col-sm-8">
            ${item.provenance || "Non indicata"}
          </dd>
        </dl>
      </div>

      <div>${narrativeList}</div>

      <p class="small text-secondary mt-3">
        Licenza: ${item.license}
      </p>

      <p class="small text-secondary">
        Caricato da: ${item.createdBy || "sconosciuto"}
      </p>

      ${buyButton}
      ${deleteButton}
      ${purchaseNote}
    </div>
  `;

  if (canBuy) {
    document
      .getElementById("buyItemButton")
      ?.addEventListener("click", () => {
        purchaseItem(item.id);
      });
  }

  if (canDelete) {
    document
      .getElementById("deleteItemButton")
      ?.addEventListener("click", () => {
        deleteItem(item.id);
      });
  }

  switchTab("visits");
}

function renderVisits() {
  const visits = state.visits.filter(
    (visit) => visit.museumId === state.currentMuseum,
  );

  const visitsSection = document.getElementById("visits");

  if (visits.length === 0) {
    elements.visitList.innerHTML = `
      <div class="alert alert-info mb-0">
        Nessuna visita disponibile per questo museo.
      </div>
    `;

    elements.visitDetail.innerHTML = `
      <div class="card-body">
        <h4>Nessuna visita disponibile</h4>
        <p class="text-muted">
          Non sono ancora presenti visite per questo museo.
        </p>
      </div>
    `;

    return;
  }

  visitsSection.classList.remove("d-none");

  elements.visitList.innerHTML = visits
    .map((visit) => {
      const priceLabel =
        visit.price === 0
          ? "Gratis"
          : `EUR ${visit.price}`;

      return `
        <button
          type="button"
          class="list-group-item list-group-item-action
                 d-flex justify-content-between align-items-center"
          data-visit="${visit.id}"
        >
          <span>${visit.name}</span>

          <span class="badge bg-primary rounded-pill">
            ${priceLabel}
          </span>
        </button>
      `;
    })
    .join("");

  Array.from(
    elements.visitList.querySelectorAll(
      "button[data-visit]",
    ),
  ).forEach((button) => {
    button.addEventListener("click", () => {
      showVisitDetail(button.dataset.visit);
    });
  });
}

function showVisitDetail(visitId) {
  const visit = state.visits.find(
    (entry) => entry.id === visitId,
  );

  if (!visit) return;

  const sequenceHtml = (visit.sequence || [])
    .map((step, index) => {
      const item = state.items.find(
        (entry) => entry.id === step.itemId,
      );

      return `
        <li class="mb-3">
          <strong>
            ${index + 1}.
            ${item?.title || "Oggetto mancante"}
          </strong>

          <br>

          ${step.note || ""}
        </li>
      `;
    })
    .join("");

  const logisticsHtml = (visit.logistics || [])
    .map((note) => `<li>${note}</li>`)
    .join("");

  const priceLabel =
    visit.price === 0
      ? "Gratis"
      : `EUR ${visit.price}`;

  const alreadyBought =
    !!state.currentUser?.purchases?.some(
      (purchase) => purchase.visitId === visit.id,
    );

  const canBuy =
    state.currentUser?.role === "visitor" &&
    !alreadyBought &&
    state.currentUser.credit >= visit.price;

  const canEdit =
    state.currentUser?.role === "author" &&
    visit.createdBy === state.currentUser.username;

  const canDelete =
  state.currentUser?.role === "admin" ||
  (
    state.currentUser?.role === "author" &&
    visit.createdBy === state.currentUser.username
  );

  const buyButton =
    state.currentUser?.role === "visitor"
      ? `
        <button
          id="buyVisitButton"
          class="btn btn-primary w-100"
          ${!canBuy ? "disabled" : ""}
        >
          ${
            alreadyBought
              ? "Già acquistata"
              : `Compra visita (${priceLabel})`
          }
        </button>
      `
      : "";

  const editButton = canEdit
    ? `
      <button
        id="editVisitButton"
        class="btn btn-primary w-100 mt-2"
      >
        Modifica visita
      </button>
    `
    : "";

  const deleteButton = canDelete
    ? `
      <button
        id="deleteVisitButton"
        class="btn btn-outline-danger w-100 mt-2"
      >
        Elimina visita
      </button>
    `
    : "";

  elements.visitDetail.innerHTML = `
    <div class="card-body">
      <div
        class="d-flex justify-content-between align-items-center mb-3"
      >
        <div>
          <h4 class="mb-1">${visit.name}</h4>

          <p class="text-muted mb-0">
            ${visit.description}
          </p>
        </div>

        <span class="badge bg-info text-dark">
          ${priceLabel}
        </span>
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
      ${deleteButton}
      ${editButton}
    </div>
  `;

  if (canBuy) {
    document
      .getElementById("buyVisitButton")
      ?.addEventListener("click", () => {
        purchaseVisit(visit.id);
      });
  }

  if (canEdit) {
    document
      .getElementById("editVisitButton")
      ?.addEventListener("click", () => {
        startVisitEdit(visit.id);
      });
  }

  if (canDelete) {
    document
      .getElementById("deleteVisitButton")
      ?.addEventListener("click", () => {
        deleteVisitEntry(visit.id);
      });
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

function startItemEdit(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);

  if (!item) return;

  const authorized =
    state.currentUser?.role === "author" &&
    item.createdBy === state.currentUser.username;

  if (!authorized) return;

  state.editingItemId = item.id;

  elements.newTitle.value = item.title || "";
  elements.newAuthor.value = item.author || "";
  elements.newObjectId.value = item.objectId || "";
  elements.newCreationDate.value = item.creationDate || "";
  elements.newStyle.value = item.style || "";
  elements.newTechnique.value = item.technique || "";
  elements.newMaterials.value = item.materials || "";
  elements.newProvenance.value = item.provenance || "";
  elements.newTags.value = (item.tags || []).join(", ");
  elements.newDuration.value = item.duration || "15s";
  elements.newLanguage.value = item.language || "medio";
  elements.newPrice.value = item.price || 0;
  elements.newLicense.value = item.license || "CC BY-NC";
  elements.newImage.value = item.image || "";
  elements.newText.value = item.narratives?.[0]?.text || "";
  elements.newObject.value = item.objectName || "";

  elements.contentEditorTitle.textContent = "Modifica item";
  elements.createContent.textContent = "Salva modifiche";
  elements.cancelContentEdit.classList.remove("d-none");

  switchTab("editor");
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
    
    
      objectName: elements.newObject.value.trim() || "Oggetto museale non specificato",
      objectId: elements.newObjectId.value.trim(),
      creationDate: elements.newCreationDate.value.trim(),
      style: elements.newStyle.value.trim(),
      technique: elements.newTechnique.value.trim(),
      materials: elements.newMaterials.value.trim(),
      provenance: elements.newProvenance.value.trim(),
      description: `Contenuto creato per ${elements.newObject.value.trim() || "un oggetto museale"}`,
      room: "Sala editor",
      tags: elements.newTags.value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),

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

  const isEditing = Boolean(state.editingItemId);

  const response = await fetch(
    isEditing
      ? `/api/items/${state.editingItemId}`
      : "/api/items",
    {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Errore durante il salvataggio del contenuto." }));
    elements.editorMessage.textContent =
      error.error || "Errore durante il salvataggio del contenuto.";
    return;
  }
  const savedItem = await response.json();

  if (isEditing) {
    state.items = state.items.map((entry) =>
      entry.id === savedItem.id ? savedItem : entry,
    );
  } else {
    state.items.push(savedItem);
  }

  renderItems();
  renderVisitItemOptions();

  if (isEditing) {
    state.editingItemId = null;
    elements.contentEditorTitle.textContent = "Crea nuovo contenuto";
    elements.createContent.textContent = "Salva contenuto";
    elements.cancelContentEdit.classList.add("d-none");
  }

  elements.editorMessage.textContent = "Contenuto salvato con successo.";
  setTimeout(() => {
    elements.editorMessage.textContent = "";
  }, 8000);
}

function startVisitEdit(visitId) {
  const visit = state.visits.find(
    (entry) => entry.id === visitId,
  );

  if (!visit) return;

  const authorized =
    state.currentUser?.role === "author" &&
    visit.createdBy === state.currentUser.username;

  if (!authorized) return;

  state.editingVisitId = visit.id;

  elements.newVisitName.value = visit.name || "";
  elements.newVisitDescription.value = visit.description || "";
  elements.newVisitLogistics.value =
    (visit.logistics || []).join("\n");

  state.newVisitSequence = (visit.sequence || []).map((step) => ({
    ...step,
  }));

  renderVisitSequence();

  elements.visitEditorTitle.textContent = "Modifica visita";
  elements.createVisit.textContent = "Salva modifiche";
  elements.cancelVisitEdit.classList.remove("d-none");

  switchTab("editor");
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

  const isEditing = Boolean(state.editingVisitId);

  const requestBody = isEditing
    ? {
        ...visit,
        actorUsername: state.currentUser.username,
      }
    : visit;

  const response = await fetch(
    isEditing
      ? `/api/visits/${state.editingVisitId}`
      : "/api/visits",
    {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    elements.visitMessage.textContent =
      "Errore durante la creazione della visita.";
    return;
  }

  const savedVisit = await response.json();

  if (isEditing) {
    state.visits = state.visits.map((entry) =>
      entry.id === savedVisit.id ? savedVisit : entry,
    );
  } else {
    state.visits.push(savedVisit);
  }
  renderVisits();
  elements.visitMessage.textContent = isEditing
  ? "Visita modificata con successo."
  : "Visita creata con successo.";
  state.editingVisitId = null;
  elements.visitEditorTitle.textContent = "Crea nuova visita";
  elements.createVisit.textContent = "Crea visita";
  elements.cancelVisitEdit.classList.add("d-none");

  elements.newVisitName.value = "";
  elements.newVisitDescription.value = "";
  elements.newVisitLogistics.value = "";
  state.newVisitSequence = [];
  renderVisitSequence();
  setTimeout(() => {
    elements.visitMessage.textContent = "";
  }, 8000);
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
  }, 8000);
}

async function deleteVisitEntry(visitId) {
  if (!state.currentUser) {
    updateLoginStatus(
      "Devi effettuare il login per eliminare una visita.",
      false,
    );

    return;
  }

  const confirmed = window.confirm(
    "Vuoi davvero eliminare questa visita? L'operazione non può essere annullata.",
  );

  if (!confirmed) return;

  const response = await fetch(
    `/api/visits/${visitId}/delete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: state.currentUser.username,
      }),
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({
        error: "Eliminazione della visita fallita.",
      }));

    elements.visitDetail.innerHTML = `
      <div class="card-body">
        <div class="alert alert-danger mb-0">
          ${error.error || "Eliminazione della visita fallita."}
        </div>
      </div>
    `;

    return;
  }

  state.visits = state.visits.filter(
    (visit) => visit.id !== visitId,
  );

  if (state.editingVisitId === visitId) {
    cancelVisitEdit();
  }

  renderVisits();

  elements.visitDetail.innerHTML = `
    <div class="card-body">
      <div class="alert alert-success mb-0">
        Visita eliminata con successo.
      </div>
    </div>
  `;
}

async function deleteItem(itemId) {
  if (!state.currentUser) {
    updateLoginStatus(
      "Devi effettuare il login per eliminare un contenuto.",
      false,
    );
    return;
  }

  let response = await fetch(`/api/items/${itemId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: state.currentUser.username }),
  });

  // Fallback per client/proxy che bloccano il metodo DELETE.
  if (!response.ok && (response.status === 404 || response.status === 405)) {
    response = await fetch(`/api/items/${itemId}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: state.currentUser.username }),
    });
  }

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

function cancelItemEdit() {
  state.editingItemId = null;

  elements.contentEditorTitle.textContent = "Crea nuovo contenuto";
  elements.createContent.textContent = "Salva contenuto";
  
  elements.cancelContentEdit.classList.add("d-none");
  elements.editorMessage.textContent = "";
}

function cancelVisitEdit() {
  state.editingVisitId = null;

  elements.visitEditorTitle.textContent = "Crea nuova visita";
  elements.createVisit.textContent = "Crea visita";
  elements.cancelVisitEdit.classList.add("d-none");
  elements.visitMessage.textContent = "";

  elements.newVisitName.value = "";
  elements.newVisitDescription.value = "";
  elements.newVisitLogistics.value = "";

  state.newVisitSequence = [];
  renderVisitSequence();
}

function setupEvents() {
  elements.cancelContentEdit.addEventListener("click", cancelItemEdit);
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

  elements.cancelVisitEdit.addEventListener(
  "click",
  cancelVisitEdit,
);
}

export async function initApp() {
  setupEvents();
  await loadAndVerifyCredentials();
  await fetchData();
  updateEditorVisibility();
}
