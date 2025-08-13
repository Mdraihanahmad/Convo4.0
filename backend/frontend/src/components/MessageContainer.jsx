import React, { useState, useEffect, useRef } from 'react'
import SendInput from './SendInput'
import Messages from './Messages';
import { useSelector, useDispatch } from "react-redux";
import { setSelectedUser, addSentFriendRequest, setBusyUsers } from '../redux/userSlice';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BASE_URL } from '..';
import useGetFriendRequests from '../hooks/useGetFriendRequests';
import VideoCallButton from './VideoCallButton';
import AudioCallButton from './AudioCallButton';
import IncomingCallModal from './IncomingCallModal';
import VideoCallWindow from './VideoCallWindow';
import AudioCallWindow from './AudioCallWindow';
import { getImageUrl } from '../utils/image';
 

const MessageContainer = () => {
    const { selectedUser, authUser, onlineUsers, sentFriendRequests, friendRequests, friends } = useSelector(store => store.user);
    const [isSending, setIsSending] = useState(false);
    const [friendshipStatus, setFriendshipStatus] = useState('none'); // 'none', 'pending_sent', 'pending_received', 'friends'
    const dispatch = useDispatch();
    const { socket } = useSelector(store => store.socket);
    const { blockedContacts } = useSelector(store => store.user.authUser || {});
    const [isTyping, setIsTyping] = useState(false);
    
    useEffect(() => {
        if (!socket || !selectedUser?._id) return;
        const handleTyping = ({ senderId }) => {
            if (senderId === selectedUser._id) setIsTyping(true);
        };
        const handleStopTyping = ({ senderId }) => {
            if (senderId === selectedUser._id) setIsTyping(false);
        };
        socket.on('typing', handleTyping);
        socket.on('stopTyping', handleStopTyping);
        return () => {
            socket.off('typing', handleTyping);
            socket.off('stopTyping', handleStopTyping);
        };
    }, [socket, selectedUser?._id]);
    const { refreshFriendData } = useGetFriendRequests();

    // Handle contact block/unfriend events
    useEffect(() => {
        const onBlock = async (e) => {
            const id = e.detail?.userId; if (!id) return;
            try { await axios.post(`${BASE_URL}/api/v1/user/block/${id}`, {}, { withCredentials: true }); toast.success('Contact blocked'); } catch { toast.error('Failed'); }
        };
        const onUnfriend = async (e) => {
            const id = e.detail?.userId; if (!id) return;
            try { await axios.post(`${BASE_URL}/api/v1/user/unfriend/${id}`, {}, { withCredentials: true }); toast.success('Removed from contacts'); } catch { toast.error('Failed'); }
        };
        window.addEventListener('contact:block', onBlock);
        window.addEventListener('contact:unfriend', onUnfriend);
        return () => {
            window.removeEventListener('contact:block', onBlock);
            window.removeEventListener('contact:unfriend', onUnfriend);
        };
    }, []);

    const isOnline = onlineUsers?.includes(selectedUser?._id);
    
    // Determine friendship status whenever selected user changes
    useEffect(() => {
        if (!selectedUser) return;
        
        // Check if they are friends
        const isFriend = friends?.some(id => id.toString() === selectedUser._id);
        if (isFriend) {
            setFriendshipStatus('friends');
            return;
        }
        
        // Check if auth user sent a request to selected user
        const hasSentRequest = sentFriendRequests?.some(id => id.toString() === selectedUser._id);
        if (hasSentRequest) {
            setFriendshipStatus('pending_sent');
            return;
        }
        
        // Check if selected user sent a request to auth user
        const hasReceivedRequest = friendRequests?.some(request => request._id === selectedUser._id);
        if (hasReceivedRequest) {
            setFriendshipStatus('pending_received');
            return;
        }
        
        // Otherwise, they are not friends
        setFriendshipStatus('none');
    }, [selectedUser, friends, sentFriendRequests, friendRequests]);

    const handleBack = () => {
        dispatch(setSelectedUser(null));
    };

    const handleSendFriendRequest = async () => {
        if (!selectedUser) return;
        
        try {
            setIsSending(true);
            const res = await axios.post(
                `${BASE_URL}/api/v1/user/friend-request/${selectedUser._id}`, 
                {}, 
                { withCredentials: true }
            );
            
            // Add the selected user's ID to sentFriendRequests
            dispatch(addSentFriendRequest(selectedUser._id));
            setFriendshipStatus('pending_sent');
            
            // Refresh friend data
            refreshFriendData();
            
            toast.success(res.data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Request failed. Try again');
            console.log(error);
        } finally {
            setIsSending(false);
        }
    };

    const handleAcceptRequest = async () => {
        if (!selectedUser) return;
        
        try {
            setIsSending(true);
            const res = await axios.post(
                `${BASE_URL}/api/v1/user/friend-request/${selectedUser._id}/accept`, 
                {}, 
                { withCredentials: true }
            );
            
            setFriendshipStatus('friends');
            
            // Refresh friend data
            refreshFriendData();
            
            toast.success(res.data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to accept request');
            console.log(error);
        } finally {
            setIsSending(false);
        }
    };

    const handleDeclineRequest = async () => {
        if (!selectedUser) return;
        
        try {
            setIsSending(true);
            const res = await axios.post(
                `${BASE_URL}/api/v1/user/friend-request/${selectedUser._id}/decline`, 
                {}, 
                { withCredentials: true }
            );
            
            setFriendshipStatus('none');
            
            // Refresh friend data
            refreshFriendData();
            
            toast.success(res.data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to decline request');
            console.log(error);
        } finally {
            setIsSending(false);
        }
    };
   
    // Render appropriate friendship buttons based on status
    const renderFriendshipButtons = () => {
        switch (friendshipStatus) {
            case 'none':
                return (
                    <button
                        onClick={handleSendFriendRequest}
                        disabled={isSending}
                        className="px-3 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isSending ? 'Sending...' : 'Add Friend'}
                    </button>
                );
            case 'pending_sent':
                return (
                    <button
                        disabled
                        className="px-3 py-2 rounded-md text-sm font-medium bg-gray-600 text-gray-300 cursor-not-allowed"
                    >
                        Pending
                    </button>
                );
            case 'pending_received':
                return (
                    <div className="flex gap-2">
                        <button
                            onClick={handleAcceptRequest}
                            disabled={isSending}
                            className="px-3 py-2 rounded-md text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                        >
                            Accept
                        </button>
                        <button
                            onClick={handleDeclineRequest}
                            disabled={isSending}
                            className="px-3 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
                        >
                            Decline
                        </button>
                    </div>
                );
            case 'friends':
                return (
                    <button
                        className="px-3 py-2 rounded-md text-sm font-medium bg-green-600 hover:bg-green-700 text-white flex items-center"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Message
                    </button>
                );
            default:
                return null;
        }
    };

    // Video call state
    const [incomingCall, setIncomingCall] = useState(null); // { from, offer, caller, type }
    const [callOpen, setCallOpen] = useState(false);
    const [outgoingOffer, setOutgoingOffer] = useState(null);
    const [activeCallType, setActiveCallType] = useState('video'); // 'video' | 'audio'

    // Outgoing ringback tone (caller side)
    const rbAudioCtxRef = useRef(null);
    const rbOscRef = useRef(null);
    const rbGainRef = useRef(null);
    const rbIntervalRef = useRef(null);

    const stopRingback = () => {
        if (rbIntervalRef.current) {
            clearInterval(rbIntervalRef.current);
            rbIntervalRef.current = null;
        }
        try { rbGainRef.current && (rbGainRef.current.gain.value = 0); } catch {}
        try { rbOscRef.current && rbOscRef.current.stop(0); } catch {}
        try { rbAudioCtxRef.current && rbAudioCtxRef.current.close(); } catch {}
        rbOscRef.current = null;
        rbGainRef.current = null;
        rbAudioCtxRef.current = null;
    };

    const startRingback = () => {
        stopRingback();
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            // Classic US ringback approx: alternating 440Hz/480Hz bursts
            osc.type = 'sine';
            let toggle = false;
            osc.frequency.value = 440;
            gain.gain.value = 0;
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            rbIntervalRef.current = setInterval(() => {
                toggle = !toggle;
                osc.frequency.setTargetAtTime(toggle ? 480 : 440, ctx.currentTime, 0.01);
                gain.gain.setTargetAtTime(toggle ? 0.2 : 0.0, ctx.currentTime, 0.01);
            }, 500);
            rbAudioCtxRef.current = ctx;
            rbOscRef.current = osc;
            rbGainRef.current = gain;
        } catch {}
    };

    useEffect(() => {
        if (!socket) return;
        const onIncoming = ({ from, offer, caller, type = 'video' }) => {
            setIncomingCall({ from, offer, caller, type });
        };
        const onUnavailable = () => { stopRingback(); toast.error('User unavailable'); };
        const onBusy = () => { stopRingback(); toast.error('User is on another call'); };
        const onEnded = () => {
            setCallOpen(false);
            setIncomingCall(null);
            setOutgoingOffer(null);
            setActiveCallType('video');
            stopRingback();
            // no client-side log emit; server emits single log on call:end with dedupe
        };
        const onAnswered = () => { stopRingback(); };
        socket.on('call:incoming', onIncoming);
        socket.on('call:unavailable', onUnavailable);
        socket.on('call:busy', onBusy);
        socket.on('call:ended', onEnded);
        socket.on('call:answer', onAnswered);
        socket.on('users:busy', (arr) => dispatch(setBusyUsers(arr)));
        return () => {
            socket.off('call:incoming', onIncoming);
            socket.off('call:unavailable', onUnavailable);
            socket.off('call:busy', onBusy);
            socket.off('call:ended', onEnded);
            socket.off('call:answer', onAnswered);
            socket.off('users:busy');
        };
    }, [socket]);

    const startCall = async () => {
        if (!socket || !selectedUser?._id) return;
        try {
            // Create peer and offer handled in VideoCallWindow (callee path). Here we only signal intent.
            const pc = new RTCPeerConnection({ iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] });
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            stream.getTracks().forEach(t => pc.addTrack(t, stream));
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            setOutgoingOffer(offer);
            setCallOpen(true);
            setActiveCallType('video');
            socket.emit('call:offer', { to: selectedUser._id, offer, caller: { id: authUser._id, name: authUser.fullName }, callType: 'video' });
            pc.close();
            startRingback();
        } catch (e) {
            console.log(e);
            toast.error('Failed to start call');
        }
    };

    const startAudioCall = async () => {
        if (!socket || !selectedUser?._id) return;
        try {
            const pc = new RTCPeerConnection({ iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] });
            const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            stream.getTracks().forEach(t => pc.addTrack(t, stream));
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            setOutgoingOffer(offer);
            setActiveCallType('audio');
            setCallOpen(true);
            socket.emit('call:offer', { to: selectedUser._id, offer, caller: { id: authUser._id, name: authUser.fullName }, callType: 'audio' });
            pc.close();
            startRingback();
        } catch (e) {
            console.log(e);
            toast.error('Failed to start audio call');
        }
    };

    const acceptIncoming = () => {
        setActiveCallType(incomingCall?.type || 'video');
        setCallOpen(true);
        // Close the modal immediately so ringtone (if any) is fully stopped
        setIncomingCall(null);
    };

    const declineIncoming = () => {
        const to = incomingCall?.from;
        socket?.emit('call:end', { to, callType: incomingCall?.type || 'video' });
        setIncomingCall(null);
    };

    useEffect(() => () => { stopRingback(); }, []);

    return (
        <div className='h-screen md:h-full w-full fixed md:relative left-0 top-0 md:inset-auto flex flex-col bg-gray-800 rounded-lg'>
            {selectedUser !== null ? (
                <>
                    <header className='flex-none flex items-center justify-between bg-gray-900 text-white px-2 sm:px-3 py-2 sm:py-3 shadow-lg'>
                        <button 
                            onClick={handleBack}
                            className='flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 mr-1 sm:mr-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors'
                            aria-label="Back to users list"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className={`relative ${isOnline ? 'online' : ''}`}>
                            <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden'>
                                <img 
                                    src={getImageUrl(selectedUser?.profilePhoto)} 
                                    alt="user-profile"
                                    className='w-full h-full object-cover'
                                />
                            </div>
                            {isOnline && (
                                <span className='absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white'></span>
                            )}
                        </div>
                        <div className='ml-2 sm:ml-4 flex-1 min-w-0'>
                            <div className="flex items-center flex-wrap">
                                <h3 className='font-semibold text-base sm:text-lg truncate'>{selectedUser?.fullName}</h3>
                                <span className="text-xs text-gray-400 ml-1 sm:ml-2 truncate">@{selectedUser?.username}</span>
                            </div>
                            <p className='text-xs sm:text-sm text-gray-300'>
                                {isTyping ? 'typing…' : (isOnline ? 'Online' : 'Offline')}
                            </p>
                        </div>
                        <div className="ml-1 sm:ml-2 flex-shrink-0 flex items-center gap-2">
                            <AudioCallButton onClick={startAudioCall} />
                            <VideoCallButton onClick={startCall} />
                            {renderFriendshipButtons()}
                        </div>
                    </header>
                    <main className='flex-1 overflow-hidden relative'>
                        <div className='absolute inset-0 overflow-y-auto'>
                            {Array.isArray(authUser?.blockedContacts) && authUser.blockedContacts.includes(selectedUser?._id) ? (
                                <div className='p-4 text-center text-sm text-gray-300'>
                                    You have blocked this contact.
                                </div>
                            ) : (
                                <Messages />
                            )}
                        </div>
                    </main>
                    <footer className='flex-none w-full sticky bottom-0 z-50'>
                        <SendInput />
                    </footer>

                    {/* Incoming call modal */}
                    <IncomingCallModal
                        isOpen={!!incomingCall}
                        caller={{ name: incomingCall?.caller?.name || selectedUser?.fullName, avatar: selectedUser?.profilePhoto }}
                        onAccept={acceptIncoming}
                        onDecline={declineIncoming}
                    />

                    {/* Call Windows */}
                    {activeCallType === 'video' ? (
                        <VideoCallWindow
                            isOpen={callOpen}
                            onClose={() => setCallOpen(false)}
                            localUser={authUser}
                            remoteUser={selectedUser}
                            socket={socket}
                            currentUserId={authUser?._id}
                            remoteUserId={incomingCall?.from || selectedUser?._id}
                            isCaller={!!incomingCall}
                            outgoingOffer={incomingCall?.offer || outgoingOffer}
                        />
                    ) : (
                        <AudioCallWindow
                            isOpen={callOpen}
                            onClose={() => setCallOpen(false)}
                            localUser={authUser}
                            remoteUser={selectedUser}
                            socket={socket}
                            currentUserId={authUser?._id}
                            remoteUserId={incomingCall?.from || selectedUser?._id}
                            isCaller={!!incomingCall}
                            outgoingOffer={incomingCall?.offer || outgoingOffer}
                        />
                    )}
                </>
            ) : (
                <div className='h-full flex flex-col justify-center items-center bg-gray-800 text-white p-4'>
                    <h1 className='text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-center'>Welcome, {authUser?.fullName}!</h1>
                    <p className='text-lg md:text-xl lg:text-2xl text-gray-300 text-center'>
                        Select a conversation to start chatting
                    </p>
                </div>
            )}
        </div>
    )
}

export default MessageContainer