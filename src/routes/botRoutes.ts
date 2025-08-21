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
  getBotPerformanceOverview,
} from "../controllers/botController";

const router = express.Router();

// All bot routes require authentication
router.use(auth);

// Bot CRUD routes
router.post("/", createBot);
router.get("/", getAllBots);
router.get("/subscribed", getSubscribedBots);
router.get("/:id", getBotById);
router.get("/:id/subscribers", getBotSubscribers);
router.get("/:id/performance-overview", getBotPerformanceOverview);
router.put("/:id", updateBot);
router.delete("/:id", deleteBot);

export default router;
