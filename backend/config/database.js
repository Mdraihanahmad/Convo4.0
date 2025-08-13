import mongoose from "mongoose";

const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/convo3";
    try {
        await mongoose.connect(mongoUri);
        console.log(`Database connected${process.env.MONGO_URI ? '' : ' (using default local URI)'}`);
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        throw error;
    }
};
export default connectDB;