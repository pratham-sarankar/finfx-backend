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
import validate from "../middleware/validate";
import { body, param } from "express-validator";

const router = express.Router();

// All bot routes require authentication
router.use(auth);

// Bot CRUD routes
router.post(
  "/", 
  body("name")
    .notEmpty()
    .withMessage("Bot name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Bot name must be between 2 and 100 characters"),
  body("description")
    .notEmpty()
    .withMessage("Bot description is required")
    .isLength({ min: 10, max: 500 })
    .withMessage("Bot description must be between 10 and 500 characters"),
  body("recommendedCapital")
    .notEmpty()
    .withMessage("Recommended capital is required")
    .isFloat({ min: 0 })
    .withMessage("Recommended capital must be a positive number"),
  body("performanceDuration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Performance duration must be a positive integer"),
  body("currency")
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-character code"),
  body("script")
    .optional()
    .isString()
    .withMessage("Script must be a string"),
  validate,
  createBot
);
router.get("/", getAllBots);
router.get("/subscribed", getSubscribedBots);
router.get(
  "/:id", 
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid bot ID"),
  validate,
  getBotById
);
router.get(
  "/:id/subscribers", 
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid bot ID"),
  validate,
  getBotSubscribers
);
router.get(
  "/:id/performance-overview", 
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid bot ID"),
  validate,
  getBotPerformanceOverview
);
router.put(
  "/:id", 
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid bot ID"),
  body("name")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Bot name must be between 2 and 100 characters"),
  body("description")
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage("Bot description must be between 10 and 500 characters"),
  body("recommendedCapital")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Recommended capital must be a positive number"),
  body("performanceDuration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Performance duration must be a positive integer"),
  body("currency")
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-character code"),
  body("script")
    .optional()
    .isString()
    .withMessage("Script must be a string"),
  validate,
  updateBot
);
router.delete(
  "/:id", 
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid bot ID"),
  validate,
  deleteBot
);

export default router;
