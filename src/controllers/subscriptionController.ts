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

    const existingSubscription = await BotSubscription.findOne({
      userId: req.user._id,
      botId,
      status: { $in: ["active", "paused"] }, 
    });

    if (existingSubscription) {
      throw new AppError(
        "You already have an active or paused subscription for this bot.",
        409,
        "already-subscribed"
      );
    }

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
