/**
 * Subscription Controller
 * Handles bot subscription management for users
 * Manages subscription lifecycle including creation, updates, and status changes
 */
import { Request, Response, NextFunction } from "express";
import BotSubscription from "../models/BotSubscription";
import BotPackage from "../models/BotPackage";
import Package from "../models/Package";
import { AppError } from "../middleware/errorHandler";

/**
 * Create a new bot subscription for the authenticated user
 * @route POST /api/subscriptions
 * @access Private
 * @param {Request} req - Express request object containing botId, botPackageId, and lotSize
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with created subscription data
 * @throws {AppError} 409 - User already has an active subscription for this bot
 * @throws {AppError} 404 - Bot package or package not found
 * @description Creates a new subscription for a user to a specific bot with package duration
 */
export async function createSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { botId, botPackageId, lotSize } = req.body;

    // Fetch the bot package to get the package ID and validate existence
    const botPackage = await BotPackage.findById(botPackageId);
    if (!botPackage) {
      throw new AppError("Bot package not found", 404, "bot-package-not-found");
    }

    // Fetch the package details to get duration information
    const packageDetails = await Package.findById(botPackage.packageId);
    if (!packageDetails) {
      throw new AppError("Package not found", 404, "package-not-found");
    }

    // Calculate expiresAt date by adding duration days to current date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + packageDetails.duration);

    // Create new subscription (validation for active subscriptions is handled in the model pre-save hook)
    const subscription = await BotSubscription.create({
      userId: req.user._id,
      botId,
      botPackageId,
      lotSize,
      expiresAt,
    });

    res.status(201).json({
      status: "success",
      message: "Successfully subscribed to bot",
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user's bot subscriptions
 * @route GET /api/subscriptions?status=active
 * @access Private
 * @param {Request} req - Express request object with optional status query parameter
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with user's subscriptions
 * @description Retrieves all subscriptions for the authenticated user, optionally filtered by status
 */
export async function getUserSubscriptions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { status } = req.query;

    // Build query for user's subscriptions
    const query: any = { userId: req.user._id };
    if (status) {
      query.status = status; // Filter by status if provided
    }

    // Fetch subscriptions with populated bot details, sorted by subscription date
    const subscriptions = await BotSubscription.find(query)
      .populate("bot")
      .sort({ subscribedAt: -1 });

    res.status(200).json({
      status: "success",
      data: subscriptions,
    });
  } catch (error) {
    next(error);
  }
}
