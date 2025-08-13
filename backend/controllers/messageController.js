import { Conversation } from "../models/conversationModel.js";
import { Message } from "../models/messageModel.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import path from 'path';
import cloudinary, { configureCloudinary, isCloudinaryConfigured } from "../utils/cloudinary.js";

export const sendMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        // Block checks: if either side blocked the other, reject
        const senderBlockedList = req.blockedContacts || [];
        if (senderBlockedList.includes(String(receiverId))) {
            return res.status(403).json({ message: 'You have blocked this contact' });
        }
        // Check receiver has not blocked sender
        const { User } = await import('../models/userModel.js');
        const receiver = await User.findById(receiverId).select('blockedContacts');
        if ((receiver?.blockedContacts || []).some(id => String(id) === String(senderId))) {
            return res.status(403).json({ message: 'Message not delivered' });
        }
        let { message, replyTo = null, replyPreview = null } = req.body;
        const files = req.files || [];

        let gotConversation = await Conversation.findOne({
            participants:{$all : [senderId, receiverId]},
        });

        if(!gotConversation){
            gotConversation = await Conversation.create({
                participants:[senderId, receiverId]
            })
        };
        let attachments = [];
        if (files.length) {
            if (isCloudinaryConfigured()) {
                configureCloudinary();
                const uploads = await Promise.all(
                    files.map(f => cloudinary.uploader.upload(f.path, {
                        folder: "convo3/attachments",
                        resource_type: "auto"
                    }))
                );
                attachments = uploads.map((u, idx) => ({
                    url: u.secure_url,
                    type: files[idx].mimetype,
                    name: files[idx].originalname,
                    size: files[idx].size,
                }));
            } else {
                attachments = files.map(f => ({
                    url: `/uploads/${path.basename(f.path)}`,
                    type: f.mimetype,
                    name: f.originalname,
                    size: f.size,
                }));
            }
        }

        // Parse replyPreview if sent as JSON string via multipart
        if (typeof replyPreview === 'string') {
            try { replyPreview = JSON.parse(replyPreview); } catch (_) { replyPreview = null; }
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            message,
            attachments,
            replyTo: replyTo || null,
            replyPreview: replyPreview || undefined,
        });
        if(newMessage){
            gotConversation.messages.push(newMessage._id);
        };
        

        await Promise.all([gotConversation.save(), newMessage.save()]);
         
        // SOCKET IO
        const receiverSocketId = getReceiverSocketId(receiverId);
        if(receiverSocketId){
            io.to(receiverSocketId).emit("newMessage", newMessage);
            io.to(receiverSocketId).emit('notify', {
                type: 'message',
                senderId,
                senderName: '',
                avatarURL: '',
                messagePreview: newMessage.message || (newMessage.attachments?.length ? '[Attachment]' : ''),
                timestamp: Date.now()
            });
        }
        return res.status(201).json({
            newMessage
        })
    } catch (error) {
        console.log(error);
    }
}
export const getMessage = async (req,res) => {
    try {
        const receiverId = req.params.id;
        const senderId = req.id;
        const conversation = await Conversation.findOne({
            participants:{$all : [senderId, receiverId]}
        }).populate("messages"); 
        return res.status(200).json(conversation?.messages);
    } catch (error) {
        console.log(error);
    }
}

export const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { message } = req.body;
        const userId = req.id;
        const existing = await Message.findById(messageId);
        if (!existing) return res.status(404).json({ message: 'Message not found' });
        if (String(existing.senderId) !== String(userId)) {
            return res.status(403).json({ message: 'Not allowed' });
        }
        existing.message = message;
        existing.edited = true;
        existing.editedAt = new Date();
        await existing.save();
        const receiverSocketId = getReceiverSocketId(existing.receiverId.toString());
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('messageEdited', existing);
        }
        return res.status(200).json(existing);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server error' });
    }
}