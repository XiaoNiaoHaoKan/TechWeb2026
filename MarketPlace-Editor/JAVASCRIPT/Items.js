//fa 4 cose: 1.invia form. 2.chiamate API. 3.aggiorna tabella. 4.elimina item.

// ===============================
// SELEZIONE ELEMENTI DOM
// ===============================

//il form html
const itemForm = document.getElementById("itemForm");

//la tabella
const itemsTableBody = document.getElementById("itemsTableBody");
let editingItemId = null;

//lista completa degli item
let allItems = [];

//per filtri
const filterPrice = document.getElementById("filterPrice");
const filterLevel = document.getElementById("filterLevel");
const filterDuration = document.getElementById("filterDuration");
const filterRoom = document.getElementById("filterRoom");

filterRoom.addEventListener("change", applyFilters);
const searchInput = document.getElementById("searchInput");

/*
searchInput.addEventListener("input", function () {

    const search = this.value.toLowerCase();

    //filtra per autore e titolo nella barra di ricerca
    const filtered = allItems.filter(item =>
        (item.title || "").toLowerCase().includes(search) ||
        (item.author || "").toLowerCase().includes(search)
    );

    renderItems(filtered);
});
*/

searchInput.addEventListener("input", applyFilters);
filterPrice.addEventListener("change", applyFilters);
filterLevel.addEventListener("change", applyFilters);
filterDuration.addEventListener("change", applyFilters);
function applyFilters() {

    const search = searchInput.value.toLowerCase();
    const priceFilter = filterPrice.value;
    const levelFilter = filterLevel.value;
    const durationFilter = filterDuration.value;
    const roomFilter = filterRoom.value;

    let filtered = allItems.filter(item => {

        //  SEARCH
        const matchesSearch =
            (item.title || "").toLowerCase().includes(search) ||
            (item.author || "").toLowerCase().includes(search);

        //  PREZZO
        const matchesPrice =
            priceFilter === "all" ||
            (priceFilter === "free" && item.price === 0) ||
            (priceFilter === "paid" && item.price > 0);

        //  LIVELLO
        const matchesLevel =
            levelFilter === "all" ||
            item.languageLevel === levelFilter;

        //  DURATA
        const matchesDuration =
            durationFilter === "all" ||
            item.duration == durationFilter;

        const matchesRoom =
            roomFilter === "all" ||
            (item.room && item.room.toLowerCase() === roomFilter.toLowerCase());
        
        return matchesSearch && matchesPrice && matchesLevel && matchesDuration && matchesRoom;
    });

    renderItems(filtered);
}

function loadRoomFilter() {

    const data = JSON.parse(localStorage.getItem("museum"));
    if (!data || !data.rooms) return;

    filterRoom.innerHTML = `<option value="all">Tutte le sale</option>`;

    data.rooms.forEach(room => {
        const option = document.createElement("option");
        option.value = room.name;          // 🔥 fondamentale
        option.textContent = room.name;

        filterRoom.appendChild(option);
    });
}

async function loadItems() {

    allItems = await apiGet("/items");

    loadRoomFilter(); 

    applyFilters();
}


function renderItems(items) {

    const container = document.getElementById("itemsList");
    container.innerHTML = "";

    items.forEach((item) => {

        const div = document.createElement("div");
        div.classList.add("card");

        div.innerHTML = `
            <h3>${item.title}</h3>

            <p><strong>Museum ID:</strong> ${item.museumId}</p>
            <p><strong>Object ID:</strong> ${item.objectId}</p>

            <p><strong>Autore:</strong> ${item.author}</p>
            <p><strong>Licenza:</strong> ${item.license}</p>

            <p><strong>Durata:</strong> ${item.duration}s</p>
            <p><strong>Livello:</strong> ${item.languageLevel}</p>

            <p><strong>Testo:</strong> ${item.text}</p>

            <p><strong>Prezzo:</strong> ${item.price > 0 ? item.price + "€" : "Gratis"}</p>
            <p><strong>Sala:</strong> ${item.room || "N/A"}</p>

            <button onclick="editItem('${item._id}')">Modifica</button>
            <button onclick="deleteItem('${item._id}')">Elimina</button>


            <p><strong>Wikidata:</strong> 
                ${item.externalId 
                    ? `<a href="https://www.wikidata.org/wiki/${item.externalId}" target="_blank">${item.externalId}</a>` 
                    : "N/A"}
            </p>
        `;

        container.appendChild(div);
    });
}

// ===============================
// FUNZIONE: Crea nuovo item
// ===============================

itemForm.addEventListener("submit", async function (event) {

    event.preventDefault(); // blocca ricaricamento pagina

    // Costruisco l'oggetto item leggendo i campi del form
    const newItem = {
    museumId: document.getElementById("museumId").value,
    objectId: document.getElementById("objectId").value,
    title: document.getElementById("title").value,
    text: document.getElementById("text").value,
    duration: parseInt(document.getElementById("duration").value),
    languageLevel: document.getElementById("languageLevel").value,
    author: document.getElementById("author").value,
    license: document.getElementById("license").value,
    price: parseFloat(document.getElementById("price").value) || 0,
    room: document.getElementById("room").value,

    /*per la compatibilità a wikidata*/
    externalId: document.getElementById("externalId").value
};

    // Invio al backend
    if (editingItemId) {
        await apiPut(`/items/${editingItemId}`, newItem);
        editingItemId = null;

        showToast("Modificato con successo", "edit");
    } else {
        await apiPost("/items", newItem);

        showToast("Salvato con successo", "success");
    }

    // Reset del form
    itemForm.reset();

    // Ricarico la lista aggiornata
    loadItems();
});


// ===============================
// FUNZIONE: Elimina item
// ===============================

async function deleteItem(itemId) {

    // Chiamata DELETE al backend
    await apiDelete(`/items/${itemId}`);

    // Ricarico lista aggiornata
    loadItems();

    showToast("Eliminato con successo", "delete");
}


// ===============================
// CARICAMENTO INIZIALE
// ===============================

// Quando la pagina viene caricata,
// carico subito gli item presenti nel DB
loadItems();

async function editItem(itemId) {

    //prende item dal server
    const item = await apiGet(`/items/${itemId}`);

    // Riempio il form con i dati
    document.getElementById("museumId").value = item.museumId;
    document.getElementById("objectId").value = item.objectId;
    document.getElementById("title").value = item.title;
    document.getElementById("text").value = item.text;
    document.getElementById("duration").value = item.duration;
    document.getElementById("languageLevel").value = item.languageLevel;
    document.getElementById("author").value = item.author;
    document.getElementById("license").value = item.license;
    document.getElementById("price").value = item.price;
    document.getElementById("room").value = item.room;

    /*per la compatibilità a wikidata*/
    document.getElementById("externalId").value = item.externalId || "";

    // Salvo l'id dell'item che sto modificando
    editingItemId = itemId;

    //fa scorrere in alto quando si clicca per modificare l'item
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

