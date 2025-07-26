import express from "express";
import { auth } from "../middleware/auth";
import {
  createBot,
  getAllBots,
  getBotById,
  getBotSubscribers,
  updateBot,
  deleteBot,
  getSubscribedBots,
  getPerformanceOverview,
} from "../controllers/botController";

const router = express.Router();

// All routes require authentication
router.use(auth);

router.post("/", createBot);
router.get("/", getAllBots);
router.get("/subscribed", getSubscribedBots);
router.get("/:id", getBotById);
router.get("/:id/subscribers", getBotSubscribers);
router.put("/:id", updateBot);
router.delete("/:id", deleteBot);
router.get("/:id/performance-overview", getPerformanceOverview);

export default router;
