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
 * Create a new bot subscription for the authenticated user or any user (admin only)
 * @route POST /api/subscriptions
 * @access Private
 * @param {Request} req - Express request object containing botId, botPackageId, lotSize, and optional userId (admin only)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with created subscription data
 * @throws {AppError} 409 - User already has an active subscription for this bot
 * @throws {AppError} 404 - Bot package or package not found
 * @throws {AppError} 403 - Insufficient permissions (non-admin trying to create for another user)
 * @description Creates a new subscription for a user to a specific bot with package duration
 */
export async function createSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { botId, botPackageId, lotSize, userId } = req.body;

    // Determine the target user ID
    let targetUserId = req.user._id;
    
    // If userId is provided in request body (admin creating for another user)
    if (userId) {
      // Only admin can create subscriptions for other users
      if (req.user.role !== 'admin') {
        throw new AppError(
          "Only administrators can create subscriptions for other users",
          403,
          "admin-required"
        );
      }
      targetUserId = userId;
    }

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
      userId: targetUserId,
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
 * Get user's bot subscriptions or all subscriptions (admin only)
 * @route GET /api/subscriptions?status=active&userId=xxx (admin only)
 * @access Private
 * @param {Request} req - Express request object with optional status and userId query parameters
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with user's subscriptions
 * @description Retrieves subscriptions for the authenticated user, or for a specific user if admin
 */
export async function getUserSubscriptions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { status, userId } = req.query;

    // Determine the target user ID
    let targetUserId = req.user._id;
    
    // If userId is provided in query (admin viewing another user's subscriptions)
    if (userId) {
      // Only admin can view other users' subscriptions
      if (req.user.role !== 'admin') {
        throw new AppError(
          "Only administrators can view other users' subscriptions",
          403,
          "admin-required"
        );
      }
      targetUserId = userId;
    }

    // Build query for user's subscriptions
    const query: any = { userId: targetUserId };
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
