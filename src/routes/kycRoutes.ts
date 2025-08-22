import express from "express";
import { auth } from "../middleware/auth";
import {
  submitBasicDetails,
  submitRiskProfiling,
  submitCapitalManagement,
  submitExperience,
  getKYCStatus,
} from "../controllers/kycController";

const router = express.Router();

// KYC routes
router.post("/basic-details", auth, submitBasicDetails);
router.post("/risk-profiling", auth, submitRiskProfiling);
router.post("/capital-management", auth, submitCapitalManagement);
router.post("/experience", auth, submitExperience);
router.get("/status", auth, getKYCStatus);

export default router;
