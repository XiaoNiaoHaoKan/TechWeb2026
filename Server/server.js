import express from "express";
import cors from "cors";
import path from "path";
import { connectDB } from "./Config/db.js";

// routes
import ItemRoutes from "./Routes/ItemRoutes.js";
import VisitRoutes from "./Routes/VisitRoutes.js";

const app = express();

// fix __dirname per ES modules
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);;

// connessione a Mongo
connectDB();

// middleware
app.use(cors());
app.use(express.json());

// API
app.use("/api/items", ItemRoutes);
app.use("/api/visits", VisitRoutes);

// SERVIRE IL FRONTEND
app.use(express.static(path.join(__dirname, "../MarketPlace-Editor")));

// homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../MarketPlace-Editor/Index.html"));
});

// avvio server
app.listen(8000, () => {
    console.log("Server running on port 8000");
});

