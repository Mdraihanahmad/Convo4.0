import express from "express";
import { getMessage, sendMessage, editMessage } from "../controllers/messageController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.route("/send/:id").post(isAuthenticated, upload.array('attachments', 10), sendMessage);
router.route("/:id").get(isAuthenticated, getMessage);
router.route("/edit/:messageId").put(isAuthenticated, editMessage);

export default router;