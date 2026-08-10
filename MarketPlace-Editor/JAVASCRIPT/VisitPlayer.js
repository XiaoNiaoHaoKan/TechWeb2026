let visit = null;

let currentIndex = 0;

let quizShown = false;


// ===============================
// CARICA VISITA
// ===============================

async function loadVisit(){

    const params =
        new URLSearchParams(
            window.location.search
        );


    const visitId =
        params.get("id");



    const visits =
        await apiGet("/visits");



    visit =
        visits.find(
            v => v._id === visitId
        );



    if(!visit){

        alert("Visita non trovata");
        return;

    }



    console.log(
        "VisitPlayer:",
        visit
    );



    currentIndex =
        visit.currentIndex;



    document
    .getElementById("visitTitle")
    .innerText =
        visit.title;



    // se sincronizzata lo studente
    // non può andare avanti

    if(visit.synchronized){

        document
        .getElementById("nextButton")
        .style.display =
            "none";

    }



    // se il quiz era già stato avviato
    // prima che lo studente entrasse

    if(
        visit.quizStarted &&
        !quizShown
    ){

        quizShown = true;

        showQuiz();

    }



    showCurrentItem();

}



// ===============================
// MOSTRA OPERA CORRENTE
// ===============================

function showCurrentItem(){


    const current =
        visit.sequence[currentIndex];



    if(!current){


        document
        .getElementById("itemTitle")
        .innerText =
            "Visita terminata";


        document
        .getElementById("itemText")
        .innerText =
            "";


        return;

    }



    const item =
        current.itemId;



    document
    .getElementById("itemTitle")
    .innerText =
        item.title;



    document
    .getElementById("itemText")
    .innerText =
        item.text;



    // visita libera

    if(!visit.synchronized){


        setTimeout(()=>{

            nextItem();

        },
        item.duration * 1000);


    }


}



// ===============================
// AVANTI
// ===============================

function nextItem(){


    currentIndex++;



    if(
        currentIndex >=
        visit.sequence.length
    ){


        document
        .getElementById("itemTitle")
        .innerText =
            "Visita terminata";


        return;

    }



    showCurrentItem();


}



// ===============================
// POLLING SERVER
// ===============================

setInterval(async()=>{


    if(!visit)
        return;



    const visits =
        await apiGet("/visits");



    const updatedVisit =
        visits.find(
            v => v._id === visit._id
        );



    if(!updatedVisit)
        return;



    visit = updatedVisit;



    // cambio opera

    if(
        currentIndex !== visit.currentIndex
    ){


        currentIndex =
            visit.currentIndex;


        showCurrentItem();

    }



    // avvio quiz

    if(
        visit.quizStarted &&
        !quizShown
    ){

        quizShown = true;

        showQuiz();

    }



},2000);




// ===============================
// CLICK AVANTI
// ===============================

document
.getElementById("nextButton")
.addEventListener(
"click",
()=>{


    if(
        !visit.synchronized
    ){

        nextItem();

    }


});




// ===============================
// INVIO DOMANDA ALLA DOCENTE
// ===============================

document
.getElementById("sendQuestionButton")
.addEventListener(
"click",
async()=>{


    const input =
        document.getElementById(
            "questionInput"
        );



    const text =
        input.value.trim();



    if(!text){

        alert(
            "Scrivi una domanda"
        );

        return;

    }



    await apiPost(

        `/visits/${visit._id}/questions`,

        {
            text:text
        }

    );



    input.value = "";



    alert(
        "Domanda inviata alla docente"
    );


});




// ===============================
// MOSTRA QUIZ
// ===============================

function showQuiz(){


    const container =
        document.getElementById(
            "quizContainer"
        );



    if(!container)
        return;



    container.innerHTML = `

        <h2>
            Quiz finale
        </h2>

    `;



    visit.quiz.forEach(
    (q,index)=>{


        const div =
            document.createElement(
                "div"
            );


        div.classList.add(
            "card"
        );



        div.innerHTML = `


        <h3>
            ${index+1})
            ${q.question}
        </h3>


        <label>

            <input
            type="radio"
            name="q${index}"
            value="0">

            ${q.answers[0]}

        </label>

        <br>


        <label>

            <input
            type="radio"
            name="q${index}"
            value="1">

            ${q.answers[1]}

        </label>

        <br>


        <label>

            <input
            type="radio"
            name="q${index}"
            value="2">

            ${q.answers[2]}

        </label>

        <br>


        <label>

            <input
            type="radio"
            name="q${index}"
            value="3">

            ${q.answers[3]}

        </label>


        `;



        container.appendChild(div);


    });



    container.style.display =
        "block";



    const button =
        document.getElementById(
            "sendQuizButton"
        );


    if(button){

        button.style.display =
            "block";

    }


}



// ===============================
// INVIO RISPOSTE QUIZ
// ===============================

document
.getElementById("sendQuizButton")
.addEventListener(
"click",
async()=>{


    let answers = [];



    visit.quiz.forEach(
    (q,index)=>{


        const selected =
            document.querySelector(
                `input[name="q${index}"]:checked`
            );



        if(selected){

            answers.push(
                Number(
                    selected.value
                )
            );

        }
        else{

            answers.push(-1);

        }


    });



    const studentName =
        localStorage.getItem(
            "studentName"
        );



    await apiPost(

        `/visits/${visit._id}/quizAnswer`,

        {

            studentName,

            answers

        }

    );



    alert(
        "Risposte inviate"
    );



    document
    .getElementById(
        "sendQuizButton"
    )
    .disabled = true;


});




// ===============================
// AVVIO
// ===============================

loadVisit();
