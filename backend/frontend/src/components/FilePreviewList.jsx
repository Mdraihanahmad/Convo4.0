import React from 'react';
import { MdClose } from 'react-icons/md';

const FilePreviewList = ({ files, onRemove }) => {
  if (!files || files.length === 0) return null;
  return (
    <div className='flex gap-2 flex-wrap'>
      {files.map((f, idx) => (
        <div key={idx} className='relative w-16 h-16 bg-gray-700 rounded overflow-hidden flex items-center justify-center'>
          {f.type?.startsWith('image/') && <img alt={f.name} src={URL.createObjectURL(f)} className='w-full h-full object-cover' />}
          {f.type?.startsWith('video/') && (
            <video className='w-full h-full object-cover'>
              <source src={URL.createObjectURL(f)} type={f.type} />
            </video>
          )}
          {!f.type?.startsWith('image/') && !f.type?.startsWith('video/') && (
            <div className='text-[10px] p-1 text-white text-center break-words'>{f.name}</div>
          )}
          <button type='button' className='absolute -top-2 -right-2 bg-red-600 rounded-full p-1' onClick={() => onRemove && onRemove(idx)}>
            <MdClose size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default FilePreviewList;


