// const express = require('express')// method-1
import express from "express"; // method-2
import dotenv from "dotenv"; 
import connectDB from "./config/database.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import userRoute from "./routes/userRoute.js";
import messageRoute from "./routes/messageRoute.js";
import statusRoute from "./routes/statusRoute.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { app,server } from "./socket/socket.js";
dotenv.config({});

 
const PORT = process.env.PORT || 5000;

// middleware
app.use(express.urlencoded({extended:true}));
app.use(express.json()); 
app.use(cookieParser());
const corsOption={
    origin: process.env.NODE_ENV === "production" ? true : 'http://localhost:3000',
    credentials:true
};
app.use(cors(corsOption)); 
// serve uploaded images
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));


// routes
app.use("/api/v1/user",userRoute); 
app.use("/api/v1/message",messageRoute);
app.use("/api/v1/status", statusRoute);

// ------------- code for deployment -----------------
{
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const publicPath = path.join(__dirname, "public");
    const indexHtml = path.join(publicPath, "index.html");
    const shouldServeStatic = process.env.NODE_ENV === "production" || fs.existsSync(indexHtml);
    if (shouldServeStatic) {
        app.use(express.static(publicPath));
        app.get("*", (req, res) => {
            res.sendFile(indexHtml);
        });
    }
}
 

server.listen(PORT, ()=>{
    // Provide default JWT secret if unset in dev, so auth works locally
    if (!process.env.JWT_SECRET_KEY) {
        process.env.JWT_SECRET_KEY = "supersecret";
        console.warn("JWT_SECRET_KEY not set. Using default for local development.");
    }
    connectDB();
    console.log(`Server listen at prot ${PORT}`);
});

