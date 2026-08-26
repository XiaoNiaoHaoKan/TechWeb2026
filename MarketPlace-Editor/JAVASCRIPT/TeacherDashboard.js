const params =
    new URLSearchParams(window.location.search);

const visitId = params.get("id");

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

    document.getElementById("visitTitle").innerText =
        visit.title;

    document.getElementById("currentIndex").innerText =
        `${visit.currentIndex + 1}/${visit.sequence.length}`;

    document.getElementById("status").innerText =
        visit.isPlaying
            ? "In corso"
            : "Terminata";

    showCurrentItem();
    showQuestions();
    showStudents();
    showQuizResults();
}



// ===============================
// MOSTRA OPERA CORRENTE
// ===============================

function showCurrentItem(){

    const current =
        visit.sequence[visit.currentIndex];

    if(!current){

        document.getElementById("currentItem").innerText =
            "Fine visita";

        return;
    }

    document.getElementById("currentItem").innerText =
        current.itemId.title;

}



// ===============================
// AGGIORNA STATO
// ===============================

async function updateState(){

    await apiPut(
        `/visits/${visit._id}/state`,
        {
            currentIndex: visit.currentIndex,
            isPlaying: visit.isPlaying
        }
    );

}



// ===============================
// OPERA SUCCESSIVA
// ===============================

document
.getElementById("nextButton")
.addEventListener("click", async()=>{

    if(
        visit.currentIndex <
        visit.sequence.length-1
    ){

        visit.currentIndex++;

        await updateState();

        loadVisit();

    }

});



// ===============================
// OPERA PRECEDENTE
// ===============================

document
.getElementById("previousButton")
.addEventListener("click", async()=>{

    if(visit.currentIndex>0){

        visit.currentIndex--;

        await updateState();

        loadVisit();

    }

});



// ===============================
// TERMINA VISITA
// ===============================

document
.getElementById("stopButton")
.addEventListener("click", async()=>{

    visit.isPlaying = false;

    await updateState();

    showToast("Visita terminata");

    setTimeout(()=>{

        window.location.href =
            "TeacherVisitEditor.html";

    },1000);

});



// ===============================
// DOMANDE STUDENTI
// ===============================

function showQuestions(){

    const container =
        document.getElementById("questionsList");

    if(!container) return;

    container.innerHTML="";

    if(
        !visit.questions ||
        visit.questions.length===0
    ){

        container.innerHTML =
            "Nessuna domanda";

        return;
    }

    visit.questions.forEach(q=>{

        const p =
            document.createElement("p");

        p.innerText = q.text;

        container.appendChild(p);

    });

}



// ===============================
// STUDENTI COLLEGATI
// ===============================

function showStudents(){

    const container =
        document.getElementById("studentsList");

    if(!container) return;

    container.innerHTML="";

    if(
        !visit.students ||
        visit.students.length===0
    ){

        container.innerHTML =
            "Nessuno studente collegato";

        return;

    }

    visit.students.forEach(student=>{

        const p =
            document.createElement("p");

        p.innerText =
            "🟢 " + student.name;

        container.appendChild(p);

    });

}



// ===============================
// RISULTATI QUIZ
// ===============================

async function showQuizResults(){

    const container =
        document.getElementById("quizResults");

    if(!container) return;

    const results =
        await apiGet(
            `/visits/${visit._id}/quizResults`
        );

    container.innerHTML="";

    if(results.length===0){

        container.innerHTML =
            "Nessun risultato";

        return;

    }

    results.forEach(r=>{

        const p =
            document.createElement("p");

        p.innerHTML =
            `${r.studentName}: <strong>${r.score}/${visit.quiz.length}</strong>`;

        container.appendChild(p);

    });

}



// ===============================
// APRI EDITOR QUIZ
// ===============================

document
.getElementById("quizEditorButton")
.addEventListener("click",()=>{

    window.location.href =
        `TeacherQuizEditor.html?id=${visit._id}`;

});

document
.getElementById("startQuizButton")
.addEventListener(
"click",
async()=>{


    await apiPut(
        `/visits/${visit._id}/startQuiz`,
        {}
    );


    showToast(
        "Quiz avviato"
    );


});

// ===============================
// POLLING
// Aggiorna SOLO dati variabili
// ===============================

setInterval(async()=>{

    if(!visit) return;

    const visits =
        await apiGet("/visits");

    const updated =
        visits.find(
            v=>v._id===visit._id
        );

    if(!updated) return;

    visit.questions =
        updated.questions || [];

    visit.students =
        updated.students || [];

    visit.quizResults =
        updated.quizResults || [];

    showQuestions();
    showStudents();
    showQuizResults();

},2000);



// ===============================
// AVVIO
// ===============================

loadVisit();
