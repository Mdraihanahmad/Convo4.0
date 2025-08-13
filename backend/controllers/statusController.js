import { Status } from '../models/statusModel.js';
import { User } from '../models/userModel.js';
import { getReceiverSocketId, io } from '../socket/socket.js';

export const createStatus = async (req, res) => {
  try {
    const userId = req.id;
    const { type, content, textStyle } = req.body;
    if (!type || !content) return res.status(400).json({ message: 'Missing fields' });
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const status = await Status.create({ userId, type, content, textStyle, expiry });
    // notify friends
    const me = await User.findById(userId).select('friends fullName profilePhoto');
    (me?.friends || []).forEach(fid => {
      const sid = getReceiverSocketId(String(fid));
      if (sid) io.to(sid).emit('notify', {
        type: 'status',
        senderId: userId,
        senderName: me.fullName,
        avatarURL: me.profilePhoto,
        messagePreview: 'updated their status',
        timestamp: Date.now()
      });
    });
    return res.status(201).json(status);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const uploadMediaStatus = async (req, res) => {
  try {
    const userId = req.id;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file' });
    const type = file.mimetype.startsWith('video') ? 'video' : 'image';
    const content = `/uploads/${file.filename}`;
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const status = await Status.create({ userId, type, content, expiry });
    return res.status(201).json(status);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getStatuses = async (req, res) => {
  try {
    const userId = req.id;
    // Only show my statuses and friends' statuses
    const now = new Date();
    // Enforce server-side friend filtering regardless of query params
    const me = await User.findById(userId).select('friends');
    const allowIds = [userId, ...(me?.friends || [])];
    const statuses = await Status.find({ expiry: { $gt: now }, userId: { $in: allowIds } })
      .populate('userId', '-password')
      .sort({ createdAt: -1 });
    return res.status(200).json(statuses);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const markViewed = async (req, res) => {
  try {
    const userId = req.id;
    const { id } = req.params;
    const status = await Status.findById(id);
    if (!status) return res.status(404).json({ message: 'Not found' });
    // Authorization: only the owner and the owner's friends can view
    if (String(status.userId) !== String(userId)) {
      const me = await User.findById(userId).select('friends');
      const isFriend = (me?.friends || []).some(fid => String(fid) === String(status.userId));
      if (!isFriend) return res.status(403).json({ message: 'Not allowed' });
    }
    const already = status.viewers.some(v => String(v.userId) === String(userId));
    if (!already) status.viewers.push({ userId, viewedAt: new Date() });
    await status.save();
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const deleteStatus = async (req, res) => {
  try {
    const userId = req.id;
    const { id } = req.params;
    const status = await Status.findById(id);
    if (!status) return res.status(404).json({ message: 'Not found' });
    if (String(status.userId) !== String(userId)) return res.status(403).json({ message: 'Not allowed' });
    await status.deleteOne();
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: 'Server error' });
  }
};


