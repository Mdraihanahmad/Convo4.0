import React, { useEffect, useMemo, useRef, useState } from 'react';
import VideoTile from './VideoTile';

const servers = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };

const VideoCallWindow = ({
  isOpen,
  onClose,
  localUser,
  remoteUser,
  socket,
  currentUserId,
  remoteUserId,
  isCaller,
  outgoingOffer,
}) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const pcRef = useRef(null);

  const elapsed = useMemo(() => {
       if (!startedAt) return '00:00';
       const s = Math.floor((Date.now() - startedAt) / 1000);
       const mm = String(Math.floor(s / 60)).padStart(2, '0');
       const ss = String(s % 60).padStart(2, '0');
       return `${mm}:${ss}`;
  }, [startedAt, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isMounted) return;
        setLocalStream(stream);
        const pc = new RTCPeerConnection(servers);
        pcRef.current = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        pc.ontrack = (e) => {
          setRemoteStream(e.streams[0]);
          setStartedAt(Date.now());
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit('call:ice-candidate', { to: remoteUserId, candidate: e.candidate });
          }
        };

        if (isCaller && outgoingOffer) {
          await pc.setRemoteDescription(outgoingOffer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('call:answer', { to: remoteUserId, answer, callee: { id: currentUserId, name: localUser?.fullName } });
        }
      } catch (e) {
        console.error(e);
        onClose?.();
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!socket) return;
    const onIce = ({ from, candidate }) => {
      if (!pcRef.current) return;
      pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    };
    const onAnswer = async ({ from, answer }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(answer);
        setStartedAt(Date.now());
      } catch {}
    };
    const onEnded = () => endCall();
    socket.on('call:ice-candidate', onIce);
    socket.on('call:answer', onAnswer);
    socket.on('call:ended', onEnded);
    return () => {
      socket.off('call:ice-candidate', onIce);
      socket.off('call:answer', onAnswer);
      socket.off('call:ended', onEnded);
    };
  }, [socket]);

  const endCall = () => {
    if (pcRef.current) {
      pcRef.current.getSenders?.().forEach(s => s.track?.stop());
      pcRef.current.close();
      pcRef.current = null;
    }
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setStartedAt(null);
    socket?.emit('call:end', { to: remoteUserId });
    onClose?.();
  };

  const toggleMute = () => {
    const audioTracks = localStream?.getAudioTracks() || [];
    audioTracks.forEach(t => (t.enabled = !t.enabled));
    setMuted((m) => !m);
  };
  const toggleCamera = () => {
    const videoTracks = localStream?.getVideoTracks() || [];
    videoTracks.forEach(t => (t.enabled = !t.enabled));
    setCameraOff((c) => !c);
  };

  const toggleScreenShare = async () => {
    try {
      if (!pcRef.current) return;
      if (!screenSharing) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const displayTrack = displayStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && displayTrack) {
          await sender.replaceTrack(displayTrack);
          setScreenSharing(true);
          displayTrack.onended = async () => {
            const originalTrack = localStream?.getVideoTracks()?.[0];
            if (originalTrack && sender) {
              await sender.replaceTrack(originalTrack);
            }
            setScreenSharing(false);
          };
        }
      } else {
        const originalTrack = localStream?.getVideoTracks()?.[0];
        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (originalTrack && sender) {
          await sender.replaceTrack(originalTrack);
        }
        setScreenSharing(false);
      }
    } catch (e) {
      // swallow permission cancellations
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 text-white z-50 flex flex-col">
      <div className="flex-1 grid md:grid-cols-4 grid-cols-1 gap-2 p-2">
        <div className="md:col-span-3 order-2 md:order-1">
          <VideoTile stream={remoteStream} isLocal={false} label={remoteUser?.fullName || 'Remote'} />
        </div>
        <div className="order-1 md:order-2 h-48 md:h-auto">
          <VideoTile stream={localStream} isLocal={true} muted={true} label={localUser?.fullName || 'You'} />
        </div>
      </div>
      <div className="p-3 flex items-center justify-center gap-4 bg-gray-800/70">
        <span className="text-sm opacity-80">{elapsed}</span>
        <button onClick={toggleMute} className="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600">{muted ? 'Unmute' : 'Mute'}</button>
        <button onClick={toggleCamera} className="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600">{cameraOff ? 'Camera On' : 'Camera Off'}</button>
        <button onClick={toggleScreenShare} className="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600">{screenSharing ? 'Stop Share' : 'Share Screen'}</button>
        <button onClick={endCall} className="px-3 py-2 bg-red-600 rounded hover:bg-red-700">End Call</button>
      </div>
    </div>
  );
};

export default VideoCallWindow;


