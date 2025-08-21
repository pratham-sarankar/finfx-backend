/**
 * Bot Package Routes
 * Defines API endpoints for bot-package association management
 * Handles pricing configurations for specific bot and package combinations
 * All routes require authentication
 */
import express from "express";
import {
  createBotPackage,
  getBotPackages,
  getBotPackageById,
  updateBotPackage,
  deleteBotPackage,
  getBotPackageByBotId
} from "../controllers/botPackageController";
import { auth } from "../middleware/auth";

const router = express.Router();

// Apply authentication middleware to all bot package routes
router.use(auth);

/**
 * @route GET /api/botPackages
 * @desc Get all bot packages with populated bot and package details
 * @access Private
 */
router.get("/", getBotPackages);

/**
 * @route GET /api/botPackages/bot/:botId
 * @desc Get all packages available for a specific bot
 * @access Private
 */
router.get("/bot/:botId", getBotPackageByBotId);

/**
 * @route GET /api/botPackages/id/:id
 * @desc Get a specific bot package by its ID
 * @access Private
 */
router.get("/id/:id", getBotPackageById);

/**
 * @route POST /api/botPackages
 * @desc Create a new bot package association with pricing
 * @access Private
 */
router.post("/", createBotPackage);

/**
 * @route PUT /api/botPackages/:id
 * @desc Update the price of an existing bot package
 * @access Private
 */
router.put("/:id", updateBotPackage);

/**
 * @route DELETE /api/botPackages/:id
 * @desc Delete a bot package association
 * @access Private
 */
router.delete("/:id", deleteBotPackage);

export default router;
