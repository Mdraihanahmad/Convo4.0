import React, { useRef, useState } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthUser } from '../redux/userSlice';
import { BASE_URL } from '..';
import toast from 'react-hot-toast';

const ProfilePhotoUploader = () => {
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const { authUser } = useSelector(state => state.user);
  const dispatch = useDispatch();

  const handleClick = () => inputRef.current?.click();

  const captureFromCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('Camera not supported');
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = mediaStream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      mediaStream.getTracks().forEach(t => t.stop());
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      const file = new File([blob], 'camera.jpg', { type: 'image/jpeg' });
      await uploadFile(file);
    } catch (e) {
      console.log(e);
      toast.error('Camera unavailable');
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large (max 5MB)');
      return;
    }
    // Client-side compression via canvas if larger than ~1MB
    let uploadBlob = file;
    if (file.size > 1024 * 1024) {
      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        const maxSize = 800; // downscale
        const scale = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        uploadBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      } catch (e) {
        console.log('Compression skipped:', e);
      }
    }
    const form = new FormData();
    form.append('photo', uploadBlob, file.name.replace(/\.[^.]+$/, '.jpg'));
    try {
      setIsUploading(true);
      const res = await axios.post(`${BASE_URL}/api/v1/user/profile/photo`, form, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res?.data?.user) {
        dispatch(setAuthUser(res.data.user));
        toast.success('Profile photo updated');
      }
    } catch (err) {
      console.log(err);
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const photoUrl = authUser?.profilePhoto?.startsWith('http')
    ? authUser.profilePhoto
    : authUser?.profilePhoto
      ? `${BASE_URL}${authUser.profilePhoto.startsWith('/') ? '' : '/'}${authUser.profilePhoto}`
      : '';

  return (
    <div className="flex items-center gap-3 mb-3">
      <div
        className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 border border-gray-600"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        title="Drag & drop to upload"
      >
        {photoUrl ? (
          <img src={photoUrl} alt="Your avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No DP</div>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <button onClick={handleClick} disabled={isUploading} className="btn btn-xs bg-zinc-700 text-white">
          Change Photo
        </button>
        {isUploading && <span className="text-xs text-gray-300">Uploading...</span>}
        <button onClick={captureFromCamera} disabled={isUploading} className="btn btn-xs bg-gray-700 text-white">
          Camera
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} hidden />
      </div>
    </div>
  );
};

export default ProfilePhotoUploader;


