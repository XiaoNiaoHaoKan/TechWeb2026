const visitSelect = document.getElementById("visitSelect");
const syncCodeInput = document.getElementById("syncCode");

let selectedVisit = null;


// =================================
// CARICA VISITE
// =================================

async function loadVisits(){

    const visits =
        await apiGet("/visits");

    const synchronizedVisits =
        visits.filter(v=>v.synchronized);

    visitSelect.innerHTML="";

    synchronizedVisits.forEach(visit=>{

        const option =
            document.createElement("option");

        option.value =
            visit._id;

        option.textContent =
            visit.title;

        visitSelect.appendChild(option);

    });

    if(synchronizedVisits.length>0){

        selectedVisit =
            synchronizedVisits[0];

        visitSelect.value =
            selectedVisit._id;

        syncCodeInput.value =
            selectedVisit.syncCode || "";

    }
    showVisitItems();
}



// =================================
// CAMBIO VISITA
// =================================

visitSelect.addEventListener("change",async()=>{

    const visits =
        await apiGet("/visits");

    selectedVisit =
        visits.find(
            v=>v._id===visitSelect.value
        );

    syncCodeInput.value =
        selectedVisit.syncCode || "";
    
    showVisitItems();
});



// =================================
// SALVA CODICE
// =================================

document
.getElementById("saveButton")
.addEventListener("click",async()=>{

    if(!selectedVisit){

        alert("Seleziona una visita");
        return;

    }

    selectedVisit =
        await apiPut(

            `/visits/${selectedVisit._id}`,

            {
                ...selectedVisit,
                syncCode:syncCodeInput.value
            }

        );

    showToast("Codice salvato");

    loadSavedVisits();

});



// =================================
// GESTISCI QUIZ
// =================================

document
.getElementById("quizButton")
.addEventListener("click",()=>{

    if(!selectedVisit){

        alert("Seleziona una visita");
        return;

    }

    window.location.href =
        `TeacherQuizEditor.html?id=${selectedVisit._id}`;

});



// =================================
// AVVIA VISITA
// =================================

document
.getElementById("startButton")
.addEventListener("click",async()=>{

    if(!selectedVisit){

        alert("Seleziona una visita");
        return;

    }

    selectedVisit =
        await apiPut(

            `/visits/${selectedVisit._id}`,

            {

                ...selectedVisit,

                currentIndex:0,

                isPlaying:true,

                students:[],

                questions:[],

                quizResults:[],

                quizStarted:false

            }

        );

    window.location.href =
        `TeacherDashboard.html?id=${selectedVisit._id}`;

});



// =================================
// VISITE PREPARATE
// =================================

async function loadSavedVisits(){

    const visits =
        await apiGet("/visits");

    const container =
        document.getElementById("savedVisits");

    container.innerHTML="";

    visits
    .filter(v=>v.synchronized)
    .forEach(visit=>{

        const div =
            document.createElement("div");

        div.classList.add("card");

        div.innerHTML=`

            <h3>${visit.title}</h3>

            <p>
                <strong>Codice:</strong>
                ${visit.syncCode || "non assegnato"}
            </p>

            <p>
                Quiz:
                ${visit.quiz.length} domande
            </p>

        `;

        container.appendChild(div);

    });

}

// =================================
// MOSTRA OPERE DELLA VISITA
// =================================

function showVisitItems(){


    const container =
        document.getElementById("itemsList");


    if(!container)
        return;


    container.innerHTML="";


    if(!selectedVisit ||
       !selectedVisit.sequence){

        container.innerHTML =
        "Nessuna opera";

        return;

    }



    selectedVisit.sequence.forEach(
        (item,index)=>{


            const div =
            document.createElement("div");


            div.classList.add("card");



            div.innerHTML = `


                <h3>
                    ${item.itemId.title}
                </h3>


                <p>
                    Numero opera:
                    ${index+1}
                </p>


                <button
                onclick="
                openPrivateContents(${index})
                ">

                    Contenuti privati

                </button>


            `;


            container.appendChild(div);


        }
    );

}

// =================================
// APRI CONTENUTI PRIVATI
// =================================

function openPrivateContents(index){


    window.location.href =
    `TeacherPrivateContents.html?visitId=${selectedVisit._id}&itemIndex=${index}`;


}


window.openPrivateContents =
openPrivateContents;

// =================================
// AVVIO
// =================================

loadVisits();

loadSavedVisits();
