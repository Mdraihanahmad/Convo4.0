import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser, addSentFriendRequest, setAuthUser, clearUnread } from '../redux/userSlice';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BASE_URL } from '..';
import useGetFriendRequests from '../hooks/useGetFriendRequests';
import { getImageUrl } from '../utils/image';
import PortalDropdown from './PortalDropdown';
import UnreadBadge from './UnreadBadge';

const OtherUser = ({ user }) => {
    const dispatch = useDispatch();
    const { selectedUser, onlineUsers, busyUsers, friends, sentFriendRequests, friendRequests, authUser, unreadCounts } = useSelector(store => store.user);
    const [menuOpen, setMenuOpen] = useState(false);
    const { refreshFriendData } = useGetFriendRequests();
    const isOnline = onlineUsers?.includes(user._id);
    const isBusy = busyUsers?.includes(user._id);
    const menuBtnRef = useRef(null);
    const isBlocked = Array.isArray(authUser?.blockedContacts) && authUser.blockedContacts.includes(user._id);
    
    // State to track friendship status
    const [friendshipStatus, setFriendshipStatus] = useState('none');
    
    // Determine friendship status
    useEffect(() => {
        // Check if user is a friend by looking for their ID in the friends array
        const isFriend = friends?.some(id => id.toString() === user._id);
        if (isFriend) {
            setFriendshipStatus('friends');
            return;
        }
        
        // Check if auth user sent a request to user
        const hasSentRequest = sentFriendRequests?.some(id => id.toString() === user._id);
        if (hasSentRequest) {
            setFriendshipStatus('pending_sent');
            return;
        }
        
        // Check if user sent a request to auth user
        const hasReceivedRequest = friendRequests?.some(request => request._id === user._id);
        if (hasReceivedRequest) {
            setFriendshipStatus('pending_received');
            return;
        }
        
        setFriendshipStatus('none');
    }, [user._id, friends, sentFriendRequests, friendRequests]);
    
    const selectedUserHandler = (user) => {
        dispatch(setSelectedUser(user));
        dispatch(clearUnread(String(user._id)));
    }

    const handleSendFriendRequest = async (e) => {
        e.stopPropagation(); // Prevent triggering the parent click

        try {
            const res = await axios.post(
                `${BASE_URL}/api/v1/user/friend-request/${user._id}`, 
                {}, 
                { withCredentials: true }
            );
            
            // Add the user's ID to sentFriendRequests
            dispatch(addSentFriendRequest(user._id));
            
            // Update local state
            setFriendshipStatus('pending_sent');
            
            // Refresh friend data
            refreshFriendData();
            
            toast.success(res.data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Request failed. Try again');
            console.log(error);
        }
    };
    
    const handleBlockToggle = async (friendId) => {
        try {
            // optimistic UI update
            const nextBlocked = new Set(authUser?.blockedContacts || []);
            const willBlock = !nextBlocked.has(friendId);
            if (willBlock) {
                nextBlocked.add(friendId);
            } else {
                nextBlocked.delete(friendId);
            }
            dispatch(setAuthUser({ ...(authUser || {}), blockedContacts: Array.from(nextBlocked) }));

            // server request
            if (willBlock) {
                await axios.post(`${BASE_URL}/api/v1/user/block/${friendId}`, {}, { withCredentials: true });
                toast.success('Contact blocked');
            } else {
                await axios.post(`${BASE_URL}/api/v1/user/unblock/${friendId}`, {}, { withCredentials: true });
                toast.success('Contact unblocked');
            }
        } catch (error) {
            // revert on error
            toast.error(error?.response?.data?.message || 'Failed to update');
            // Refetch profile could be added, but for now revert to previous state
            dispatch(setAuthUser(authUser));
        } finally {
            setMenuOpen(false);
        }
    };
    
    // Get action button based on friendship status
    const getActionButton = () => {
        switch (friendshipStatus) {
            case 'friends':
                return (
                    <button 
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs flex items-center"
                        onClick={(e) => {
                            e.stopPropagation();
                            selectedUserHandler(user);
                        }}
                    >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Message
                    </button>
                );
            case 'pending_sent':
                return (
                    <button 
                        className="px-2 py-1 bg-gray-600 text-gray-300 rounded-md text-xs cursor-not-allowed"
                        disabled
                    >
                        Pending...
                    </button>
                );
            case 'pending_received':
                return (
                    <button 
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs"
                        onClick={(e) => {
                            e.stopPropagation();
                            selectedUserHandler(user);
                        }}
                    >
                        Respond
                    </button>
                );
            default:
                return (
                    <button 
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs"
                        onClick={handleSendFriendRequest}
                    >
                        Add Friend
                    </button>
                );
        }
    };
    
    return (
        <>
            <div 
                onClick={() => selectedUserHandler(user)} 
                className={`${
                    selectedUser?._id === user?._id 
                        ? 'bg-zinc-200 text-black' 
                        : 'text-white hover:text-black hover:bg-zinc-200'
                } flex gap-1.5 sm:gap-2 items-center rounded p-1.5 sm:p-2 cursor-pointer transition-colors`}
            >
                <div className={`relative ${isOnline ? 'online' : ''}`}>
                    <div className='w-10 sm:w-12 rounded-full'>
                        <img src={getImageUrl(user?.profilePhoto)} alt="user-profile" className="w-full h-full object-cover" />
                    </div>
                    {isOnline && (
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 ${isBusy ? 'bg-yellow-500' : 'bg-green-500'} rounded-full border-2 border-gray-800`}></span>
                    )}
                </div>
                <div className='flex flex-col flex-1 min-w-0'>
                    <div className='flex justify-between items-center gap-1 sm:gap-2'>
                        <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base truncate">{user?.fullName}</p>
                            <p className="text-[10px] sm:text-xs text-gray-400 truncate">@{user?.username}</p>
                        </div>
                        <div className='flex items-center gap-2'>
                            {getActionButton()}
                            <div>
                                <button ref={menuBtnRef} className='px-2 py-1 text-xs bg-gray-700 rounded'
                                    onClick={(e)=>{e.stopPropagation(); setMenuOpen(o=>!o);}}>⋮</button>
                                <PortalDropdown anchorRef={menuBtnRef} isOpen={menuOpen} onClose={()=>setMenuOpen(false)}>
                                    <button className='w-full text-left text-xs hover:bg-gray-700 rounded px-2 py-1'
                                        onClick={(e)=>{e.stopPropagation(); handleBlockToggle(user._id);}}>
                                        {isBlocked ? 'Unblock' : 'Block'}
                                    </button>
                                    <button className='w-full text-left text-xs hover:bg-gray-700 rounded px-2 py-1'
                                        onClick={(e)=>{e.stopPropagation(); window.dispatchEvent(new CustomEvent('contact:unfriend', { detail: { userId: user._id } })); setMenuOpen(false);}}>Unfriend</button>
                                </PortalDropdown>
                            </div>
                            {/* Unread badge positioned near the right side */}
                            <UnreadBadge count={unreadCounts?.[String(user._id)] || 0} />
                        </div>
                    </div>
                </div>
            </div>
            <div className='divider my-0 py-0 h-1'></div>
        </>
    )
}

export default OtherUser