const params =
    new URLSearchParams(window.location.search);

const visitId =
    params.get("id");

let visit = null;



// =================================
// CARICA VISITA
// =================================

async function loadVisit() {

    const visits =
        await apiGet("/visits");

    visit =
        visits.find(v => v._id === visitId);

    if (!visit) {

        alert("Visita non trovata");
        return;

    }

    showQuiz();

}



// =================================
// MOSTRA QUIZ
// =================================

function showQuiz() {

    const container =
        document.getElementById("quizList");

    container.innerHTML = "";

    if (!visit.quiz ||
        visit.quiz.length === 0) {

        container.innerHTML =
            "<p>Nessuna domanda presente.</p>";

        return;

    }

    visit.quiz.forEach((q, index) => {

        const div =
            document.createElement("div");

        div.classList.add("card");

        div.innerHTML = `

            <h3>${index + 1}) ${q.question}</h3>

            <p>A) ${q.answers[0]}</p>
            <p>B) ${q.answers[1]}</p>
            <p>C) ${q.answers[2]}</p>
            <p>D) ${q.answers[3]}</p>

            <p>
                <strong>
                Corretta:
                ${String.fromCharCode(65 + q.correctIndex)}
                </strong>
            </p>

            <button onclick="deleteQuestion(${index})">
                Elimina
            </button>

        `;

        container.appendChild(div);

    });

}



// =================================
// SALVA DOMANDA
// =================================

document
.getElementById("saveButton")
.addEventListener("click", async () => {

    const question =
        document
        .getElementById("questionInput")
        .value.trim();

    const answers = [

        document.getElementById("answer0").value.trim(),
        document.getElementById("answer1").value.trim(),
        document.getElementById("answer2").value.trim(),
        document.getElementById("answer3").value.trim()

    ];

    const correctIndex =
        Number(
            document
            .getElementById("correctIndex")
            .value
        );

    if (!question) {

        alert("Inserisci una domanda");
        return;

    }

    visit.quiz.push({

        question,
        answers,
        correctIndex

    });

    visit =
        await apiPut(
            `/visits/${visit._id}`,
            visit
        );

    clearForm();

    showQuiz();

    alert("Domanda salvata");

});



// =================================
// ELIMINA DOMANDA
// =================================

async function deleteQuestion(index) {

    visit.quiz.splice(index, 1);

    visit =
        await apiPut(
            `/visits/${visit._id}`,
            visit
        );

    showQuiz();

}

window.deleteQuestion =
    deleteQuestion;



// =================================
// AVVIA QUIZ
// =================================

document
.getElementById("startQuizButton")
.addEventListener("click", async () => {

    await apiPut(

        `/visits/${visit._id}/startQuiz`,

        {}

    );

    alert("Quiz avviato!");

});



// =================================
// PULISCI FORM
// =================================

function clearForm() {

    document.getElementById("questionInput").value = "";

    for (let i = 0; i < 4; i++) {

        document.getElementById(
            "answer" + i
        ).value = "";

    }

    document.getElementById("correctIndex").value = 0;

}

document
.getElementById("backButton")
.addEventListener(
"click",
()=>{

    window.location.href =
    `TeacherDashboard.html?id=${visitId}`;

});

// =================================
// AVVIO
// =================================

loadVisit();
