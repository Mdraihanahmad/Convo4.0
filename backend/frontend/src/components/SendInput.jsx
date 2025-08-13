import React, {useEffect, useRef, useState } from 'react'
import { IoSend } from "react-icons/io5";
import { FaRegSmile } from 'react-icons/fa';
import { MdAttachFile } from 'react-icons/md';
import FilePreviewList from './FilePreviewList';
import EmojiPicker from './EmojiPicker';
import axios from "axios";
import {useDispatch,useSelector} from "react-redux";
import { setMessages, cancelEditing, applyEditedMessage, setReplyContext } from '../redux/messageSlice';
import toast from 'react-hot-toast';
import { BASE_URL } from '..';

const SendInput = () => {
    const [message, setMessage] = useState("");
    const dispatch = useDispatch();
    const {selectedUser, authUser} = useSelector(store=>store.user);
    const {messages, editing, replyContext} = useSelector(store=>store.message);
    const fileInputRef = useRef(null);
    const [files, setFiles] = useState([]);
    const [showEmoji, setShowEmoji] = useState(false);
    const textRef = useRef(null);
    const {socket} = useSelector(store=>store.socket);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, []);

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        const trimmed = message.trim();
        if (!selectedUser?._id) {
            toast.error('Select a user to send a message.');
            return;
        }
        if (Array.isArray(authUser?.blockedContacts) && authUser.blockedContacts.includes(selectedUser._id)) {
            toast.error('You have blocked this contact');
            return;
        }
        if (!trimmed && files.length === 0) return;
        try {
            if (editing?.messageId) {
                // Save edit
                const res = await axios.put(`${BASE_URL}/api/v1/message/edit/${editing.messageId}`, { message: trimmed }, {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                });
                dispatch(applyEditedMessage(res.data));
                dispatch(cancelEditing());
            } else {
                // New message with optional attachments
                const form = new FormData();
                form.append('message', trimmed);
                if (replyContext) {
                    form.append('replyTo', replyContext.messageId);
                    form.append('replyPreview', JSON.stringify({
                        senderName: replyContext.senderName,
                        textSnippet: replyContext.snippet,
                        attachmentType: replyContext.attachmentType,
                        attachmentUrl: replyContext.attachmentUrl,
                    }));
                }
                for (const f of files) form.append('attachments', f);
                const res = await axios.post(`${BASE_URL}/api/v1/message/send/${selectedUser._id}`, form, {
                    withCredentials: true
                });
                if (res?.data?.newMessage) {
                    dispatch(setMessages([...(messages || []), res.data.newMessage]))
                }
                if (socket) socket.emit('stopTyping', { receiverId: selectedUser._id });
            }
        } catch (error) {
            console.log(error);
            toast.error(error?.response?.data?.message || 'Failed to send message');
        } 
        setMessage("");
        setFiles([]);
        setShowEmoji(false);
        if (replyContext) dispatch(setReplyContext(null));
    }
    
    const handleChange = (e) => {
        const value = e.target.value;
        setMessage(value);
        if (!socket || !selectedUser?._id) return;
        socket.emit('typing', { receiverId: selectedUser._id });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stopTyping', { receiverId: selectedUser._id });
        }, 1200);
    }

    const handleFilesSelect = (e) => {
        const selected = Array.from(e.target.files || []);
        setFiles((prev) => [...prev, ...selected]);
    };

    const removeFile = (idx) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const insertEmoji = (emoji) => {
        if (!textRef.current) return;
        const el = textRef.current;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const next = message.slice(0, start) + emoji.native + message.slice(end);
        setMessage(next);
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(start + emoji.native.length, start + emoji.native.length);
        });
    };
    return (
        <form onSubmit={onSubmitHandler} className='px-2 sm:px-4 py-2 sm:py-3 bg-gray-800 border-t border-gray-700'>
            <div className='w-full relative flex flex-col gap-2'>
                {editing?.messageId && (
                    <div className='text-xs text-yellow-300'>Editing message… <button className='underline ml-2' type='button' onClick={() => dispatch(cancelEditing())}>Cancel</button></div>
                )}
                {replyContext && (
                    <div className='text-xs bg-gray-700 border-l-4 border-green-400 rounded px-2 py-1 flex items-center justify-between'>
                        <div className='truncate'>
                            <span className='font-semibold'>{replyContext.senderName}:</span> <span className='opacity-80'>{replyContext.snippet}</span>
                        </div>
                        <button type='button' className='ml-2 opacity-70 hover:opacity-100' onClick={() => dispatch(setReplyContext(null))}>✕</button>
                    </div>
                )}
                <FilePreviewList files={files} onRemove={removeFile} />
                <div className='flex items-center gap-2'>
                    <button type='button' className='text-gray-300 hover:text-white' onClick={() => fileInputRef.current?.click()}>
                        <MdAttachFile size={20} />
                    </button>
                    <input ref={fileInputRef} type='file' multiple hidden onChange={handleFilesSelect} />
                    <button type='button' className='text-gray-300 hover:text-white' onClick={() => setShowEmoji((s) => !s)}>
                        <FaRegSmile size={18} />
                    </button>
                    <input
                        ref={textRef}
                        value={editing?.originalText ?? message}
                        onChange={(e) => {
                            if (editing?.messageId) {
                                // keep editing state text local via message as well
                                setMessage(e.target.value);
                            } else {
                                handleChange(e);
                            }
                        }}
                        type="text"
                        placeholder={editing?.messageId ? 'Edit your message…' : 'Send a message...'}
                        className='flex-1 border text-xs sm:text-sm rounded-lg w-full p-2 sm:p-3 pl-3 sm:pl-4 border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    />
                    <button 
                        type="submit" 
                        className='p-1.5 sm:p-2 text-blue-500 hover:text-blue-400 transition-colors'
                        disabled={!(editing?.messageId ? (message.trim().length>0) : (message.trim().length>0 || files.length>0))}
                    >
                        <IoSend size={20} className="sm:w-6 sm:h-6 w-5 h-5" />
                    </button>
                </div>
                {showEmoji && (
                    <div className='absolute bottom-12 left-8 z-50'>
                        <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
                    </div>
                )}
            </div>
        </form>
    )
}

export default SendInput