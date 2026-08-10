import mongoose from "mongoose";


// Definizione della struttura di una visita nel database

const visitSchema = new mongoose.Schema({

    title: {

        type: String,

        required: true

    },


    // indica se è una visita guidata dalla docente

    synchronized: {

        type: Boolean,

        default: false

    },


    // codice mnemonico dato agli studenti

    syncCode: {

        type: String

    },


    // indice opera corrente

    currentIndex: {

        type: Number,

        default: 0

    },


    // stato visita

    isPlaying: {

        type: Boolean,

        default: false

    },



    // ===============================
    // SEQUENZA OPERE
    // ===============================

    sequence: [

        {

            itemId: {

                type: mongoose.Schema.Types.ObjectId,

                ref: "Item",

                required: true

            },


            order: {

                type: Number,

                required: true

            },


            // ===============================
            // CONTENUTI PRIVATI DELL'OPERA
            // ===============================

            privateContents: [

                {

                    title: {

                        type: String,

                        required: true

                    },


                    // text | image | pdf | video

                    type: {

                        type: String,

                        required: true

                    },


                    // usato solo se type = text

                    text: {

                        type: String,

                        default: ""

                    },


                    // usato per immagine, pdf e video

                    url: {

                        type: String,

                        default: ""

                    }

                }

            ]

        }

    ],



    // ===============================
    // QUIZ FINALE
    // ===============================

    quiz: [

        {

            question: {

                type: String,

                required: true

            },


            answers: [

                String

            ],


            correctIndex: {

                type: Number,

                required: true

            }

        }

    ],



    // indica se la docente ha avviato il quiz

    quizStarted: {

        type: Boolean,

        default: false

    },



    // ===============================
    // RISULTATI QUIZ STUDENTI
    // ===============================

    quizResults: [

        {

            studentName: {

                type: String,

                required: true

            },


            answers: [

                Number

            ],


            score: {

                type: Number,

                default: 0

            },


            completedAt: {

                type: Date,

                default: Date.now

            }

        }

    ],



    // ===============================
    // DOMANDE STUDENTI ALLA DOCENTE
    // ===============================

    questions: [

        {

            text: {

                type: String,

                required: true

            },


            answered: {

                type: Boolean,

                default: false

            }

        }

    ],



    // ===============================
    // STUDENTI COLLEGATI
    // ===============================

    students: [

        {

            name: {

                type: String,

                required: true

            },


            joinedAt: {

                type: Date,

                default: Date.now

            }

        }

    ]

},

{

    timestamps: true

});



export default mongoose.model(

    "Visit",

    visitSchema

);
