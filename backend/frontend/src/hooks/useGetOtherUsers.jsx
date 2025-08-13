import React, { useEffect } from 'react';
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setOtherUsers } from '../redux/userSlice';
import { BASE_URL } from '..';
import toast from 'react-hot-toast';

const useGetOtherUsers = () => {
    const dispatch = useDispatch();
    const { socket } = useSelector(state => state.socket);

    useEffect(() => {
        const fetchOtherUsers = async () => {
            try {
                axios.defaults.withCredentials = true;
                const res = await axios.get(`${BASE_URL}/api/v1/user`);
                // store
                console.log("other users -> ",res);
                dispatch(setOtherUsers(res.data));
            } catch (error) {
                console.log(error);
                toast.error(error?.response?.data?.message || 'Failed to load users');
            }
        }
        fetchOtherUsers();
    }, [])

    useEffect(() => {
        if (!socket) return;
        const onReconnect = () => toast.success('Reconnected');
        const onConnectError = () => toast.error('Connection error');
        socket.on('connect', onReconnect);
        socket.on('connect_error', onConnectError);
        return () => {
            socket.off('connect', onReconnect);
            socket.off('connect_error', onConnectError);
        };
    }, [socket]);
 
}

export default useGetOtherUsers