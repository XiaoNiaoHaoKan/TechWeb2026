// ===============================
// PARAMETRI URL
// ===============================

const params = new URLSearchParams(window.location.search);

const visitId = params.get("visitId");
const itemIndex = Number(params.get("itemIndex"));

let visit = null;



// ===============================
// CARICA VISITA
// ===============================

async function loadVisit() {

    const visits = await apiGet("/visits");

    visit = visits.find(
        v => v._id === visitId
    );

    if (!visit) {

        alert("Visita non trovata");

        return;
    }

    const currentItem =
        visit.sequence[itemIndex].itemId;

    document
        .getElementById("itemTitle")
        .innerText =
        currentItem.title;

    showContents();

}



// ===============================
// MOSTRA CONTENUTI
// ===============================

function showContents() {

    const container =
        document.getElementById("contentsList");

    container.innerHTML = "";

    const contents =
        visit.sequence[itemIndex].privateContents || [];

    if (contents.length === 0) {

        container.innerHTML =
            "Nessun contenuto.";

        return;
    }

    contents.forEach((content, index) => {

        const div =
            document.createElement("div");

        div.classList.add("card");

        div.innerHTML = `

            <h3>
                ${content.title}
            </h3>

            <p>
                Tipo:
                ${content.type}
            </p>

            ${
                content.type === "text"
                ?
                `<p>${content.text}</p>`
                :
                `<a href="${content.url}" target="_blank">
                    Apri contenuto
                 </a>`
            }

            <br><br>

            <button onclick="deleteContent(${index})">
                Elimina
            </button>

        `;

        container.appendChild(div);

    });

}



// ===============================
// AGGIUNGI CONTENUTO
// ===============================

document
.getElementById("saveButton")
.addEventListener(
"click",
async()=>{

    const title =
        document
        .getElementById("titleInput")
        .value
        .trim();

    const type =
        document
        .getElementById("typeInput")
        .value;

    const text =
        document
        .getElementById("textInput")
        .value
        .trim();

    const url =
        document
        .getElementById("urlInput")
        .value
        .trim();

    if(!title){

        alert("Inserisci un titolo");

        return;

    }

    if(type==="text" && !text){

        alert("Inserisci il testo");

        return;

    }

    if(type!=="text" && !url){

        alert("Inserisci un URL");

        return;

    }

    if(!visit.sequence[itemIndex].privateContents){

        visit.sequence[itemIndex].privateContents=[];

    }

    visit.sequence[itemIndex]
    .privateContents
    .push({

        title,

        type,

        text,

        url

    });

    visit =
        await apiPut(
            `/visits/${visit._id}`,
            visit
        );

    clearForm();

    showContents();

    showToast("Contenuto aggiunto");

});



// ===============================
// ELIMINA CONTENUTO
// ===============================

async function deleteContent(index){

    visit.sequence[itemIndex]
    .privateContents
    .splice(index,1);

    visit =
        await apiPut(
            `/visits/${visit._id}`,
            visit
        );

    showContents();

    showToast("Contenuto eliminato");

}

window.deleteContent =
deleteContent;



// ===============================
// PULISCI FORM
// ===============================

function clearForm(){

    document
    .getElementById("titleInput")
    .value="";

    document
    .getElementById("textInput")
    .value="";

    document
    .getElementById("urlInput")
    .value="";

}



// ===============================
// TORNA ALLA VISITA
// ===============================

document
.getElementById("backButton")
.addEventListener(
"click",
()=>{

    window.location.href =
        `TeacherVisitEditor.html?id=${visitId}`;

});



// ===============================
// AVVIO
// ===============================

loadVisit();
