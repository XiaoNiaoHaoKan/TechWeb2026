import mongoose from "mongoose";

const connectDB = async () => {
    try {
        // Shared "artaround" MongoDB database, same one used by Jack and Luigi's servers.
        const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/artaround";

        await mongoose.connect(uri);

        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        process.exit(1);
    }
};

export { connectDB };
