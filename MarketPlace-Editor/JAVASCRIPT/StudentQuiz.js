const params =
    new URLSearchParams(window.location.search);

const visitId =
    params.get("id");

let visit = null;



// =====================================
// CARICA QUIZ
// =====================================

async function loadQuiz(){

    const visits =
        await apiGet("/visits");

    visit =
        visits.find(
            v=>v._id===visitId
        );

    if(!visit){

        alert("Visita non trovata");
        return;

    }

    showQuiz();

}



// =====================================
// MOSTRA QUIZ
// =====================================

function showQuiz(){

    const container =
        document.getElementById(
            "quizContainer"
        );

    container.innerHTML="";



    visit.quiz.forEach((q,index)=>{

        let html=`

        <div class="card">

        <h3>

        ${index+1}) ${q.question}

        </h3>

        `;



        q.answers.forEach((answer,i)=>{

            html+=`

            <label>

            <input

            type="radio"

            name="question${index}"

            value="${i}"

            >

            ${answer}

            </label>

            <br>

            `;

        });



        html+="</div>";



        container.innerHTML+=html;

    });



    container.innerHTML+=`

    <button id="submitQuiz">

    Consegna quiz

    </button>

    `;



    document
    .getElementById("submitQuiz")
    .addEventListener(
        "click",
        submitQuiz
    );

}



// =====================================
// INVIO QUIZ
// =====================================

async function submitQuiz(){

    let score=0;



    visit.quiz.forEach((q,index)=>{

        const checked=

        document.querySelector(

            `input[name="question${index}"]:checked`

        );



        if(

            checked &&

            Number(checked.value)===q.correctIndex

        ){

            score++;

        }

    });



    const studentName=

        localStorage.getItem("studentName") ||

        "Studente";



    await apiPost(

        `/visits/${visit._id}/quizAnswer`,

        {

            student:studentName,

            score:score

        }

    );



    alert(

        `Quiz inviato!\nPunteggio: ${score}/${visit.quiz.length}`

    );



    document.body.innerHTML=`

    <h1>

    Quiz consegnato.

    Grazie!

    </h1>

    `;

}



// =====================================

loadQuiz();
