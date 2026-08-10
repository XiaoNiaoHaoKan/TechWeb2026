import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const uri = "mongodb://site252614:Oejachu0@mongo_site252614:27017/site252614?authSource=admin";

        await mongoose.connect(uri);

        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        process.exit(1);
    }
};

export { connectDB };
