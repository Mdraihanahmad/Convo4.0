import React, { useEffect, useRef } from 'react';
import { getImageUrl } from '../utils/image';

const IncomingCallModal = ({ isOpen, caller, onAccept, onDecline, autoDismissMs = 30000 }) => {
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  const intervalRef = useRef(null);

  const stopRingtone = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    try { gainRef.current && (gainRef.current.gain.value = 0); } catch {}
    try { oscRef.current && oscRef.current.stop(0); } catch {}
    try { audioCtxRef.current && audioCtxRef.current.close(); } catch {}
    oscRef.current = null;
    gainRef.current = null;
    audioCtxRef.current = null;
  };

  const startRingtone = () => {
    stopRingtone();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 850; // ring tone frequency
    gain.gain.value = 0; // start silent
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    // Beep-beep pattern
    let on = false;
    intervalRef.current = setInterval(() => {
      on = !on;
      gain.gain.setTargetAtTime(on ? 0.2 : 0.0, ctx.currentTime, 0.01);
    }, 600);
    audioCtxRef.current = ctx;
    oscRef.current = osc;
    gainRef.current = gain;
  };

  useEffect(() => {
    if (!isOpen) {
      stopRingtone();
      return;
    }
    startRingtone();
    const t = setTimeout(() => { stopRingtone(); onDecline?.(); }, autoDismissMs);
    return () => { clearTimeout(t); stopRingtone(); };
  }, [isOpen, autoDismissMs, onDecline]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white rounded-lg p-4 w-80 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700">
            {caller?.avatar ? (
              <img src={getImageUrl(caller.avatar)} alt={caller.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">👤</div>
            )}
          </div>
          <div>
            <p className="font-semibold">Incoming call</p>
            <p className="text-sm opacity-80">{caller?.name || 'Unknown'}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => { stopRingtone(); onAccept?.(); }} className="flex-1 bg-green-600 hover:bg-green-700 rounded py-2">Accept</button>
          <button onClick={() => { stopRingtone(); onDecline?.(); }} className="flex-1 bg-red-600 hover:bg-red-700 rounded py-2">Decline</button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;


