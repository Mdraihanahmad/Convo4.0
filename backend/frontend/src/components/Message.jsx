import React, { useRef } from 'react'
import { useSelector, useDispatch } from "react-redux";
import { getImageUrl } from '../utils/image';
import { formatDistanceToNow } from 'date-fns';
import { startEditing, setReplyContext } from '../redux/messageSlice';
import { FiFileText, FiDownload } from 'react-icons/fi';
import { API_BASE_URL } from '../apiConfig';
import { useState } from 'react';
import ImageLightbox from './ImageLightbox';

const AttachmentItem = ({ att }) => {
    const src = att.url?.startsWith('http') ? att.url : `${API_BASE_URL}${att.url?.startsWith('/') ? '' : '/'}${att.url || ''}`;
    if (att.type?.startsWith('image/')) {
        return <ImageThumb src={src} alt={att.name} />
    }
    if (att.type?.startsWith('video/')) {
        return (
            <video controls className='w-full h-32 object-cover rounded'>
                <source src={src} type={att.type} />
            </video>
        );
    }
    if (att.type?.startsWith('audio/')) {
        return (
            <audio controls className='w-full'>
                <source src={src} type={att.type} />
            </audio>
        );
    }
    return (
        <div className='flex items-center gap-2 p-2 bg-black/10 rounded'>
            <FiFileText className='flex-shrink-0' />
            <div className='min-w-0 flex-1'>
                <p className='text-xs truncate'>{att.name || 'Document'}</p>
            </div>
            <a href={src} target='_blank' rel='noreferrer' className='text-xs underline flex items-center gap-1'>
                <FiDownload />
                Open
            </a>
        </div>
    );
};

const ImageThumb = ({ src, alt }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <img
                src={src}
                alt={alt}
                className='w-full h-32 object-cover rounded cursor-zoom-in'
                onClick={() => setOpen(true)}
            />
            {open && <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
        </>
    );
};

 const Message = ({ message }) => {
    const dispatch = useDispatch();
    const { authUser, selectedUser } = useSelector(store => store.user);
    const isOwnMessage = message?.senderId === authUser?._id;
    const longPressTimer = useRef(null);
    const handleReply = () => {
        const senderName = isOwnMessage ? authUser?.fullName : selectedUser?.fullName || 'User';
        const hasMedia = Array.isArray(message?.attachments) && message.attachments.length > 0;
        const firstAttachment = hasMedia ? message.attachments[0] : null;
        const snippet = hasMedia ? '📎 Media' : (message?.message || '').slice(0, 50);
        dispatch(setReplyContext({
            messageId: message._id,
            senderName,
            snippet,
            attachmentType: firstAttachment?.type || '',
            attachmentUrl: firstAttachment?.url || ''
        }));
    };

    const formattedTime = message?.createdAt
        ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })
        : '';

    // Render call system message
    if (message?.system?.type === 'call') {
        const callType = message.system.callType;
        const accepted = message.system.accepted;
        const duration = message.system.durationSec;
        const icon = callType === 'audio' ? '📞' : '🎥';
        const label = accepted ? `Call ended • ${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')}` : 'Missed call';
        // collapse consecutive duplicate missed-call banners while rendering
        return (
            <div className='flex justify-center my-2'>
                <div className='text-xs px-2 py-1 bg-gray-700 text-white rounded-full'>{icon} {label}</div>
            </div>
        );
    }

    return (
        <div
            id={`msg-${message._id}`}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end gap-2 group`}
            onContextMenu={(e) => {
                // long-press equivalent on mobile can be implemented via touch events elsewhere
                e.preventDefault();
                handleReply();
            }}
            onTouchStart={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
                longPressTimer.current = setTimeout(() => handleReply(), 500);
            }}
            onTouchEnd={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
            }}
            onTouchMove={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
            }}
        >
            {!isOwnMessage && (
                <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                        <img
                            className="w-full h-full object-cover"
                            src={getImageUrl(selectedUser?.profilePhoto)}
                            alt={`${selectedUser?.fullName}'s avatar`}
                        />
                    </div>
                </div>
            )}
            <div className={`relative max-w-[75%] md:max-w-[60%] break-words ${
                isOwnMessage 
                    ? 'bg-blue-600 text-white rounded-t-lg rounded-l-lg' 
                    : 'bg-gray-200 text-gray-900 rounded-t-lg rounded-r-lg'
            } px-4 py-2 shadow-md`}>
                {/* Hover reply icon (desktop) */}
                <button
                    className={`hidden md:flex absolute top-1/2 -translate-y-1/2 ${isOwnMessage ? 'left-2' : 'right-2'} z-10 bg-black/30 hover:bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto`}
                    title="Reply"
                    onClick={(e) => { e.stopPropagation(); handleReply(); }}
                >↩</button>

                {/* If this message is a reply, show preview box */}
                {message?.replyTo && (
                    <div
                        className={`mb-1 p-2 rounded border-l-4 ${isOwnMessage ? 'border-blue-300 bg-white/10' : 'border-green-400 bg-black/5'}`}
                        onClick={(e)=>{
                            e.stopPropagation();
                            const el = document.getElementById(`msg-${message.replyTo}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                    >
                        <p className="text-xs font-semibold truncate">{message.replyPreview?.senderName || 'Reply'}</p>
                        {message.replyPreview?.attachmentUrl ? (
                            <div className="flex items-center gap-2 mt-1">
                                <img src={getImageUrl(message.replyPreview.attachmentUrl)} alt="preview" className="w-8 h-8 rounded object-cover" />
                                <span className="text-xs opacity-80">{message.replyPreview?.textSnippet || '📎 Media'}</span>
                            </div>
                        ) : (
                            <p className="text-xs opacity-80 truncate">{message.replyPreview?.textSnippet}</p>
                        )}
                    </div>
                )}
                {message?.attachments && message.attachments.length > 0 && (
                    <div className='mb-2 grid grid-cols-2 gap-2'>
                        {message.attachments.map((att) => (
                            <AttachmentItem key={att.url} att={att} />
                        ))}
                    </div>
                )}
                {message?.message && (
                    <p className="text-sm md:text-base whitespace-pre-wrap">
                        {message.message}
                        {message?.edited && <span className='ml-2 opacity-70 text-xs'>(edited)</span>}
                    </p>
                )}
                <div className={`text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                }`}>
                    {formattedTime}
                </div>
                {isOwnMessage && (
                    <div className='mt-1 opacity-0 group-hover:opacity-100 text-right'>
                        <button
                            className='text-xs underline'
                            onClick={() => dispatch(startEditing({ messageId: message._id, originalText: message.message }))}
                        >
                            Edit
                        </button>
                    </div>
                )}
            </div>
            {isOwnMessage && (
                <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                        <img
                            className="w-full h-full object-cover"
                            src={getImageUrl(authUser?.profilePhoto)}
                            alt="Your avatar"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

export default Message