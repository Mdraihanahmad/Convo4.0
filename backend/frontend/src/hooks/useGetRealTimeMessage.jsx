import { useEffect } from "react";
import {useSelector, useDispatch} from "react-redux";
import { setMessages, applyEditedMessage } from "../redux/messageSlice";
import { incrementUnread } from "../redux/userSlice";
import toast from "react-hot-toast";

const useGetRealTimeMessage = () => {
    const {socket} = useSelector(store=>store.socket);
    const dispatch = useDispatch();
    useEffect(()=>{
        if(!socket) return;
        const handler = (newMessage) => {
            const state = window.__APP_STORE__?.getState?.() || {};
            const currentMessages = state?.message?.messages || [];
            dispatch(setMessages([...(currentMessages), newMessage]));
            // Notification toast if chat not active
            const userState = state?.user || {};
            const selectedUser = userState.selectedUser;
            const rawSettings = userState.notificationSettings || {};
            const settings = { message: true, mutedChats: [], ...rawSettings };
            const isActiveChat = selectedUser && selectedUser._id === newMessage.senderId;
            const isMuted = Array.isArray(settings.mutedChats) && settings.mutedChats.includes(newMessage.senderId);
            if (!isActiveChat && newMessage?.senderId) dispatch(incrementUnread(String(newMessage.senderId)));
            if (settings.message && !isMuted) {
                toast.custom((t) => (
                    <div className="bg-gray-800 text-white px-3 py-2 rounded shadow">
                        <div className="font-semibold">New message</div>
                        <div className="opacity-80 text-sm">{newMessage.message || '[Attachment]'}</div>
                    </div>
                ), { position: 'top-right' });
            }
        };
        socket.on("newMessage", handler);
        const editHandler = (updated) => {
            dispatch(applyEditedMessage(updated));
        };
        socket.on("messageEdited", editHandler);
        // No separate call:logged channel anymore since server persists and emits as newMessage
        return () => {
            socket.off("newMessage", handler);
            socket.off("messageEdited", editHandler);
        };
    },[socket, dispatch]);
};
export default useGetRealTimeMessage;