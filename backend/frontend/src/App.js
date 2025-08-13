import Signup from './components/Signup';
import './App.css';
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import HomePage from './components/HomePage';
import Login from './components/Login';
import { useEffect, useState } from 'react';
import {useSelector,useDispatch} from "react-redux";
import io from "socket.io-client";
import { setSocket } from './redux/socketSlice';
import { setOnlineUsers } from './redux/userSlice';
import { BASE_URL } from '.';
import StatusTab from './components/StatusTab';
import StatusViewer from './components/StatusViewer';
import { SOCKET_URL } from './apiConfig';

const router = createBrowserRouter([
  {
    path:"/",
    element:<HomePage/>
  },
  {
    path:"/status",
    element:<StatusTab/>
  },
  {
    path:"/signup",
    element:<Signup/>
  },
  {
    path:"/login",
    element:<Login/>
  },

])

function App() { 
  const {authUser} = useSelector(store=>store.user);
  const {socket} = useSelector(store=>store.socket);
  const dispatch = useDispatch();

  useEffect(()=>{
    if(authUser){
      const socketio = io(SOCKET_URL, {
          query:{
            userId:authUser._id
          }
      });
      dispatch(setSocket(socketio));

      socketio?.on('getOnlineUsers', (onlineUsers)=>{
        dispatch(setOnlineUsers(onlineUsers))
      });
      return () => socketio.close();
    }else{
      if(socket){
        socket.close();
        dispatch(setSocket(null));
      }
    }

  },[authUser]);

  // Ask for Notification permission and register service worker
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(()=>{});
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/notification-sw.js').catch(()=>{});
    }
  }, []);

  return (
    <div className="p-4 h-screen flex items-center justify-center">
      <>
        <RouterProvider router={router}/>
        <StatusViewer />
      </>
    </div>

  );
}

export default App;
