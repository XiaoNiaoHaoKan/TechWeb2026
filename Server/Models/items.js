import mongoose from "mongoose";

//Definizione degli item del database.
const itemSchema = new mongoose.Schema({
    museumId: { type: String, required: true },
    objectId: { type: String, required: true },

    title: { type: String, required: true },
    text: { type: String, required: true },

    duration: { type: Number, required: true },      // 3s, 15s, 40s...
    languageLevel: { type: String, required: true }, // infantile, medio...

    author: { type: String, required: true },
    license: { type: String, required: true },

    price: { type: Number, required: true, default: 0 },
    
    room: { type: String },
    
    tags: [String],

    /*per la compatibilità a wikidata*/
    externalId: { type: String } // es: Q12345 (Wikidata)
    
}, { timestamps: true });

export default mongoose.model("Item", itemSchema);
