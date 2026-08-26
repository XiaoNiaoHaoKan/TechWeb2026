// Importiamo express per creare il router
import express from "express";


// Importiamo le funzioni dal controller

import { 

    createVisit, 
    getVisits, 
    deleteVisit, 
    updateVisit,
    getVisitState,
    updateVisitState,
    addQuestion,
    joinVisit,
    startQuiz,
    saveQuizAnswer,
    getQuizResults
} from "../Controllers/visitController.js";



// Creiamo router

const router = express.Router();



// ===============================
// CREA VISITA
// ===============================

router.post("/", createVisit);



// ===============================
// OTTIENI VISITE
// ===============================

router.get("/", getVisits);



// ===============================
// STATO SINCRONIZZAZIONE
// ===============================

router.get(
    "/:id/state",
    getVisitState
);


router.put(
    "/:id/state",
    updateVisitState
);



// ===============================
// DOMANDE STUDENTI
// ===============================

router.post(
    "/:id/questions",
    addQuestion
);



// ===============================
// MODIFICA VISITA
// ===============================

router.put(
    "/:id",
    updateVisit
);



// ===============================
// ELIMINA VISITA
// ===============================

router.delete(
    "/:id",
    deleteVisit
);

router.post("/:id/questions", addQuestion);

router.post("/:id/join", joinVisit);

router.put("/:id/startQuiz", startQuiz);

router.post( "/:id/quizAnswer", saveQuizAnswer);

router.get("/:id/quizResults", getQuizResults);
export default router;
