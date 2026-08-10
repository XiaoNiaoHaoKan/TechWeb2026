import Item from "../Models/items.js";

// ===============================
// CREA ITEM
// ===============================
export async function createItem(req, res) {
    //dati sono mandati dal frontend e salvati nel DB
    const item = await Item.create(req.body);

    //ritorna l’item creato
    res.json(item);
}

// ===============================
// GET TUTTI GLI ITEM
// ===============================
export async function getItems(req, res) {
    const items = await Item.find(); //find prende i documenti
    res.json(items);
}

// ===============================
// GET ITEM PER ID
// ===============================
export async function getItemById(req, res) {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: "Item non trovato" });
        }

        res.json(item);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

// ===============================
// UPDATE ITEM
// ===============================
export async function updateItem(req, res) {
    const item = await Item.findByIdAndUpdate(
        req.params.id,
        req.body,
        
        //restituisce item aggiornato
        { new: true }
    );

    res.json(item);
}

// ===============================
// DELETE ITEM
// ===============================
export async function deleteItem(req, res) {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: "Item deleted" });
}
