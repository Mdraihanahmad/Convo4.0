import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getImageUrl } from '../utils/image';

const servers = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };

const AudioCallWindow = ({
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
  const [startedAt, setStartedAt] = useState(null);
  const [muted, setMuted] = useState(false);
  const pcRef = useRef(null);
  const remoteAudioRef = useRef(null);

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
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        if (!isMounted) return;
        setLocalStream(stream);
        const pc = new RTCPeerConnection(servers);
        pcRef.current = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        pc.ontrack = (e) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = e.streams[0];
            remoteAudioRef.current.play().catch(() => {});
          }
          setStartedAt(Date.now());
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit('call:ice-candidate', { to: remoteUserId, candidate: e.candidate });
          }
        };

        // Callee path: we have an incoming offer and need to answer
        if (isCaller && outgoingOffer) {
          await pc.setRemoteDescription(outgoingOffer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('call:answer', { to: remoteUserId, answer, callee: { id: currentUserId, name: localUser?.fullName }, callType: 'audio' });
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
    setStartedAt(null);
    socket?.emit('call:end', { to: remoteUserId });
    onClose?.();
  };

  const toggleMute = () => {
    const audioTracks = localStream?.getAudioTracks() || [];
    audioTracks.forEach(t => (t.enabled = !t.enabled));
    setMuted(m => !m);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 text-white z-50 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-6">
        <div className="w-24 h-24 rounded-full bg-gray-700 mx-auto mb-3 overflow-hidden">
          {remoteUser?.profilePhoto ? (
            <img src={getImageUrl(remoteUser.profilePhoto)} alt={remoteUser?.fullName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🎧</div>
          )}
        </div>
        <h3 className="text-xl font-semibold">{remoteUser?.fullName || 'Audio Call'}</h3>
        <p className="opacity-80 text-sm mt-1">{elapsed}</p>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={toggleMute} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">{muted ? 'Unmute' : 'Mute'}</button>
        <button onClick={endCall} className="px-4 py-2 bg-red-600 rounded hover:bg-red-700">End Call</button>
      </div>

      <audio ref={remoteAudioRef} autoPlay playsInline />
    </div>
  );
};

export default AudioCallWindow;


