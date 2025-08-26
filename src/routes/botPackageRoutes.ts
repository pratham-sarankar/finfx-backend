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
import { requireUser } from "../middleware/rbac";
import validate from "../middleware/validate";
import { body, param, query } from "express-validator";

const router = express.Router();

// Apply authentication middleware to all bot package routes
router.use(auth);
router.use(requireUser);

/**
 * @route GET /api/botPackages
 * @desc Get all bot packages with populated bot and package details
 * @access Private
 */
router.get(
  "/",
  query("botId").optional().isMongoId().withMessage("botId should be valid MongoDB ID."),
  validate,
  getBotPackages
);

/**
 * @route GET /api/botPackages/bot/:botId
 * @desc Get all packages available for a specific bot
 * @access Private
 */
router.get(
  "/bot/:botId", 
  param("botId")
    .isMongoId()
    .withMessage("Please provide a valid bot ID"),
  validate,
  getBotPackageByBotId
);

/**
 * @route GET /api/botPackages/id/:id
 * @desc Get a specific bot package by its ID
 * @access Private
 */
router.get(
  "/id/:id", 
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid bot package ID"),
  validate,
  getBotPackageById
);

/**
 * @route POST /api/botPackages
 * @desc Create a new bot package association with pricing
 * @access Private
 */
router.post(
  "/", 
  body("botId")
    .notEmpty()
    .withMessage("Bot ID is required")
    .isMongoId()
    .withMessage("Bot ID must be a valid MongoDB ID"),
  body("packageId")
    .notEmpty()
    .withMessage("Package ID is required")
    .isMongoId()
    .withMessage("Package ID must be a valid MongoDB ID"),
  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  validate,
  createBotPackage
);

/**
 * @route PUT /api/botPackages/:id
 * @desc Update the price of an existing bot package
 * @access Private
 */
router.put(
  "/:id", 
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid bot package ID"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  validate,
  updateBotPackage
);

/**
 * @route DELETE /api/botPackages/:id
 * @desc Delete a bot package association
 * @access Private
 */
router.delete(
  "/:id", 
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid bot package ID"),
  validate,
  deleteBotPackage
);

export default router;
