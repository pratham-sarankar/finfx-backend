import { Request, Response, NextFunction } from "express";
import BotSubscription from "../models/BotSubscription";
import BotPackage from "../models/BotPackage";
import Package from "../models/Package";
import { AppError } from "../middleware/errorHandler";

export async function createSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { botId, botPackageId, lotSize } = req.body;

    // If a active subscription exists with the given botId & botPackageId
    const botSubscriptionExists = await BotSubscription.findOne({
      userId: req.user._id,
      botId,
      botPackageId,
      status: "active",
    });
    if (botSubscriptionExists) {
      throw new AppError(
        "You are already subscribed to this bot.",
        409,
        "already-subscribed"
      );
    }

    // Fetch the bot package to get the package ID
    const botPackage = await BotPackage.findById(botPackageId);
    if (!botPackage) {
      throw new AppError(
        "Bot package not found",
        404,
        "bot-package-not-found"
      );
    }

    // Fetch the package to get the duration
    const packageDetails = await Package.findById(botPackage.packageId);
    if (!packageDetails) {
      throw new AppError(
        "Package not found",
        404,
        "package-not-found"
      );
    }

    // Calculate expiresAt date by adding duration days to current date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + packageDetails.duration);

    // Create new subscription
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

export async function getUserSubscriptions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { status } = req.query;

    // Build query
    const query: any = { userId: req.user._id };
    if (status) {
      query.status = status;
    }

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
