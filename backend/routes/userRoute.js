import express from "express";
import { acceptFriendRequest, declineFriendRequest, getFriendRequests, getOtherUsers, getUserProfile, login, logout, register, sendFriendRequest, updateProfilePhoto, blockUser, unblockUser, unfriendUser } from "../controllers/userController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/").get(isAuthenticated,getOtherUsers);

// Friend request routes
router.route("/friend-request/:userId").post(isAuthenticated, sendFriendRequest);
router.route("/friend-request/:userId/accept").post(isAuthenticated, acceptFriendRequest);
router.route("/friend-request/:userId/decline").post(isAuthenticated, declineFriendRequest);
router.route("/friend-requests").get(isAuthenticated, getFriendRequests);
router.route("/profile").get(isAuthenticated, getUserProfile);
router.route("/profile/photo").post(isAuthenticated, upload.single("photo"), updateProfilePhoto);
router.route('/block/:contactId').post(isAuthenticated, blockUser);
router.route('/unblock/:contactId').post(isAuthenticated, unblockUser);
router.route('/unfriend/:contactId').post(isAuthenticated, unfriendUser);

export default router;