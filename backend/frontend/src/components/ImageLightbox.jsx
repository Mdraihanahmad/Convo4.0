import React, { useEffect } from 'react';

const ImageLightbox = ({ src, alt = '', onClose }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose && onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!src) return null;
  const handleDownload = async () => {
    try {
      const res = await fetch(src, { credentials: 'include' });
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      // try to derive filename from URL
      let filename = 'image';
      try {
        const u = new URL(src, window.location.href);
        const last = u.pathname.split('/').pop();
        if (last) filename = last;
      } catch {}
      if (!/\.[a-zA-Z0-9]{2,5}$/.test(filename)) {
        // best effort extension
        const type = blob.type.split('/')[1] || 'jpg';
        filename = `${filename}.${type}`;
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2" onClick={(e)=>e.stopPropagation()}>
        <button
          onClick={handleDownload}
          className="text-white text-sm bg-black/40 hover:bg-black/60 rounded px-3 py-1"
          aria-label="Download image"
        >
          Download
        </button>
        <button
          onClick={onClose}
          className="text-white text-xl bg-black/40 hover:bg-black/60 rounded px-3 py-1"
          aria-label="Close image preview"
        >
          ✕
        </button>
      </div>
      <img
        src={src}
        alt={alt}
        className="max-w-[95vw] max-h-[95vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default ImageLightbox;


