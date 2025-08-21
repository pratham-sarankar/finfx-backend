import express from "express";
import { auth } from "../middleware/auth";
import {
  createSignal,
  createBulkSignals,
  getAllSignals,
  getUserSignals,
  getSignalById,
  updateSignal,
  deleteSignal,
  getSignalsByBot,
} from "../controllers/signalController";

const router = express.Router();

// All signal routes require authentication
router.use(auth);

// Signal routes
router.post("/", createSignal);
router.post("/bulk", createBulkSignals);
router.get("/", getAllSignals);
router.get("/user", getUserSignals);
router.get("/:id", getSignalById);
router.put("/:id", updateSignal);
router.delete("/:id", deleteSignal);
router.get("/bot/:botId", getSignalsByBot);

export default router;
