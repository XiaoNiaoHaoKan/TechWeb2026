
// ===============================
// SELEZIONE ELEMENTI DEL DOM
// ===============================
const visitForm = document.getElementById("visitForm");

const itemsCheckboxList = document.getElementById("itemsCheckboxList");

let editingVisitId = null;

// ===============================
// CARICA GLI ITEM COME CHECKBOX
// ===============================
async function loadItemsForSelection() {
    //prende tutti gli item
    const items = await apiGet("/items");

    itemsCheckboxList.innerHTML = "";

    items.forEach(item => {
        const div = document.createElement("div");

        div.innerHTML = `
            <label>
                <input type="checkbox" value="${item._id}">
                ${item.title}
            </label>
        `;

        itemsCheckboxList.appendChild(div);
    });
}

// ===============================
// CARICA VISITE
// ===============================
async function loadVisits() {

    const visits = await apiGet("/visits");

    const container = document.getElementById("visitsList");
    container.innerHTML = "";

    visits.forEach((visit) => {

        const div = document.createElement("div");
        div.classList.add("card");

        const items = visit.sequence
            ? visit.sequence
                .sort((a, b) => a.order - b.order)
                .map(seq => seq.itemId?.title || "Item non trovato")
                .join(", ")
            : "Nessuno";

        div.innerHTML = `
            <h3>${visit.title}</h3>
            <p><strong>Item:</strong> ${items}</p>
            <p><strong>Tipo:</strong> ${visit.synchronized ? "Sincronizzata" : "Libera"}</p>

            <button onclick="startVisit('${visit._id}')">Avvia</button>
            <button onclick="editVisit('${visit._id}')">Modifica</button>
            <button onclick="deleteVisit('${visit._id}')">Elimina</button>
        `;

        container.appendChild(div);
    });
}
/*
function startVisit(visitId) {

        if (!visitId) {
    console.error("ID mancante nell'URL!");
}

    window.location.href = `http://localhost:5000/VisitPlayer.html?id=${visitId}`;


}
*/
function startVisit(visitId) {
    if (!visitId) {
        console.error("ID mancante!");
        return;
    }

    // Prendi URL corrente e aggiungi .html?id=...
    let url = window.location.origin + "/VisitPlayer.html?id=" + visitId;

    // Mostra cosa succede
    console.log("REDIRECT A:", url);
    alert("Redirect a: " + url);

    // Redirect reale
    window.location.href = url;
}
// ===============================
// SUBMIT FORM (FIX QUI)
// ===============================
visitForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const title = document.getElementById("title").value;
    const synchronized = document.getElementById("synchronized").checked;

    const selectedCheckboxes = document.querySelectorAll("#itemsCheckboxList input:checked");

    const sequence = [];

    selectedCheckboxes.forEach((checkbox, index) => {
        sequence.push({
            itemId: checkbox.value,
            order: index + 1
        });
    });

    const newVisit = { title, synchronized, sequence };

    try {
        if (editingVisitId) {
            await apiPut(`/visits/${editingVisitId}`, newVisit);
            editingVisitId = null;

            showToast("Visita modificata con successo", "edit");
        } else {
            await apiPost("/visits", newVisit);

            showToast("Visita salvata con successo", "success");
        }

        visitForm.reset();
        loadVisits();

    } catch (error) {
        console.error("Errore salvataggio visita:", error);
    }
});

// ===============================
// DELETE
// ===============================
async function deleteVisit(visitId) {
    await apiDelete(`/visits/${visitId}`);
    loadVisits();

    showToast("Visita eliminata con successo", "delete");
}

// ===============================
// EDIT (FIX _id)
// ===============================
async function editVisit(visitId) {

    const visits = await apiGet("/visits");
    const visit = visits.find(v => v._id === visitId);

    document.getElementById("title").value = visit.title;
    document.getElementById("synchronized").checked = visit.synchronized;

    const checkboxes = itemsCheckboxList.querySelectorAll("input");
    checkboxes.forEach(cb => cb.checked = false);

    // FIX QUI
    const selectedIds = visit.sequence.map(seq => seq.itemId._id);

    checkboxes.forEach(cb => {
        if (selectedIds.includes(cb.value)) {
            cb.checked = true;
        }
    });

    editingVisitId = visitId;

    //fa scorrere in alto quando si clicca per modificare la visita
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ===============================
loadItemsForSelection();
loadVisits();
