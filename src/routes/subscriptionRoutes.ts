import express from "express";
import { auth } from "../middleware/auth";
import { requireUser } from "../middleware/rbac";
import { AppError } from "../middleware/errorHandler";
import BotSubscription from "../models/BotSubscription";
import Bot from "../models/Bot";
import validate from "../middleware/validate";
import { body, query, param } from "express-validator";
import * as SubscriptionController from "../controllers/subscriptionController";

const router = express.Router();

// All subscription routes require authentication
router.use(auth);
router.use(requireUser);

// /**
//  * @route POST /api/subscriptions
//  * @desc Subscribe to a bot (users for themselves, admins for anyone)
//  * @access Private
//  */
// router.post(
//   "/",
//   body("botId")
//     .notEmpty()
//     .withMessage("Bot ID is required")
//     .isMongoId()
//     .withMessage("botId should be valid MongoDB ID."),
//   body("botPackageId")
//     .notEmpty()
//     .withMessage("Bot Package ID is required")
//     .isMongoId()
//     .withMessage("botPackageId should be valid MongoDB ID."),
//   body("lotSize").notEmpty().withMessage("Lot Size is required"),
//   body("lotSize")
//     .isFloat({ min: 0.01 })
//     .withMessage("Lot Size must be at least 0.01"),
//   body("userId")
//     .optional()
//     .isMongoId()
//     .withMessage("userId should be valid MongoDB ID."),
//   validate,
//   SubscriptionController.createSubscription
// );

/**
 * @route GET /api/subscriptions
 * @desc Get subscriptions with pagination and filters
 * @access Private (user sees own, admin sees all or specific user)
 */
router.get(
  "/",
  query("n")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Items per page must be between 1 and 100"),
  query("p")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page number must be at least 1"),
  query("status")
    .optional()
    .isIn(["active", "paused", "expired"])
    .withMessage("Status must be one of 'active', 'paused', or 'expired'"),
  query("userId")
    .optional()
    .isMongoId()
    .withMessage("userId should be valid MongoDB ID."),
  validate,
  SubscriptionController.getUserSubscriptions
);


/**
 * @route GET /api/subscriptions
 * @desc Get user's subscriptions (or any user's if admin)
 * @access Private
 */
router.get(
  "/",
  query("status")
    .optional()
    .isIn(["active", "paused", "expired"])
    .withMessage("Status must be one of 'active', 'paused', or 'expired'"),
  query("userId")
    .optional()
    .isMongoId()
    .withMessage("userId should be valid MongoDB ID."),
  validate,
  SubscriptionController.getUserSubscriptions
);

/**
 * @route GET /api/subscriptions/:id
 * @desc Get specific subscription (own subscription or any if admin)
 * @access Private
 */
router.get(
  "/:id", 
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid subscription ID"),
  validate,
  async (req, res, next) => {
  try {
    const { id } = req.params;

    // Build query - admin can access any subscription, users only their own
    const query: any = { _id: id };
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }

    const subscription = await BotSubscription.findOne(query)
      .populate(
        "bot",
        "name description recommendedCapital performanceDuration script"
      )
      .select("-__v");

    if (!subscription) {
      throw new AppError(
        "Subscription not found",
        404,
        "subscription-not-found"
      );
    }

    res.status(200).json({
      status: "success",
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/subscriptions/:id
 * @desc Update a subscription (status, lotSize, etc.) - own subscription or any if admin
 * @access Private
 */
router.put(
  "/:id",
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid subscription ID"),
  body("status")
    .optional()
    .isIn(["active", "paused", "expired"])
    .withMessage("Status must be one of 'active', 'paused', or 'expired'"),
  body("lotSize")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Lot Size must be a number >= 0.01"),
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, lotSize } = req.body;

      // Build query - admin can update any subscription, users only their own
      const query: any = { _id: id };
      if (req.user.role !== 'admin') {
        query.userId = req.user._id;
      }

      const subscription = await BotSubscription.findOne(query);

      if (!subscription) {
        throw new AppError("Subscription not found", 404, "not-found");
      }

      const updateFields: any = {};
      if (status) updateFields.status = status;
      if (lotSize) updateFields.lotSize = lotSize;

      const updatedSubscription = await BotSubscription.findByIdAndUpdate(
        id,
        updateFields,
        { new: true }
      );

      const transformed = {
        ...updatedSubscription!.toObject(),
        id: updatedSubscription!._id,
      };
      delete transformed._id;
      res.status(200).json({
        status: "success",
        message: "Subscription updated successfully",
        data: transformed,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route GET /api/subscriptions/check/:botId
 * @desc Check if user is subscribed to a specific bot
 * @access Private
 */
router.get(
  "/check/:botId", 
  param("botId")
    .isMongoId()
    .withMessage("Please provide a valid bot ID"),
  validate,
  async (req, res, next) => {
  try {
    const { botId } = req.params;

    // Check if bot exists
    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Check if user is subscribed to this bot
    const subscription = await BotSubscription.findOne({
      userId: req.user._id,
      botId: botId,
    });

    const isSubscribed = Boolean(
      subscription && subscription.status === "active"
    );

    res.status(200).json({
      status: "success",
      data: {
        botId: botId,
        isSubscribed: isSubscribed,
        subscription: subscription
          ? {
              id: subscription._id,
              status: subscription.status,
              subscribedAt: subscription.subscribedAt,
              expiresAt: subscription.expiresAt,
              cancelledAt: subscription.cancelledAt,
              botPackageId: subscription.botPackageId,
              lotSize: subscription.lotSize,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/subscriptions/:id
 * @desc Delete a subscription (permanent removal) - own subscription or any if admin
 * @access Private
 */
router.delete(
  "/:id", 
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid subscription ID"),
  validate,
  async (req, res, next) => {
  try {
    const { id } = req.params;

    // Build query - admin can delete any subscription, users only their own
    const query: any = { _id: id };
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }

    const subscription = await BotSubscription.findOneAndDelete(query);

    if (!subscription) {
      throw new AppError(
        "Subscription not found",
        404,
        "subscription-not-found"
      );
    }

    res.status(200).json({
      status: "success",
      message: "Subscription deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
