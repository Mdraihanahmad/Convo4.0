import React, { useEffect } from 'react'
import axios from "axios";
import {useSelector,useDispatch} from "react-redux";
import { setMessages } from '../redux/messageSlice';
import { BASE_URL } from '..';

const useGetMessages = () => {
    const {selectedUser} = useSelector(store=>store.user);
    const dispatch = useDispatch();
    useEffect(() => {
        if (!selectedUser?._id) {
            dispatch(setMessages([]));
            return;
        }
        const fetchMessages = async () => {
            try {
                axios.defaults.withCredentials = true;
                const res = await axios.get(`${BASE_URL}/api/v1/message/${selectedUser._id}`);
                dispatch(setMessages(Array.isArray(res.data) ? res.data : []))
            } catch (error) {
                console.log(error);
                dispatch(setMessages([]));
            }
        }
        fetchMessages();
    }, [selectedUser?._id, dispatch]);
}

export default useGetMessages