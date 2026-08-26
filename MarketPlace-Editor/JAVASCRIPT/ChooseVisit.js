// ===============================
// CARICA VISITE
// ===============================

async function loadVisits() {

    const visits = await apiGet("/visits");

    const container =
        document.getElementById("visitsList");

    container.innerHTML = "";


    visits.forEach((visit)=>{


        const div =
            document.createElement("div");


        div.classList.add("card");


        div.innerHTML = `

            <h3>
                ${visit.title}
            </h3>


            <p>
                <strong>Tipo:</strong>
                ${
                    visit.synchronized
                    ? "Sincronizzata"
                    : "Libera"
                }
            </p>


            <button onclick="startVisit('${visit._id}')">
                Inizia visita
            </button>

        `;


        container.appendChild(div);

    });

}



// ===============================
// AVVIA VISITA
// ===============================

function startVisit(visitId){


    if(!visitId){

        console.error(
            "ID visita mancante"
        );

        return;

    }


    const url =
        "VisitPlayer.html?id=" + visitId;


    console.log(
        "Redirect:",
        url
    );


    window.location.href = url;

}



// ===============================

loadVisits();
