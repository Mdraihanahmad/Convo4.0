import React from 'react';
import { FaVideo } from 'react-icons/fa';

const VideoCallButton = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Start Video Call"
      className="p-2 rounded-full hover:bg-gray-700 text-white"
      aria-label="Start Video Call"
    >
      <FaVideo />
    </button>
  );
};

export default VideoCallButton;


