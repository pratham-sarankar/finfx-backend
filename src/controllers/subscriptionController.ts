import { AppError } from "../middleware/errorHandler";
import Bot from "../models/Bot";
import BotPackage from "../models/BotPackage";
import { Request, Response, NextFunction } from "express";
import BotSubscription from "../models/BotSubscription";

export async function createSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { botId, botPackageId, lotSize } = req.body;

    // Check if bot exists
    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Check if botPackage exists
    const existingBotPackage = await BotPackage.findById(botPackageId);

    if (!existingBotPackage) {
      throw new AppError("BotPackage not found ", 404, "bot-package-not-found");
    }

    // Check if user is already subscribed to this bot
    const existingSubscription = await BotSubscription.findOne({
      userId: req.user._id,
      botId: botId,
    });

    if (existingSubscription) {
      if (existingSubscription.status === "active") {
        throw new AppError(
          "You are already subscribed to this bot",
          409,
          "already-subscribed"
        );
      } else if (existingSubscription.status === "cancelled") {
        // Reactivate cancelled subscription
        const updatedSubscription = await BotSubscription.findByIdAndUpdate(
          existingSubscription._id,
          {
            status: "active",
            $unset: { cancelledAt: 1 },
          },
          { new: true }
        );

        const transformedSubscription: any = {
          ...updatedSubscription!.toObject(),
          id: updatedSubscription!._id,
        };
        delete transformedSubscription._id;
        delete transformedSubscription.__v;

        res.status(200).json({
          status: "success",
          message: "Subscription reactivated successfully",
          data: transformedSubscription,
        });
        return;
      }
    }

    // Create new subscription
    const subscription = await BotSubscription.create({
      userId: req.user._id,
      botId: botId,
      botPackageId: botPackageId,
      lotSize: lotSize,
    });

    // Transform response
    const transformedSubscription: any = {
      ...subscription.toObject(),
      id: subscription._id,
    };
    delete transformedSubscription._id;
    delete transformedSubscription.__v;

    res.status(201).json({
      status: "success",
      message: "Successfully subscribed to bot",
      data: transformedSubscription,
    });
  } catch (error) {
    next(error);
  }
}
