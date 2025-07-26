import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import BotSubscription from "../models/BotSubscription";
import Bot from "../models/Bot";
import BotPackage from "../models/BotPackage";

/**
 * @route POST /api/subscriptions
 * @desc Subscribe to a bot
 * @access Private
 */
export const createSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { botId, botPackageId, lotSize } = req.body;

    if (!botId) {
      throw new AppError("Bot ID is required", 400, "missing-bot-id");
    }
    if (!botPackageId) {
      throw new AppError("Bot Package ID is required", 400, "missing-bot-package-id");
    }
    if (!lotSize) {
      throw new AppError("Lot Size is required", 400, "missing-lot-size");
    }
    if (typeof lotSize !== "number" || lotSize < 0.1) {
      throw new AppError("Lot Size must be at least 0.1", 400, "invalid-lot-size");
    }

    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    const existingBotPackage = await BotPackage.findById(botPackageId);
    if (!existingBotPackage) {
      throw new AppError("BotPackage not found ", 404, "bot-package-not-found");
    }

    const existingSubscription = await BotSubscription.findOne({
      userId: req.user._id,
      botId: botId,
    });

    if (existingSubscription) {
      if (existingSubscription.status === "active") {
        throw new AppError("You are already subscribed to this bot", 409, "already-subscribed");
      } else if (existingSubscription.status === "cancelled") {
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

    const subscription = await BotSubscription.create({
      userId: req.user._id,
      botId: botId,
      botPackageId: botPackageId,
      lotSize: lotSize,
    });

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
};

/**
 * @route GET /api/subscriptions
 * @desc Get user's subscriptions
 * @access Private
 */
export const getSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const query: any = { userId: req.user._id };
    if (status && ["active", "cancelled"].includes(status as string)) {
      query.status = status;
    }

    const subscriptions = await BotSubscription.find(query)
      .populate("botId", "name description recommendedCapital performanceDuration script")
      .select("-__v")
      .sort({ subscribedAt: -1 });

    const transformedSubscriptions = subscriptions.map((subscription) => {
      const subscriptionObj = subscription.toObject();
      const transformedSubscription: any = {
        ...subscriptionObj,
        id: subscriptionObj._id,
        bot: (subscriptionObj.botId as any)?._id
          ? {
              id: (subscriptionObj.botId as any)._id,
              name: (subscriptionObj.botId as any).name,
              description: (subscriptionObj.botId as any).description,
              recommendedCapital: (subscriptionObj.botId as any).recommendedCapital,
              performanceDuration: (subscriptionObj.botId as any).performanceDuration,
              script: (subscriptionObj.botId as any).script,
            }
          : null,
      };
      delete transformedSubscription._id;
      delete transformedSubscription.botId;
      return transformedSubscription;
    });

    res.status(200).json({
      status: "success",
      data: transformedSubscriptions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/subscriptions/:id
 * @desc Get specific subscription
 * @access Private
 */
export const getSubscriptionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const subscription = await BotSubscription.findOne({
      _id: id,
      userId: req.user._id,
    })
      .populate("botId", "name description recommendedCapital performanceDuration script")
      .select("-__v");

    if (!subscription) {
      throw new AppError("Subscription not found", 404, "subscription-not-found");
    }

    const subscriptionObj = subscription.toObject();
    const transformedSubscription: any = {
      ...subscriptionObj,
      id: subscriptionObj._id,
      bot: (subscriptionObj.botId as any)?._id
        ? {
            id: (subscriptionObj.botId as any)._id,
            name: (subscriptionObj.botId as any).name,
            description: (subscriptionObj.botId as any).description,
            recommendedCapital: (subscriptionObj.botId as any).recommendedCapital,
            performanceDuration: (subscriptionObj.botId as any).performanceDuration,
            script: (subscriptionObj.botId as any).script,
          }
        : null,
    };
    delete transformedSubscription._id;
    delete transformedSubscription.botId;

    res.status(200).json({
      status: "success",
      data: transformedSubscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/subscriptions/:id/cancel
 * @desc Cancel a subscription
 * @access Private
 */
export const cancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const subscription = await BotSubscription.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!subscription) {
      throw new AppError("Subscription not found", 404, "subscription-not-found");
    }

    if (subscription.status === "cancelled") {
      throw new AppError("Subscription is already cancelled", 400, "already-cancelled");
    }

    const updatedSubscription = await BotSubscription.findByIdAndUpdate(
      id,
      {
        status: "cancelled",
        cancelledAt: new Date(),
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
      message: "Subscription cancelled successfully",
      data: transformedSubscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/subscriptions/check/:botId
 * @desc Check if user is subscribed to a specific bot
 * @access Private
 */
export const checkSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { botId } = req.params;

    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    const subscription = await BotSubscription.findOne({
      userId: req.user._id,
      botId: botId,
    });

    const isSubscribed = Boolean(subscription && subscription.status === "active");

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
};

/**
 * @route DELETE /api/subscriptions/:id
 * @desc Delete a subscription (permanent removal)
 * @access Private
 */
export const deleteSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const subscription = await BotSubscription.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!subscription) {
      throw new AppError("Subscription not found", 404, "subscription-not-found");
    }

    res.status(200).json({
      status: "success",
      message: "Subscription deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
