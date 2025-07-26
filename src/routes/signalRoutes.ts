
import express from "express";
import {
  createSignal,
  createSignalsInBulk,
  getSignalById,
  updateSignalById,
  deleteSignalById,
  getSignalsByBot,
  getAllSignals,
  getUserSignals,
} from "../controllers/signalController";
import { auth } from "../middleware/auth";

const router = express.Router();

router.use(auth);

/**
 * @route   POST /api/signals
 * @desc    Create a single signal
 * @access  Private
 */
router.post("/", createSignal);

/**
 * @route   POST /api/signals/bulk
 * @desc    Create multiple signals in bulk
 * @access  Private
 */
router.post("/bulk", createSignalsInBulk);

/**
 * @route   GET /api/signals/:id
 * @desc    Get a signal by ID
 * @access  Private
 */
router.get("/:id", getSignalById);

/**
 * @route   PUT /api/signals/:id
 * @desc    Update a signal by ID
 * @access  Private
 */
router.put("/:id", updateSignalById);

/**
 * @route   DELETE /api/signals/:id
 * @desc    Delete a signal by ID
 * @access  Private
 */
router.delete("/:id", deleteSignalById);

/**
 * @route   GET /api/signals/bot/:botId
 * @desc    Get all signals for a specific bot
 * @access  Private
 */
router.get("/bot/:botId", getSignalsByBot);

/**
 * @route   GET /api/signals
 * @desc    Get all signals (with filters, pagination, analytics)
 * @access  Private
 */
router.get("/", getAllSignals);

/**
 * @route   GET /api/signals/user
 * @desc    Get all signals for bots the user is subscribed to
 * @access  Private
 */
router.get("/user", getUserSignals);

export default router;
