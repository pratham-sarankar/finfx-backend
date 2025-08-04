import { Request, Response, NextFunction } from "express";
import BotSubscription from "../models/BotSubscription";
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

    // Create new subscription
    const subscription = await BotSubscription.create({
      userId: req.user._id,
      botId,
      botPackageId,
      lotSize,
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
