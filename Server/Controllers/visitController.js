// Importiamo il modello Visit per poter interagire con MongoDB
import Visit from "../Models/visits.js";



// ===============================
// CREA NUOVA VISITA
// ===============================

export async function createVisit(req,res){

    try{

        const newVisit =
        await Visit.create(req.body);


        res.json(newVisit);


    }catch(error){

        res.status(500)
        .json({
            error:error.message
        });

    }

}



// ===============================
// OTTIENI TUTTE LE VISITE
// ===============================

export async function getVisits(req,res){

    try{


        const visits =
        await Visit.find()
        .populate("sequence.itemId");


        res.json(visits);


    }catch(error){

        res.status(500)
        .json({
            error:error.message
        });

    }

}



// ===============================
// ELIMINA VISITA
// ===============================

export async function deleteVisit(req,res){

    try{


        await Visit.findByIdAndDelete(
            req.params.id
        );


        res.json({
            message:"Visit deleted successfully"
        });



    }catch(error){

        res.status(500)
        .json({
            error:error.message
        });

    }

}



// ===============================
// MODIFICA VISITA
// ===============================

export async function updateVisit(req,res){

    try{


        const visit =
        await Visit.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new:true
            }
        );


        res.json(visit);


    }catch(error){

        res.status(500)
        .json({
            error:error.message
        });

    }

}



// ===============================
// OTTIENI STATO VISITA
// ===============================

export async function getVisitState(req,res){

    try{


        const visit =
        await Visit.findById(
            req.params.id
        );


        res.json({

            currentIndex:
            visit.currentIndex,

            isPlaying:
            visit.isPlaying,
	    quizStarted: visit.quizStarted

        });



    }catch(error){

        res.status(500)
        .json({
            error:error.message
        });

    }

}



// ===============================
// AGGIORNA STATO VISITA
// ===============================

export async function updateVisitState(req,res){

    try{


        const {
            currentIndex,
            isPlaying
        } = req.body;



        const visit =
        await Visit.findByIdAndUpdate(

            req.params.id,

            {
                currentIndex,
                isPlaying
            },

            {
                new:true
            }

        );


        res.json(visit);



    }catch(error){

        res.status(500)
        .json({
            error:error.message
        });

    }

}



// ===============================
// AGGIUNGI DOMANDA STUDENTE
// ===============================

export async function addQuestion(req,res){

    try{


        const visit =
        await Visit.findById(
            req.params.id
        );



        if(!visit){

            return res.status(404)
            .json({
                error:"Visita non trovata"
            });

        }



        visit.questions.push({

            text:req.body.text,

            answered:false

        });



        await visit.save();



        res.json(
            visit.questions
        );



    }catch(error){

        res.status(500)
        .json({
            error:error.message
        });

    }

}



// ===============================
// STUDENTE ENTRA NELLA VISITA
// ===============================

export async function joinVisit(req,res){

    try{


        const visit =
        await Visit.findOne({

            syncCode:req.body.code

        });



        if(!visit){

            return res.status(404)
            .json({

                error:"Codice visita errato"

            });

        }



        visit.students.push({

            name:req.body.name

        });



        await visit.save();



        res.json(visit);



    }catch(error){

        res.status(500)
        .json({
            error:error.message
        });

    }

}



// ===============================
// AVVIA QUIZ
// ===============================

export async function startQuiz(req,res){

    try{


        const visit =
        await Visit.findByIdAndUpdate(

            req.params.id,

            {
                quizStarted:true
            },

            {
                new:true
            }

        );



        res.json(visit);



    }catch(error){

        res.status(500)
        .json({
            error:error.message
        });

    }

}



// ===============================
// SALVA RISPOSTE QUIZ STUDENTE
// ===============================

export async function saveQuizAnswer(req,res){

    try{


        const visit =
        await Visit.findById(
            req.params.id
        );



        if(!visit){

            return res.status(404)
            .json({

                error:"Visita non trovata"

            });

        }



        const {
            studentName,
            answers
        } = req.body;



        let score = 0;



        answers.forEach(

            (answer,index)=>{


                if(

                    answer ===
                    visit.quiz[index].correctIndex

                ){

                    score++;

                }

            }

        );



        // cerco se lo studente ha già risposto

        const existingResult =
        visit.quizResults.find(
            r =>
            r.studentName === studentName
        );



        if(existingResult){


            // aggiorno il risultato

            existingResult.answers =
                answers;


            existingResult.score =
                score;


            existingResult.completedAt =
                new Date();


        }
        else{


            // creo nuovo risultato

            visit.quizResults.push({

                studentName,

                answers,

                score

            });


        }


        await visit.save();



        res.json({

            message:"Quiz salvato",

            score

        });



    }catch(error){


        res.status(500)
        .json({

            error:error.message

        });


    }

}



// ===============================
// OTTIENI RISULTATI QUIZ
// DOCENTE
// ===============================

export async function getQuizResults(req,res){

    try{


        const visit =
        await Visit.findById(
            req.params.id
        );



        if(!visit){

            return res.status(404)
            .json({

                error:"Visita non trovata"

            });

        }



        res.json(
            visit.quizResults
        );



    }catch(error){


        res.status(500)
        .json({

            error:error.message

        });


    }

}
