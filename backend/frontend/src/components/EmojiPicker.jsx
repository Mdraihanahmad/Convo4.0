import React from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const EmojiPicker = ({ onSelect, onClose }) => {
  return (
    <div className="bg-gray-800 p-1 rounded shadow-lg">
      <Picker
        data={data}
        onEmojiSelect={(emoji) => onSelect && onSelect({ native: emoji.native || '' })}
        theme="dark"
      />
      {onClose && (
        <div className='text-right pr-2 pb-1'>
          <button className='text-xs text-gray-300 underline' onClick={onClose}>Close</button>
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;


