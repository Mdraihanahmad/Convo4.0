import express from 'express';
import isAuthenticated from '../middleware/isAuthenticated.js';
import { upload } from '../middleware/upload.js';
import { createStatus, uploadMediaStatus, getStatuses, deleteStatus, markViewed } from '../controllers/statusController.js';

const router = express.Router();

// Text status
router.post('/', isAuthenticated, createStatus);
// Media status
router.post('/media', isAuthenticated, upload.single('file'), uploadMediaStatus);
// Get all recent statuses
router.get('/', isAuthenticated, getStatuses);
// Mark a specific status as viewed
router.post('/:id/view', isAuthenticated, markViewed);
// Delete own status
router.delete('/:id', isAuthenticated, deleteStatus);

export default router;


