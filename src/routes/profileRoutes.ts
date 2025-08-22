import express from "express";
import {
  updatePhoneAndSendOTP,
  verifyPhoneOTP,
  setPin,
  verifyPin,
  updatePassword,
  updateProfile,
} from "../controllers/profileController";
import { auth } from "../middleware/auth";
import { getMe } from "../controllers/authController";

const router = express.Router();

// Get user profile
router.get("/me", auth, getMe);

// All profile routes require authentication
router.use(auth);

// Profile management routes
router.put("/", updateProfile);
router.post("/phone", updatePhoneAndSendOTP);
router.post("/verify-phone", verifyPhoneOTP);
router.post("/pin", setPin);
router.post("/verify-pin", verifyPin);
router.put("/password", updatePassword);

export default router;
