import express from "express";
// import { auth } from "../middleware/auth";
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
import validate from "../middleware/validate";
import { body, param } from "express-validator";

const router = express.Router();

// All signal routes require authentication
// router.use(auth);

// Signal routes
router.post(
  "/",
  body("entryTime")
    .notEmpty()
    .withMessage("Entry time is required")
    .isISO8601()
    .withMessage("Entry time must be a valid date"),
  body("entryPrice")
    .notEmpty()
    .withMessage("Entry price is required")
    .isFloat({ min: 0 })
    .withMessage("Entry price must be a positive number"),
  body("direction")
    .notEmpty()
    .withMessage("Direction is required")
    .isIn(["buy", "sell", "long", "short"])
    .withMessage("Direction must be one of: buy, sell, long, short"),
  body("userId")
    .optional()
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ID"),
  body("botId")
    .optional()
    .isMongoId()
    .withMessage("Bot ID must be a valid MongoDB ID"),
  body("lotSize")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Lot size must be a positive number"),
  body("stopLossPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Stop loss price must be a positive number"),
  body("targetPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Target price must be a positive number"),
  validate,
  createSignal
);
router.post(
  "/bulk",
  body("signals")
    .isArray({ min: 1 })
    .withMessage("Signals must be a non-empty array"),
  body("signals.*.entryTime")
    .notEmpty()
    .withMessage("Entry time is required for all signals")
    .isISO8601()
    .withMessage("Entry time must be a valid date"),
  body("signals.*.entryPrice")
    .notEmpty()
    .withMessage("Entry price is required for all signals")
    .isFloat({ min: 0 })
    .withMessage("Entry price must be a positive number"),
  body("signals.*.direction")
    .notEmpty()
    .withMessage("Direction is required for all signals")
    .isIn(["buy", "sell", "long", "short"])
    .withMessage("Direction must be one of: buy, sell, long, short"),
  validate,
  createBulkSignals
);
router.get("/", getAllSignals);
router.get("/user", getUserSignals);
router.get(
  "/:id",
  param("id").isMongoId().withMessage("Please provide a valid signal ID"),
  validate,
  getSignalById
);
router.put(
  "/:id",
  param("id").isMongoId().withMessage("Please provide a valid signal ID"),
  body("entryTime")
    .optional()
    .isISO8601()
    .withMessage("Entry time must be a valid date"),
  body("entryPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Entry price must be a positive number"),
  body("direction")
    .optional()
    .isIn(["buy", "sell", "long", "short"])
    .withMessage("Direction must be one of: buy, sell, long, short"),
  body("exitTime")
    .optional()
    .isISO8601()
    .withMessage("Exit time must be a valid date"),
  body("exitPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Exit price must be a positive number"),
  body("profitLoss")
    .optional()
    .isFloat()
    .withMessage("Profit/Loss must be a number"),
  validate,
  updateSignal
);
router.delete(
  "/:id",
  param("id").isMongoId().withMessage("Please provide a valid signal ID"),
  validate,
  deleteSignal
);
router.get(
  "/bot/:botId",
  param("botId").isMongoId().withMessage("Please provide a valid bot ID"),
  validate,
  getSignalsByBot
);

export default router;
