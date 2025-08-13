import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '..';
import { getImageUrl } from '../utils/image';

const Progress = ({ current, total }) => (
  <div className='absolute top-0 left-0 right-0 flex gap-1 p-2'>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className='flex-1 h-1 bg-white/30 rounded'>
        {i === current && <div className='h-1 bg-white rounded animate-[grow_4s_linear_forwards]'></div>}
      </div>
    ))}
    <style>{`@keyframes grow { from { width: 0% } to { width: 100% } }`}</style>
  </div>
);

const StatusViewer = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const onOpen = (e) => {
      setUser(e.detail.user);
      setList(e.detail.list || []);
      setIdx(0);
      setOpen(true);
    };
    window.addEventListener('status:view', onOpen);
    return () => window.removeEventListener('status:view', onOpen);
  }, []);

  useEffect(() => {
    if (!open || !list[idx]) return;
    const s = list[idx];
    axios.post(`${BASE_URL}/api/v1/status/${s._id}/view`, {}, { withCredentials: true }).catch(()=>{});
    const t = setTimeout(() => next(), 4000);
    return () => clearTimeout(t);
  }, [open, idx, list]);

  const next = () => {
    if (idx < list.length - 1) setIdx(idx + 1);
    else setOpen(false);
  };
  const prev = () => { if (idx > 0) setIdx(idx - 1); };

  if (!open) return null;
  const s = list[idx];
  return (
    <div className='fixed inset-0 bg-black/90 z-50 text-white flex items-center justify-center'>
      <div className='absolute inset-0' onClick={()=>setOpen(false)} />
      <div className='relative w-full h-full md:w-[480px] md:h-[800px] bg-black flex items-center justify-center'>
        <Progress current={idx} total={list.length} />
        {s.type === 'text' ? (
          <div className='w-full h-full flex items-center justify-center p-6 text-2xl font-semibold text-center' style={{ background: s.textStyle?.bgColor, color: s.textStyle?.textColor }}>
            {s.content}
          </div>
        ) : s.type === 'image' ? (
          <img src={getImageUrl(s.content)} alt='' className='max-w-full max-h-full object-contain' />
        ) : (
          <video src={getImageUrl(s.content)} autoPlay muted controls className='max-w-full max-h-full' />
        )}
        <div className='absolute inset-y-0 left-0 w-1/3' onClick={prev} />
        <div className='absolute inset-y-0 right-0 w-1/3' onClick={next} />
        <button className='absolute top-2 right-2 bg-black/50 px-3 py-1 rounded' onClick={()=>setOpen(false)}>Close</button>
      </div>
    </div>
  );
};

export default StatusViewer;


