import React, { useEffect, useRef } from 'react';

const VideoTile = ({ stream, isLocal, muted = false, label = '' }) => {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <div className="relative bg-black rounded overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted={isLocal || muted} className="w-full h-full object-cover" />
      {label && (
        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">{label}</div>
      )}
    </div>
  );
};

export default VideoTile;


