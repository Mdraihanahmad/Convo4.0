import {Server} from "socket.io";
import http from "http";
import express from "express";
import { Conversation } from "../models/conversationModel.js";
import { Message } from "../models/messageModel.js";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors:{
        origin: process.env.NODE_ENV === 'production' ? true : ['http://localhost:3000'],
        methods:['GET', 'POST'],
    },
});

export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
}

const userSocketMap = {}; // {userId->socketId}


io.on('connection', (socket)=>{
    const userId = socket.handshake.query.userId
    if(userId !== undefined){
        userSocketMap[userId] = socket.id;
    } 

    io.emit('getOnlineUsers',Object.keys(userSocketMap));

    // Typing indicators
    socket.on('typing', ({ receiverId }) => {
        if (!receiverId) return;
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('typing', { senderId: userId });
        }
    });

    socket.on('stopTyping', ({ receiverId }) => {
        if (!receiverId) return;
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('stopTyping', { senderId: userId });
        }
    });

    socket.on('disconnect', ()=>{
        delete userSocketMap[userId];
        io.emit('getOnlineUsers',Object.keys(userSocketMap));
    })

})


export {app, io, server};

