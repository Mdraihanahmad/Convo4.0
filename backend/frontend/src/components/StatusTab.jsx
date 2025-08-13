import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { BASE_URL } from '..';
import { setStatuses } from '../redux/statusSlice';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/image';

const ringClass = (seen) => seen ? 'ring-gray-500' : 'ring-green-500';

const StatusTab = () => {
  const { authUser } = useSelector(s => s.user);
  const { contacts, my } = useSelector(s => s.status);
  const dispatch = useDispatch();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [text, setText] = useState('');
  const [bg, setBg] = useState('#0f172a');
  const [color, setColor] = useState('#ffffff');
  const fileRef = useRef(null);

  const friendIds = useSelector(s => s.user.friends) || [];
  useEffect(() => {
    (async () => {
      try {
        axios.defaults.withCredentials = true;
        const res = await axios.get(`${BASE_URL}/api/v1/status`);
        const list = (res.data || []).map(s => ({ ...s, isMine: String(s.userId?._id) === String(authUser?._id) }));
        dispatch(setStatuses(list));
      } catch (e) {
        console.log(e); toast.error('Failed to load statuses');
      }
    })();
  }, [authUser?._id, dispatch, friendIds.join(',')]);

  const groups = useMemo(() => {
    const arr = Object.entries(contacts || {}).filter(([uid]) => uid !== String(authUser?._id));
    return arr.map(([uid, list]) => ({ user: list[0]?.userId, list }));
  }, [contacts, authUser?._id]);

  const submitText = async () => {
    try {
      const payload = { type: 'text', content: text, textStyle: { bgColor: bg, textColor: color } };
      const res = await axios.post(`${BASE_URL}/api/v1/status`, payload, { withCredentials: true });
      setUploadOpen(false); setText('');
      dispatch(setStatuses([...(my||[]), { ...res.data, isMine: true }]))
      toast.success('Status posted');
    } catch (e) { toast.error('Failed to post'); }
  };

  const submitMedia = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const form = new FormData(); form.append('file', f);
      const res = await axios.post(`${BASE_URL}/api/v1/status/media`, form, { withCredentials: true });
      setUploadOpen(false); if (fileRef.current) fileRef.current.value = '';
      dispatch(setStatuses([...(my||[]), { ...res.data, isMine: true }]))
      toast.success('Status posted');
    } catch (err) { toast.error('Upload failed'); }
  };

  const openViewer = (user, list) => {
    const ev = new CustomEvent('status:view', { detail: { user, list } });
    window.dispatchEvent(ev);
  };

  const deleteStatus = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/api/v1/status/${id}`, { withCredentials: true });
      toast.success('Deleted');
      // refresh after delete
      const q = friendIds.length ? `?friends=${friendIds.join(',')}` : '';
      const res = await axios.get(`${BASE_URL}/api/v1/status${q}`);
      const list = (res.data || []).map(s => ({ ...s, isMine: String(s.userId?._id) === String(authUser?._id) }));
      dispatch(setStatuses(list));
    } catch (e) { toast.error('Failed to delete'); }
  }

  return (
    <div className='p-3 text-white'>
      {/* My Status */}
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-3'>
          <div className='w-12 h-12 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-gray-900 ring-green-500'>
            <img src={getImageUrl(authUser?.profilePhoto)} alt='me' className='w-full h-full object-cover' />
          </div>
          <div>
            <div className='font-semibold'>My Status</div>
            <div className='text-xs text-gray-400'>Tap to add status update</div>
          </div>
        </div>
        <button className='btn btn-sm bg-green-600' onClick={() => setUploadOpen(true)}>+ Add</button>
      </div>

      {/* My statuses list with delete & viewers count */}
      {my?.length > 0 && (
        <div className='mt-4'>
          <div className='text-sm text-gray-400 mb-2'>My updates</div>
          <div className='space-y-2'>
            {my.map(s => (
              <div key={s._id} className='flex items-center justify-between bg-gray-800 rounded p-2'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded overflow-hidden'>
                    {s.type === 'image' ? (
                      <img src={getImageUrl(s.content)} alt='' className='w-full h-full object-cover' />
                    ) : s.type === 'video' ? (
                      <div className='w-full h-full bg-black/50 flex items-center justify-center text-xs'>Video</div>
                    ) : (
                      <div className='w-full h-full flex items-center justify-center text-xs' style={{ background: s.textStyle?.bgColor, color: s.textStyle?.textColor }}>Text</div>
                    )}
                  </div>
                  <div>
                    <div className='text-sm'>{new Date(s.createdAt).toLocaleString()}</div>
                    <div className='text-xs text-gray-400'>{(s.viewers||[]).length} views</div>
                  </div>
                </div>
                <div className='flex gap-2'>
                  <button className='btn btn-xs' onClick={() => openViewer(authUser, [s])}>View</button>
                  <button className='btn btn-xs bg-red-600' onClick={() => deleteStatus(s._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contacts */}
      <div className='mt-4'>
        <div className='text-sm text-gray-400 mb-2'>Recent updates</div>
        <div className='space-y-3'>
          {groups.map(({ user, list }) => {
            const unseen = list.some(s => !(s.viewers||[]).some(v => v.userId === authUser?._id));
            return (
              <div key={user._id} className='flex items-center gap-3 cursor-pointer' onClick={() => openViewer(user, list)}>
                <div className={`w-12 h-12 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-gray-900 ${ringClass(!unseen)}`}>
                  <img src={getImageUrl(user.profilePhoto)} alt={user.fullName} className='w-full h-full object-cover' />
                </div>
                <div>
                  <div className='font-medium'>{user.fullName}</div>
                  <div className='text-xs text-gray-400'>{new Date(list[0].createdAt).toLocaleString()}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {uploadOpen && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50'>
          <div className='bg-gray-800 rounded-lg p-4 w-96 max-w-[90vw]'>
            <div className='font-semibold mb-2'>New Status</div>
            <div className='space-y-2'>
              <div className='border rounded p-2' style={{ background: bg, color }}>
                <textarea value={text} onChange={(e)=>setText(e.target.value)} className='w-full bg-transparent outline-none' placeholder='Type a status...' />
              </div>
              <div className='flex gap-2'>
                <input type='color' value={bg} onChange={e=>setBg(e.target.value)} title='Background'/>
                <input type='color' value={color} onChange={e=>setColor(e.target.value)} title='Text color'/>
                <button className='btn btn-xs' onClick={submitText}>Post Text</button>
                <input ref={fileRef} type='file' accept='image/*,video/*' onChange={submitMedia} />
              </div>
            </div>
            <div className='text-right mt-3'>
              <button className='btn btn-sm' onClick={()=>setUploadOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusTab;


