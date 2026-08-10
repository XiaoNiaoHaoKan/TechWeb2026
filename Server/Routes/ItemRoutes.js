import express from "express";
import { createItem, getItems, deleteItem, updateItem, getItemById} from "../Controllers/ItemControllers.js";

//Collega URL->controller. Serve a mappare le rotte. Funziona come VisitRoutes.js, ma è per gli item.
const router = express.Router();

router.post("/", createItem);
router.get("/", getItems);

router.get("/:id", getItemById);

router.delete("/:id", deleteItem);
router.put("/:id", updateItem);

export default router;
