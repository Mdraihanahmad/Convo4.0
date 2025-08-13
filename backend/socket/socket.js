import {Server} from "socket.io";
import http from "http";
import express from "express";
import { Conversation } from "../models/conversationModel.js";
import { Message } from "../models/messageModel.js";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors:{
        origin:['http://localhost:3000'],
        methods:['GET', 'POST'],
    },
});

export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
}

const userSocketMap = {}; // {userId->socketId}
const busyUsers = new Set();
const recentCallLogs = new Map(); // key: sorted from-to, value: timestamp ms


io.on('connection', (socket)=>{
    const userId = socket.handshake.query.userId
    if(userId !== undefined){
        userSocketMap[userId] = socket.id;
    } 

    io.emit('getOnlineUsers',Object.keys(userSocketMap));
    io.emit('users:busy', Array.from(busyUsers));

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
        busyUsers.delete(userId);
        io.emit('getOnlineUsers',Object.keys(userSocketMap));
    })

    // WebRTC signaling for video calls
    socket.on('call:offer', ({ to, offer, caller, callType = 'video' }) => {
        const receiverSocketId = userSocketMap[to];
        if (!receiverSocketId) {
            socket.emit('call:unavailable', { to, type: callType });
            return;
        }
        // Block check: if either has blocked the other, reject
        // Lightweight check via DB each offer
        // Avoid top-level import loops by dynamic import
        (async () => {
            try {
                const { User } = await import('../models/userModel.js');
                const callerUser = await User.findById(userId).select('blockedContacts');
                const calleeUser = await User.findById(to).select('blockedContacts');
                const callerBlocked = (callerUser?.blockedContacts || []).some(id => String(id) === String(to));
                const calleeBlocked = (calleeUser?.blockedContacts || []).some(id => String(id) === String(userId));
                if (callerBlocked || calleeBlocked) {
                    socket.emit('call:busy', { to, type: callType });
                    return;
                }
            } catch {}
        })();
        if (busyUsers.has(to)) {
            socket.emit('call:busy', { to, type: callType });
            return;
        }
        busyUsers.add(userId);
        io.to(receiverSocketId).emit('call:incoming', { from: userId, offer, caller, type: callType });
        io.emit('users:busy', Array.from(busyUsers));
    });

    socket.on('call:answer', ({ to, answer, callee, callType = 'video' }) => {
        const other = userSocketMap[to];
        if (other) {
            busyUsers.add(userId);
            io.to(other).emit('call:answer', { from: userId, answer, callee, type: callType });
            io.emit('users:busy', Array.from(busyUsers));
        }
    });

    socket.on('call:ice-candidate', ({ to, candidate }) => {
        const other = userSocketMap[to];
        if (other) {
            io.to(other).emit('call:ice-candidate', { from: userId, candidate });
        }
    });

    socket.on('call:end', ({ to, callType = 'video' }) => {
        const other = userSocketMap[to];
        busyUsers.delete(userId);
        if (other) {
            io.to(other).emit('call:ended', { from: userId });
            busyUsers.delete(to);
        }
        io.emit('users:busy', Array.from(busyUsers));

        // emit call log once per pair within a short window
        try {
            const a = String(userId);
            const b = String(to);
            const key = [a, b].sort().join('-');
            const now = Date.now();
            const last = recentCallLogs.get(key) || 0;
            if (now - last > 15000) {
                recentCallLogs.set(key, now);
                // Persist a system message to the conversation so history survives reloads
                (async () => {
                  try {
                    let convo = await Conversation.findOne({ participants: { $all: [a, b] } });
                    if (!convo) {
                      convo = await Conversation.create({ participants: [a, b], messages: [] });
                    }
                    const sysMsg = await Message.create({
                      senderId: a,
                      receiverId: b,
                      message: '',
                      attachments: [],
                      system: { type: 'call', callType, durationSec: 0, direction: 'outgoing', accepted: false },
                    });
                    convo.messages.push(sysMsg._id);
                    await convo.save();
                    const recvSock = userSocketMap[b];
                    if (recvSock) io.to(recvSock).emit('newMessage', sysMsg);
                    io.to(socket.id).emit('newMessage', sysMsg);
                  } catch (e) { /* silent */ }
                })();
            }
        } catch {}
    });


})

export {app, io, server};

