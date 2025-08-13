import React from 'react';
import { FaPhone } from 'react-icons/fa';

const AudioCallButton = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Start Audio Call"
      className="p-2 rounded-full hover:bg-gray-700 text-white"
      aria-label="Start Audio Call"
    >
      <FaPhone />
    </button>
  );
};

export default AudioCallButton;


