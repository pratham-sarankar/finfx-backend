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
import mongoose from "mongoose";

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

export async function getUserSubscriptions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let { n, p, status, userId, q } = req.query;

    let perPage = parseInt(n as string, 10);
    let page = parseInt(p as string, 10);
    perPage = isNaN(perPage) || perPage <= 0 ? 10 : perPage;
    page = isNaN(page) || page <= 0 ? 1 : page;

    // Base match query
    let match: any = {};
    if (userId) {
      if (req.user.role !== "admin") {
        return next(new AppError("Only administrators can view other users' subscriptions", 403, "admin-required"));
      }
      match.userId = new mongoose.Types.ObjectId(userId as string);
    } else if (req.user.role !== "admin") {
      match.userId = new mongoose.Types.ObjectId(req.user._id);
    }
    if (status) {
      match.status = status;
    }

    // Build search filter
    let searchFilter: any = {};
    if (q && typeof q === "string" && q.trim().length > 0) {
      const regex = new RegExp(q.trim(), "i");
      searchFilter = {
        $or: [
          { "user.fullName": regex },
          { "user.email": regex },
          { "bot.name": regex },
          { "bot.description": regex },
          { "package.packageId.name": regex },
        ],
      };
    }

    // Aggregation pipeline
    const pipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "bots",
          localField: "botId",
          foreignField: "_id",
          as: "bot",
        },
      },
      { $unwind: { path: "$bot", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "botpackages",
          localField: "botPackageId",
          foreignField: "_id",
          as: "package",
        },
      },
      { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "packages",
          localField: "package.packageId",
          foreignField: "_id",
          as: "package.packageId",
        },
      },
      { $unwind: { path: "$package.packageId", preserveNullAndEmptyArrays: true } },
      { $match: searchFilter },
      {
        $project: {
          id: "$_id",
          status: 1,
          lotSize: 1,
          subscribedAt: 1,
          expiresAt: 1,
          user: { id: "$user._id", fullName: "$user.fullName", email: "$user.email" },
          bot: { id: "$bot._id", name: "$bot.name", description: "$bot.description" },
          package: {
            id: "$package._id",
            name: "$package.packageId.name",
            duration: "$package.packageId.duration",
            price: "$package.price",
          },
        },
      },
    ];

    // Count
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await BotSubscription.aggregate(countPipeline);
    const totalSubscriptions = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalSubscriptions / perPage);

    // Paginate
    pipeline.push({ $sort: { subscribedAt: -1 } });
    pipeline.push({ $skip: (page - 1) * perPage });
    pipeline.push({ $limit: perPage });

    const subscriptions = await BotSubscription.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      data: subscriptions,
      page,
      perPage,
      totalPages,
      totalSubscriptions,
    });
  } catch (error) {
    return next(error);
  }
}
