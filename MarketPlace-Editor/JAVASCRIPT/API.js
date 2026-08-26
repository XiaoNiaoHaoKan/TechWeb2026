const API_BASE = "/api";

//serve per comunicare col backend senza usare sempre fetch

// ===============================
// GET
// ===============================
async function apiGet(url) {

    const response = await fetch(API_BASE + url);

    return response.json();
}


// ===============================
// POST crea dati
// ===============================
async function apiPost(url, data) {

    const response = await fetch(API_BASE + url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        
        //Invia dati al server
        body: JSON.stringify(data)
    });

    return response.json();
}


// ===============================
// PUT modifica dati
// ===============================
async function apiPut(url, data) {

    const response = await fetch(API_BASE + url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    return response.json();
}


// ===============================
// DELETE
// ===============================
async function apiDelete(url) {

    const response = await fetch(API_BASE + url, {
        method: "DELETE"
    });

    return response.json();
}

function showToast(message, type = "success") {

    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.innerText = message;

    // reset classi
    toast.className = "toast";

    // aggiunge tipo
    toast.classList.add(type);
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}
