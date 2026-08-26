document
.getElementById("joinButton")
.addEventListener(
"click",
async()=>{


    const code =
        document
        .getElementById("codeInput")
        .value.trim();


    const name =
        document
        .getElementById("nameInput")
        .value.trim();



    if(!code || !name){

        alert(
        "Inserisci nome e codice"
        );

        return;

    }

   localStorage.setItem("studentName",name);

    // cerca la visita tramite codice

    const visits =
        await apiGet("/visits");



    const visit =
        visits.find(
            v =>
            v.syncCode === code
        );



    if(!visit){

        alert(
        "Codice non valido"
        );

        return;

    }



    // registra lo studente

    await apiPost(
        `/visits/${visit._id}/join`,
        {
            name:name,
            code:code
        }
    );

localStorage.setItem(
    "studentName",
    name
);

    // apre la visita

    window.location.href =
        "VisitPlayer.html?id="
        + visit._id;



});
