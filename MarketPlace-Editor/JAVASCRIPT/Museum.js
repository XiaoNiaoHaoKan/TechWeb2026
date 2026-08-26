// ===============================
// STATO
// ===============================
let rooms = [];
let editingRoomIndex = null;
let selectedVisits = [];
// ===============================
// CARICA DATI
// ===============================
function loadMuseum() {

    const data = JSON.parse(localStorage.getItem("museum"));

    if (!data) return;

    document.getElementById("name").value = data.name || "";
    document.getElementById("city").value = data.city || "";
    document.getElementById("description").value = data.description || "";

    rooms = data.rooms || [];

    renderRooms();
    renderMap();
}

// ===============================
// AGGIUNGI SALA (UPGRADE)
// ===============================
async function addRoom() {

    const nameInput = document.getElementById("newRoom");
    const descInput = document.getElementById("newRoomDescription");

    const name = nameInput.value.trim();
    const description = descInput.value.trim();

    if (!name) return;

    if (editingRoomIndex !== null) {

        const oldName = rooms[editingRoomIndex].name;

        // aggiorna sala
        rooms[editingRoomIndex] = { name, description };

        // 🔥 AGGIORNA ITEM
        await updateItemsRoom(oldName, name);

        editingRoomIndex = null;

        showToast("Sala modificata", "edit");

    } else {
        // CREATE
        rooms.push({ name, description });

        showToast("Sala aggiunta", "success");
    }

    nameInput.value = "";
    descInput.value = "";

    renderRooms();
    saveMuseum();
    renderMap();
}

// ===============================
// RENDER SALE
// ===============================
function renderRooms() {

    const container = document.getElementById("roomsList");
    container.innerHTML = "";

    rooms.forEach((room, index) => {

        const div = document.createElement("div");
        div.classList.add("card");

        div.innerHTML = `
            <h3>${room.name}</h3>
            <p>${room.description || "Nessuna descrizione"}</p>

            <button onclick="editRoom(${index})">Modifica</button>
            <button onclick="removeRoom(${index})">Elimina</button>
        `;

        container.appendChild(div);
    });
}

function saveMuseum() {

    const selectedCheckboxes = document.querySelectorAll("#visitsSelection input:checked");

    const selectedVisits = [];

    selectedCheckboxes.forEach(cb => {
        selectedVisits.push(cb.value);
    });

    const data = {
        name: document.getElementById("name").value,
        city: document.getElementById("city").value,
        description: document.getElementById("description").value,
        rooms: rooms,
        visits: selectedVisits  
    };

    localStorage.setItem("museum", JSON.stringify(data));
}

// ===============================
// MODIFICA SALA
// ===============================
function editRoom(index) {

    const room = rooms[index];

    document.getElementById("newRoom").value = room.name;
    document.getElementById("newRoomDescription").value = room.description;

    editingRoomIndex = index;

    // scroll in alto
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}
// ===============================
// RIMUOVI SALA
// ===============================
function removeRoom(index) {
    rooms.splice(index, 1);
    renderRooms();
    saveMuseum();      
    renderMap();       //  aggiorna subito mappa
}

// ===============================
// SALVA
// ===============================
document.getElementById("museumForm")
.addEventListener("submit", function (event) {

    event.preventDefault();

    const data = {
        name: document.getElementById("name").value,
        city: document.getElementById("city").value,
        description: document.getElementById("description").value,
        rooms: rooms
    };

    localStorage.setItem("museum", JSON.stringify(data));

    showToast("Salvato con successo", "success");

    renderMap();
});

// ===============================
// MAPPA LOGICA (UPGRADE)
// ===============================
async function renderMap() {

    const container = document.getElementById("museumMap");
    container.innerHTML = "";

    const data = JSON.parse(localStorage.getItem("museum"));
    if (!data) return;

    const items = await apiGet("/items");

    data.rooms.forEach(room => {

        const div = document.createElement("div");
        div.classList.add("card");

        const roomItems = items.filter(item => item.room === room.name);

        const itemsHTML = roomItems.length
            ? roomItems.map(i => `
                <p>
                    <strong>${i.title}</strong><br>
                    ${i.author} - ${i.duration}s
                </p>
            `).join("")
            : "<p>Nessun item</p>";

        div.innerHTML = `
            <h3>${room.name}</h3>
            <p><em>${room.description || ""}</em></p>
            <hr>
            ${itemsHTML}
        `;

        container.appendChild(div);
    });
}

async function updateItemsRoom(oldName, newName) {

    const items = await apiGet("/items");

    for (const item of items) {
        if (item.room === oldName) {

            const updatedItem = {
                ...item,
                room: newName
            };

            await apiPut(`/items/${item._id}`, updatedItem);
        }
    }

    showToast("Sale aggiornate negli item", "edit");
}




async function loadVisitsForMuseum() {
    const visits = await apiGet("/visits");

    const container = document.getElementById("visitsSelection");
    container.innerHTML = "";

    visits.forEach(visit => {
        const div = document.createElement("div");

        div.innerHTML = `
            <label>
                <input type="checkbox" value="${visit._id}">
                ${visit.title}
            </label>
        `;

        container.appendChild(div);
    });
}


// ===============================
loadMuseum();
loadVisitsForMuseum();