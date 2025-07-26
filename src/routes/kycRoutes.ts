

import express from "express";
import { auth } from "../middleware/auth";
import {
  submitBasicDetails,
  submitRiskProfiling,
  submitCapitalManagement,
  submitExperience,
  getKycStatus,
} from "../controllers/kycController";

const router = express.Router();

// All KYC routes are private
router.use(auth);

router.post("/basic-details", submitBasicDetails);
router.post("/risk-profiling", submitRiskProfiling);
router.post("/capital-management", submitCapitalManagement);
router.post("/experience", submitExperience);
router.get("/status", getKycStatus);

export default router;
