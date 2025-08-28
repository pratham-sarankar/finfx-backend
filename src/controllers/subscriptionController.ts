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
    const { botId, botPackageId, lotSize, userId, status } = req.body; // status include

    let targetUserId = req.user._id;
    if (userId) {
      if (req.user.role !== "admin") {
        throw new AppError(
          "Only administrators can create subscriptions for other users",
          403,
          "admin-required"
        );
      }
      targetUserId = userId;
    }

    const botPackage = await BotPackage.findById(botPackageId);
    if (!botPackage) {
      throw new AppError("Bot package not found", 404, "bot-package-not-found");
    }

    const packageDetails = await Package.findById(botPackage.packageId);
    if (!packageDetails) {
      throw new AppError("Package not found", 404, "package-not-found");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + packageDetails.duration);

    const subscription = await BotSubscription.create({
      userId: targetUserId,
      botId,
      botPackageId,
      lotSize,
      expiresAt,
      ...(status && ["active", "paused", "expired"].includes(status)
        ? { status }
        : {}), // persist provided status if valid
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
 * Get subscriptions with pagination and filters
 * @route GET /api/subscriptions?n=10&p=1&status=active&userId=xxx
 * @access Private (User sees own, Admin can view all or by userId)
 */
export async function getUserSubscriptions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let { n, p, status, userId } = req.query;

    // Parse pagination params
    let perPage = parseInt(n as string, 10);
    let page = parseInt(p as string, 10);
    perPage = isNaN(perPage) || perPage <= 0 ? 10 : perPage;
    page = isNaN(page) || page <= 0 ? 1 : page;

    // Determine user scope
    let query: any = {};
    if (userId) {
      if (req.user.role !== "admin") {
        throw new AppError(
          "Only administrators can view other users' subscriptions",
          403,
          "admin-required"
        );
      }
      query.userId = userId;
    } else if (req.user.role !== "admin") {
      return (query.userId = req.user._id);
    }

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Count total subscriptions
    const totalSubscriptions = await BotSubscription.countDocuments(query);
    const totalPages = Math.ceil(totalSubscriptions / perPage);

    // If page is out of range
    if (page > totalPages && totalPages !== 0) {
      return res.status(200).json({
        success: true,
        data: [],
        page,
        perPage,
        totalPages,
        totalSubscriptions,
      });
    }

    // Fetch subscriptions with population
    const subscriptions = await BotSubscription.find(query)
      .populate("userId", "fullName email")
      .populate("botId", "name description")
      .populate({
        path: "botPackageId",
        populate: {
          path: "packageId", // yahan se name & duration milega
          select: "name duration",
        },
        select: "price packageId", // botPackageId ke fields
      })
      .sort({ subscribedAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .select("-__v");

    // Transform response to consistent shape
    const transformed = subscriptions.map((sub) => {
      const obj: any = sub.toObject();
      return {
        id: obj._id,
        status: obj.status,
        lotSize: obj.lotSize,
        subscribedAt: obj.subscribedAt,
        expiresAt: obj.expiresAt,
        user: obj.userId
          ? {
              id: obj.userId._id,
              fullName: obj.userId.fullName,
              email: obj.userId.email,
            }
          : undefined,
        bot: obj.botId
          ? {
              id: obj.botId._id,
              name: obj.botId.name,
              description: obj.botId.description,
            }
          : undefined,
        package: obj.botPackageId
          ? {
              id: obj.botPackageId._id,
              name: obj.botPackageId.packageId?.name,
              duration: obj.botPackageId.packageId?.duration,
              price: obj.botPackageId.price,
            }
          : undefined,
      };
    });

    return res.status(200).json({
      success: true,
      data: transformed,
      page,
      perPage,
      totalPages,
      totalSubscriptions,
    });
  } catch (error) {
    next(error);
  }
}
